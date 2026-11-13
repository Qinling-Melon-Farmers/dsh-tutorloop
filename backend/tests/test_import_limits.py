"""Real-size import boundaries using synthetic files and an isolated database."""
import io
import os
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from docx import Document
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from tutor import materials, paper_import, storage as db
from tutor.ingestion import parse_upload

MIB = 1024 * 1024


def write_pdf(path, size):
    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'),
                             NameObject('/Subtype'): NameObject('/Type1'),
                             NameObject('/BaseFont'): NameObject('/Helvetica')})
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): writer._add_object(font)})})
    stream = DecodedStreamObject()
    stream.set_data(b'BT /F1 12 Tf 40 700 Td (A synthetic passage with enough text for a source chunk.) Tj ET')
    page[NameObject('/Contents')] = writer._add_object(stream)
    output = io.BytesIO()
    writer.write(output)
    raw = output.getvalue()
    start = raw.rfind(b'startxref\n')
    offset = int(raw[start + len(b'startxref\n'):].splitlines()[0])
    tail = raw[offset:]
    old = b'startxref\n' + str(offset).encode()
    # Insert legal comment padding before xref and adjust its recorded offset.
    padding = size - len(raw)
    while True:
        new = b'startxref\n' + str(offset + padding).encode()
        adjusted = size - len(raw) - (len(new) - len(old))
        if adjusted == padding:
            break
        padding = adjusted
    with path.open('wb') as output:
        output.write(raw[:offset])
        block = b'%' + b'x' * (1024 * 1024 - 2) + b'\n'
        while padding >= len(block):
            output.write(block)
            padding -= len(block)
        if padding:
            assert padding >= 2
            output.write(b'%' + b'x' * (padding - 2) + b'\n')
        output.write(tail.replace(old, new))
    assert path.stat().st_size == size


class ImportLimitTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        db_patch = patch.object(db, 'DB_PATH', self.root / 'isolated.sqlite3')
        db_patch.start()
        self.addCleanup(db_patch.stop)
        env_patch = patch.dict(os.environ, {'TUTOR_WORKSPACE_PATH': str(self.root)})
        env_patch.start()
        self.addCleanup(env_patch.stop)

    def test_real_pdf_over_20_mib_imports_through_file_and_folder(self):
        folder = self.root / 'batch'
        folder.mkdir()
        path = folder / 'lesson.pdf'
        write_pdf(path, 21 * MIB + 1)
        self.assertTrue(parse_upload(path.name, path.read_bytes()))
        self.assertEqual(paper_import.inspect_pdf(path)['page_count'], 1)
        result = materials.import_file(str(path))
        self.assertEqual(result['errors'], [])
        self.assertGreater(result['added_chunks'], 0)
        self.assertEqual(db.get_chunks()[0]['pdf_page'], 1)
        again = materials.import_folder(str(folder))
        self.assertEqual(again['errors'], [])
        self.assertEqual(len(again['skipped']), 1)
        with patch.object(db, 'DB_PATH', self.root / 'folder-isolated.sqlite3'):
            fresh = materials.import_folder(str(folder))
            self.assertEqual(fresh['errors'], [])
            self.assertGreater(fresh['added_chunks'], 0)
            self.assertEqual(db.get_chunks()[0]['pdf_page'], 1)

    def test_pdf_exact_100_mib_and_one_byte_over(self):
        path = self.root / 'boundary.pdf'
        write_pdf(path, 100 * MIB)
        self.assertTrue(parse_upload(path.name, path.read_bytes()))
        self.assertEqual(paper_import.inspect_pdf(path)['size_bytes'], 100 * MIB)
        result = materials.import_file(str(path))
        self.assertEqual(result['errors'], [])
        self.assertGreater(result['added_chunks'], 0)
        before_chunks = db.get_chunks()
        before_manifest = db.get_value(paper_import.MANIFEST_KEY)
        with path.open('ab') as output:
            output.write(b' ')
        with self.assertRaisesRegex(ValueError, '100 MiB'):
            parse_upload(path.name, path.read_bytes())
        with self.assertRaisesRegex(ValueError, '100 MiB'):
            paper_import.inspect_pdf(path)
        self.assertIn('100 MiB', materials.import_file(str(path))['errors'][0]['error'])
        self.assertIn('100 MiB', materials.import_folder(str(self.root))['errors'][0]['error'])
        self.assertEqual(db.get_chunks(), before_chunks)
        self.assertEqual(db.get_value(paper_import.MANIFEST_KEY), before_manifest)

    def test_non_pdf_over_limit_and_broken_files_do_not_pollute_db(self):
        oversized = self.root / 'large.docx'
        with oversized.open('wb') as output:
            output.truncate(100 * MIB + 1)
        broken_docx = self.root / 'broken.docx'
        broken_docx.write_bytes(b'not a zip')
        broken_pdf = self.root / 'broken.pdf'
        broken_pdf.write_bytes(b'%PDF-broken')
        for path in (oversized, broken_docx):
            with self.assertRaises(Exception):
                materials.import_file(str(path))
        self.assertTrue(materials.import_file(str(broken_pdf))['errors'])
        result = materials.import_folder(str(self.root))
        self.assertEqual(len(result['errors']), 3)
        self.assertEqual(db.count_chunks(), 0)
        self.assertIsNone(db.get_value('material_manifest_v1'))
        self.assertIsNone(db.get_value(paper_import.MANIFEST_KEY))

    def test_docx_large_uncompressed_and_zip_bomb_budget(self):
        document = Document()
        document.add_paragraph('A synthetic document with enough text to produce a useful chunk.')
        raw = io.BytesIO()
        document.save(raw)
        with zipfile.ZipFile(raw, 'a', compression=zipfile.ZIP_STORED) as archive:
            archive.writestr('padding.bin', b'x' * (81 * MIB))
        self.assertTrue(parse_upload('large.docx', raw.getvalue()))
        bomb = io.BytesIO()
        with zipfile.ZipFile(bomb, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            with archive.open('bomb.bin', 'w') as entry:
                for _ in range(201):
                    entry.write(b'0' * MIB)
        with self.assertRaisesRegex(ValueError, '200 MiB'):
            parse_upload('bomb.docx', bomb.getvalue())


if __name__ == '__main__':
    unittest.main()
