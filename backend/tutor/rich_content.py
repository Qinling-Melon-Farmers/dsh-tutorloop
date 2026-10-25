"""Untrusted exam HTML -> explicit text/image data, never executable HTML."""
import html
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit

IMAGE_HOSTS = frozenset({'fb.fbstatic.cn', 'fb.fenbike.cn'})
UNSUPPORTED_ALT = '图像来源不受支持，请核对原件'


def safe_image_url(value):
    if not isinstance(value, str) or len(value) > 4096 or any(ord(c) < 32 for c in value):
        return None
    try:
        value = html.unescape(value.strip())
        if any(ord(c) < 32 for c in value):
            return None
        # Fenbi exports mostly use protocol-relative CDN URLs. Resolve only
        # those to HTTPS, then apply the same exact-host validation.
        if value.startswith('//'):
            value = 'https:' + value
        parsed = urlsplit(value)
        if (parsed.scheme != 'https' or parsed.hostname not in IMAGE_HOSTS
                or parsed.username or parsed.password or parsed.port not in (None, 443)
                or '\\' in value or '%' in (parsed.hostname or '')):
            return None
        if not parsed.path or parsed.path.lower().endswith(('.svg', '.html', '.htm', '.js')):
            return None
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ''))
    except (TypeError, ValueError):
        return None


def sanitize_blocks(blocks):
    result = []
    if not isinstance(blocks, list):
        return result
    for block in blocks[:2000]:
        if not isinstance(block, dict):
            continue
        if block.get('type') == 'text':
            text = block.get('text')
            if isinstance(text, str) and text:
                result.append({'type': 'text', 'text': text})
        elif block.get('type') == 'image':
            url = safe_image_url(block.get('url')) if block.get('supported') is not False else None
            result.append({'type': 'image', 'url': url or '',
                           'alt': str(block.get('alt') or ('题目图像' if url else UNSUPPORTED_ALT))[:500],
                           'supported': bool(url)})
    if len(blocks) > 2000:
        result.append({'type': 'image', 'url': '', 'alt': '内容块超过支持上限，请核对原件', 'supported': False})
    return result


def analyze_blocks(blocks):
    clean = sanitize_blocks(blocks)
    images = [b for b in clean if b['type'] == 'image']
    return {'blocks': clean, 'visual_required': bool(images),
            'visual_supported': all(b['supported'] for b in images)}


class _Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self.buffer = []
        self.hidden = 0

    def flush(self):
        text = ''.join(self.buffer)
        if text.strip():
            self.blocks.append({'type': 'text', 'text': text.strip()})
        self.buffer = []

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'noscript', 'template'}:
            self.hidden += 1
        if self.hidden:
            return
        if tag == 'img':
            self.flush()
            data = dict(attrs)
            self.blocks.append({'type': 'image', 'url': data.get('src', ''),
                                'alt': data.get('alt') or '题目图像'})
        elif tag in {'svg', 'canvas', 'iframe', 'object', 'video'}:
            self.flush()
            self.blocks.append({'type': 'image', 'url': '', 'supported': False,
                                'alt': '题目含不支持的可视内容，请核对原件'})
        elif tag in {'p', 'div', 'li', 'br', 'tr'}:
            self.buffer.append('\n')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in {'img', 'br'}:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'noscript', 'template'}:
            self.hidden = max(0, self.hidden - 1)
        elif not self.hidden and tag in {'p', 'div', 'li', 'tr'}:
            self.buffer.append('\n')

    def handle_data(self, data):
        if not self.hidden:
            self.buffer.append(data)


def html_to_blocks(value):
    parser = _Parser()
    parser.feed(str(value or ''))
    parser.close()
    parser.flush()
    return sanitize_blocks(parser.blocks)


def blocks_text(blocks):
    return '\n'.join(block['text'] for block in sanitize_blocks(blocks) if block['type'] == 'text').strip()
