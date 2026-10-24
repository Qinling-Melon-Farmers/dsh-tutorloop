import tempfile
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from tutor import storage as db
from tutor.paper_import import inspect_pdf, scan_folder, import_folder, MANIFEST_KEY


def reader(texts):
    return SimpleNamespace(is_encrypted=False, pages=[SimpleNamespace(extract_text=lambda t=text: t, images=[]) for text in texts])


class PaperImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.pdf = self.root / '2026年行测副省级网友回忆版.pdf'
        self.pdf.write_bytes(b'%PDF-test-one')
        db_patch = patch.object(db, 'DB_PATH', self.root / 'test.sqlite3')
        db_patch.start()
        self.addCleanup(db_patch.stop)

    def test_inventory_retains_pages_and_unknown_authority(self):
        fake = reader(['2026年行测（副省级网友回忆版）\n· 本试卷由粉笔用户private-user生成',
                       '先阅读题干。81.\nA.A B.B C.C D.D\n图形选项需要原页核对。' * 5])
        with patch('pypdf.PdfReader', return_value=fake):
            document = inspect_pdf(self.pdf)
        self.assertEqual(document['paper_type'], 'recalled_exam')
        self.assertEqual(document['page_count'], 2)
        self.assertIsNone(document['is_official_exam'])
        self.assertEqual(document['answer_status'], 'not_detected_in_text')
        self.assertNotIn('private-user', document['pages'][0]['text'])
        self.assertIn(81, document['pages'][1]['question_number_candidates'])
        self.assertTrue(document['pages'][1]['needs_visual_review'])
        self.assertNotIn('questions', document)

    def test_hash_dedup_folder_and_repeated_db_import(self):
        duplicate = self.root / 'renamed.pdf'
        duplicate.write_bytes(self.pdf.read_bytes())
        with patch('pypdf.PdfReader', return_value=reader(['试卷材料原文：' + '阅读材料和识别依据。' * 30])):
            inventory = scan_folder(self.root)
            self.assertEqual(len(inventory['documents']), 1)
            self.assertEqual(len(inventory['duplicates']), 1)
            self.assertEqual(db.count_chunks(), 0)
            first = import_folder(self.root)
            second = import_folder(self.root)
        self.assertGreater(first['added_chunks'], 0)
        self.assertEqual(second['added_chunks'], 0)
        self.assertEqual(len(second['skipped']), 2)
        self.assertEqual(len(db.get_value(MANIFEST_KEY)['documents']), 1)
        source = db.get_chunks()[0]
        for field in ('file_sha256', 'pdf_page', 'content_role', 'search_text', 'original_path'):
            self.assertIn(field, source)
        self.assertEqual(source['verification_status'], 'unverified')

    def test_answer_and_sheet_roles_never_create_answers(self):
        self.pdf.rename(self.root / '粉笔模考试卷.pdf')
        path = self.root / '粉笔模考试卷.pdf'
        texts = ['粉笔模考行测\n注意：请填涂答题卡。', '参考答案\n1.A 2.B\n机构解析内容。', '答题纸\n60字\n120字', '第⼀⼤题\n180字']
        with patch('pypdf.PdfReader', return_value=reader(texts)):
            document = inspect_pdf(path)
            imported = import_folder(self.root)
        self.assertEqual(document['paper_type'], 'mock_exam')
        self.assertEqual(document['pages'][0]['content_role'], 'question_material_unverified')
        self.assertEqual(document['pages'][1]['content_role'], 'institution_explanation')
        self.assertEqual(document['pages'][2]['content_role'], 'answer_sheet')
        self.assertEqual(document['pages'][3]['content_role'], 'answer_sheet')
        self.assertEqual(document['answer_status'], 'heading_detected_unverified')
        self.assertTrue(all(c['pdf_page'] not in (3, 4) for c in db.get_chunks()))
        self.assertEqual(db.get_attempts(), [])

    def test_scan_reports_broken_file_without_stopping_batch(self):
        (self.root / 'broken.pdf').write_bytes(b'bad')
        def parse(stream):
            if stream.getvalue() == b'bad':
                raise ValueError('损坏')
            return reader(['材料原文。' * 20])
        with patch('pypdf.PdfReader', side_effect=parse):
            report = scan_folder(self.root)
        self.assertEqual(len(report['documents']), 1)
        self.assertEqual(len(report['errors']), 1)

    def test_scan_without_text_warns(self):
        with patch('pypdf.PdfReader', return_value=reader(['', ''])):
            document = inspect_pdf(self.pdf)
        self.assertTrue(any('OCR' in warning for warning in document['warnings']))
        self.assertTrue(all(p['text_status'] == 'no_text_or_scan' for p in document['pages']))


if __name__ == '__main__':
    unittest.main()
