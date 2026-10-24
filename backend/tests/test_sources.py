import socket
import sys
import types
import unittest
from unittest.mock import patch, MagicMock

from tutor.ingestion import parse_upload, extract_html, MAX_UPLOAD_BYTES
from tutor.retrieval import _public_target, _read_url, fetch_url, search_web, MAX_WEB_BYTES


PUBLIC = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('8.8.8.8', 443))]
PRIVATE = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 443))]


class TestSources(unittest.TestCase):
    def test_html_local_ignores_scripts_and_keeps_text(self):
        text = '需要学习的正文与事实依据。' * 15
        rows = parse_upload('source.html', f'<title>标题</title><script>秘密脚本</script><article>{text}</article>'.encode())
        self.assertEqual(rows[0]['title'], 'source.html')
        self.assertIn('事实依据', rows[0]['text'])
        self.assertNotIn('秘密脚本', rows[0]['text'])

    def test_file_size_limit(self):
        with self.assertRaisesRegex(ValueError, '20 MB'):
            parse_upload('large.txt', b'a' * (MAX_UPLOAD_BYTES + 1))

    def test_empty_scanned_pdf_reports_ocr(self):
        reader = MagicMock()
        reader.pages = [MagicMock()]
        reader.pages[0].extract_text.return_value = ''
        module = types.SimpleNamespace(PdfReader=lambda _: reader)
        with patch.dict(sys.modules, {'pypdf': module}):
            with self.assertRaisesRegex(ValueError, 'OCR'):
                parse_upload('scan.pdf', b'pretend-pdf')

    def test_unsafe_schemes_rejected_before_dns(self):
        with patch('tutor.retrieval.socket.getaddrinfo') as dns:
            for url in ('file:///etc/passwd', 'ftp://example.com/a', 'https://user:pass@example.com'):
                with self.assertRaises(ValueError):
                    _public_target(url)
            dns.assert_not_called()

    def test_private_dns_and_mixed_dns_rejected(self):
        for addresses in (PRIVATE, PUBLIC + PRIVATE):
            with patch('tutor.retrieval.socket.getaddrinfo', return_value=addresses):
                with self.assertRaisesRegex(ValueError, '公网'):
                    _public_target('https://example.com')

    def test_multicast_and_ipv6_loopback_rejected(self):
        for ip in ('224.0.0.1', '::1', '::ffff:127.0.0.1', '169.254.169.254'):
            addresses = [(socket.AF_INET6 if ':' in ip else socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, 443))]
            with patch('tutor.retrieval.socket.getaddrinfo', return_value=addresses):
                with self.assertRaises(ValueError):
                    _public_target('https://example.com')

    def test_connection_uses_checked_ip_without_dns_repeat(self):
        from tutor.retrieval import _PinnedHTTP
        sock = MagicMock()
        with patch('tutor.retrieval.socket.socket', return_value=sock), patch('tutor.retrieval.socket.getaddrinfo') as dns:
            con = _PinnedHTTP('example.com', 443, PUBLIC[0], 12)
            con.connect()
            sock.connect.assert_called_once_with(('8.8.8.8', 443))
            dns.assert_not_called()
            con.close()

    def test_private_redirect_never_connects(self):
        connection = MagicMock()
        response = connection.getresponse.return_value
        response.status = 302
        response.getheader.return_value = 'http://127.0.0.1/private'
        with patch('tutor.retrieval.socket.getaddrinfo', side_effect=[PUBLIC, PRIVATE]), patch('tutor.retrieval._PinnedHTTPS', return_value=connection) as constructor:
            with self.assertRaisesRegex(ValueError, '公网'):
                _read_url('https://example.com')
            self.assertEqual(constructor.call_count, 1)
            connection.close.assert_called()

    def test_declared_large_response_rejected(self):
        connection = MagicMock()
        response = connection.getresponse.return_value
        response.status = 200
        response.getheader.side_effect = lambda key, default=None: {'Content-Type': 'text/html', 'Content-Length': str(MAX_WEB_BYTES + 1)}.get(key, default)
        with patch('tutor.retrieval.socket.getaddrinfo', return_value=PUBLIC), patch('tutor.retrieval._PinnedHTTPS', return_value=connection):
            with self.assertRaisesRegex(ValueError, '3 MB'):
                _read_url('https://example.com')
            response.read1.assert_not_called()

    def test_fulltext_metadata_preserves_long_document(self):
        body = ('可引用的原始材料与事实依据。' * 1000).encode()
        with patch('tutor.retrieval._read_url', return_value=(body, 'text/html; charset=utf-8', 'https://example.com/article', '')):
            rows, statuses = fetch_url('https://example.com/article')
        self.assertGreater(sum(len(row['text']) for row in rows), 10000)
        self.assertTrue(all(row['kind'] == 'web_fulltext' and row['fetched_at'] and row['authority'] == '未核验' for row in rows))
        self.assertTrue(statuses)

    def test_search_failure_returns_no_fabrication(self):
        client = MagicMock()
        client.text.side_effect = RuntimeError('provider down')
        with patch.dict(sys.modules, {'ddgs': types.SimpleNamespace(DDGS=lambda **_: client)}):
            rows, statuses = search_web('国考')
        self.assertEqual(rows, [])
        self.assertIn('未生成替代', statuses[0])

    def test_snippet_marked_and_official_domains_prioritized(self):
        client = MagicMock()
        client.text.return_value = [
            {'href': 'https://training.example/questions', 'title': '机构题', 'body': '题目搜索摘要。' * 20},
            {'href': 'https://www.gov.cn/article', 'title': '发布', 'body': '政策搜索摘要。' * 20}]
        with patch.dict(sys.modules, {'ddgs': types.SimpleNamespace(DDGS=lambda **_: client)}), patch('tutor.retrieval.fetch_url', return_value=([], ['正文未取得'])), patch('tutor.retrieval._public_target', return_value=(None, '', PUBLIC)):
            rows, statuses = search_web('政策', limit=2)
        self.assertEqual(rows[0]['title'], '发布')
        self.assertTrue(all(row['kind'] == 'web_snippet_only' and row['authority'] == '未核验' for row in rows))
        self.assertTrue(any('不能作为' in note for note in statuses))

    def test_fake_ip_dns_keeps_provider_snippet_without_connecting(self):
        client = MagicMock()
        client.text.return_value = [{'href': 'https://www.stats.gov.cn/article', 'title': '同比与环比', 'body': '同比与环比的区别摘要。' * 20}]
        fake = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('198.18.0.111', 443))]
        with patch.dict(sys.modules, {'ddgs': types.SimpleNamespace(DDGS=lambda **_: client)}), patch('tutor.retrieval.socket.getaddrinfo', return_value=fake), patch('tutor.retrieval._PinnedHTTPS') as connection:
            rows, statuses = search_web('同比环比', limit=1)
        connection.assert_not_called()
        self.assertTrue(rows)
        self.assertTrue(all(row['kind'] == 'web_snippet_only' for row in rows))
        self.assertTrue(any('搜索摘要' in note for note in statuses))

    def test_private_literal_snippet_is_rejected(self):
        client = MagicMock()
        client.text.return_value = [{'href': 'http://127.0.0.1/x', 'title': '本地', 'body': '不可信摘要。' * 20}]
        with patch.dict(sys.modules, {'ddgs': types.SimpleNamespace(DDGS=lambda **_: client)}):
            rows, _ = search_web('test', limit=1)
        self.assertEqual(rows, [])


if __name__ == '__main__':
    unittest.main()
