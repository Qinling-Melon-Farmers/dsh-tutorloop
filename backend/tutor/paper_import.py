"""Conservative page-level PDF inventory. No answer keys or cards are inferred."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import io
from pathlib import Path
import re
import unicodedata

from . import storage as db
from .ingestion import MAX_UPLOAD_BYTES, MAX_PDF_PAGES, MAX_TEXT_CHARS, split_chunks

MANIFEST_KEY = 'paper_manifest_v1'
MAX_SCAN_FILES = 300


def _clean(text):
    # Export watermarks identify the exporting user, not an evidentiary source.
    return '\n'.join(line for line in text.splitlines()
                     if not re.search(r'本试卷由粉笔用户.*生成', line))


def _metadata(filename, first_page):
    evidence = unicodedata.normalize('NFKC', filename + '\n' + first_page)
    if '模考' in evidence:
        paper_type = 'mock_exam'
    elif '回忆版' in evidence:
        paper_type = 'recalled_exam'
    elif '真题' in filename or re.search(r'\d{4}年.*(?:公考|公务员|国考)', filename):
        paper_type = 'exam_unverified'
    else:
        paper_type = 'unknown'
    year = re.search(r'(?<!\d)(20\d{2})年', evidence)
    return {'paper_type': paper_type,
            'subject': '申论' if '申论' in evidence else ('行测' if '行测' in evidence else None),
            'exam_year': int(year.group(1)) if year else None,
            'exam_level': '副省级' if '副省级' in evidence.replace('\n', '') else None,
            'publisher': '粉笔导出' if '粉笔' in evidence else '未核验',
            'verification_status': 'unverified', 'is_official_exam': False if paper_type == 'mock_exam' else None,
            'metadata_basis': '文件名与首页文字；非官方认证'}


def inspect_pdf(path: str | Path) -> dict:
    """Read one bounded PDF, retaining every page and explicit extraction warnings."""
    from pypdf import PdfReader
    path = Path(path).resolve()
    if path.suffix.lower() != '.pdf' or not path.is_file():
        raise ValueError('请选择已有PDF文件')
    with path.open('rb') as stream:
        raw = stream.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError('文件超过20 MB限制，请拆分')
    digest = hashlib.sha256(raw).hexdigest()
    reader = PdfReader(io.BytesIO(raw))
    if reader.is_encrypted:
        raise ValueError('PDF已加密，请提供可直接阅读的文件')
    if len(reader.pages) > MAX_PDF_PAGES:
        raise ValueError('PDF超过500页限制，请拆分')
    pages, total = [], 0
    warnings = ['页级提取不是题目拆分；未生成答案或评分标准。', '图片、图形与表格布局未还原，请保留原PDF核对。']
    answer_sheet_started = False
    for number, page in enumerate(reader.pages, 1):
        original = page.extract_text() or ''
        total += len(original)
        if total > MAX_TEXT_CHARS:
            raise ValueError('提取文本超过200万字符，请拆分')
        text = _clean(original)
        normalized = unicodedata.normalize('NFKC', text)
        try:
            image_count = len(page.images)
        except Exception:
            image_count = None
        heading = re.search(r'(?m)^\s*(?:【|\[)?(?:参考答案|答案解析|试题解析|题目解析|解析汇总)(?:】|\])?', normalized)
        sheet_heading = re.search(r'(?m)^\s*答题(?:纸|卡)\s*$', normalized)
        if sheet_heading:
            answer_sheet_started = True
        elif heading or len(text) > 300:
            answer_sheet_started = False
        role = ('institution_explanation' if heading else
                'answer_sheet' if sheet_heading or answer_sheet_started else
                'question_material_unverified')
        if role != 'institution_explanation' and re.search(r'(?:解析|答案)', path.stem):
            role = 'institution_explanation_unverified'
        # Numbers are candidates only: PDF extraction order and chart values can
        # make them misleading. They are never used to split or count questions.
        candidates = sorted({int(n) for n in re.findall(r'(?<![\d.])(\d{1,3})[.．](?!\d)', normalized) if 1 <= int(n) <= 200})
        pages.append({'page': number, 'text': text, 'char_count': len(text),
                      'image_count': image_count, 'content_role': role,
                      'question_number_candidates': candidates,
                      'extraction_method': 'pdf_text', 'needs_visual_review': True,
                      'text_status': 'no_text_or_scan' if not text.strip() else ('low_text' if len(text.strip()) < 150 else 'extracted'),
                      'normalization_changed': text != normalized,
                      'answer_heading_detected': bool(heading)})
    if not any(page['text'].strip() for page in pages):
        warnings.append('没有可提取正文，可能是扫描件；需要OCR，未臆造文本。')
    if any(page['normalization_changed'] for page in pages):
        warnings.append('存在兼容字形；保存原文，另提供NFKC检索投影，不能据投影宣称逐字原文匹配。')
    first = pages[0]['text'] if pages else ''
    return {'document_id': 'pdf:' + digest, 'sha256': digest, 'filename': path.name,
            'path': str(path), 'size_bytes': len(raw), 'page_count': len(pages),
            **_metadata(path.name, first), 'pages': pages, 'warnings': warnings,
            'answer_status': 'heading_detected_unverified' if any(p['answer_heading_detected'] for p in pages) else 'not_detected_in_text',
            'inspected_at': datetime.now(timezone.utc).isoformat()}


def _entry(document):
    return {**{k: v for k, v in document.items() if k != 'pages'},
            'pages': [{k: v for k, v in page.items() if k != 'text'} for page in document['pages']]}


def _files(folder):
    folder = Path(folder).resolve()
    if not folder.is_dir():
        raise ValueError('请选择已有试卷文件夹')
    files = []
    for path in folder.rglob('*'):
        if path.suffix.lower() != '.pdf' or not path.is_file():
            continue
        if not path.resolve().is_relative_to(folder):
            continue  # Do not follow a linked PDF outside the selected folder.
        files.append(path)
        if len(files) > MAX_SCAN_FILES:
            raise ValueError('文件夹超过300份PDF，请分批选择子文件夹')
    return sorted(files, key=lambda p: str(p).lower())


def scan_folder(folder: str | Path) -> dict:
    """Read-only inventory; duplicate bytes are listed once even under new names."""
    documents, duplicates, errors, seen = [], [], [], {}
    for path in _files(folder):
        try:
            document = inspect_pdf(path)
            if document['sha256'] in seen:
                duplicates.append({'path': str(path), 'duplicate_of': seen[document['sha256']], 'sha256': document['sha256']})
                continue
            seen[document['sha256']] = str(path)
            documents.append(_entry(document))
        except Exception as exc:
            errors.append({'path': str(path), 'error': f'{type(exc).__name__}: {exc}'})
    return {'schema_version': 1, 'documents': documents, 'duplicates': duplicates, 'errors': errors}


def import_folder(folder: str | Path) -> dict:
    """Import page chunks into the existing local DB, deduplicated by file SHA256.

    A JSON-serializable manifest lives under MANIFEST_KEY in settings. Originals
    are never moved/rewritten; chunks retain page provenance, not answer cards.
    """
    return _import_files(_files(folder))


def import_file(path: str | Path) -> dict:
    """Import only this PDF, never its siblings. Caller enforces workspace scope."""
    return _import_files([Path(path)])


def _import_files(paths):
    manifest = db.get_value(MANIFEST_KEY, {'schema_version': 1, 'documents': {}})
    added, imported, skipped, errors = 0, [], [], []
    for path in paths:
        try:
            document = inspect_pdf(path)
            digest = document['sha256']
            if digest in manifest['documents']:
                skipped.append({'path': str(path), 'sha256': digest, 'reason': 'same_file_sha256'})
                continue
            chunks = []
            for page in document['pages']:
                if page['content_role'] == 'answer_sheet':
                    continue
                rows = split_chunks(page['text'], document['filename'], f"PDF第{page['page']}页", kind='paper_pdf')
                for index, chunk in enumerate(rows):
                    chunk['id'] = 'PDF' + hashlib.sha256(f"{digest}:{page['page']}:{index}".encode()).hexdigest()[:24]
                    chunk.update(document_id=document['document_id'], file_sha256=digest,
                                 pdf_page=page['page'], original_filename=document['filename'],
                                 content_role=page['content_role'], paper_type=document['paper_type'],
                                 subject=document['subject'], exam_year=document['exam_year'],
                                 exam_level=document['exam_level'], extraction_method='pdf_text',
                                 publisher=document['publisher'], is_official_exam=document['is_official_exam'],
                                 verification_status='unverified', answer_status=document['answer_status'],
                                 needs_visual_review=True, image_count=page['image_count'], original_path=document['path'],
                                 search_text=unicodedata.normalize('NFKC', chunk['text']))
                chunks.extend(rows)
            count = db.add_chunks(chunks)
            entry = _entry(document)
            entry.update(chunk_count=len(chunks), imported_at=datetime.now(timezone.utc).isoformat())
            manifest['documents'][digest] = entry
            # Chunk IDs are deterministic, so interrupted imports are retry-safe.
            db.set_value(MANIFEST_KEY, manifest)
            imported.append(entry)
            added += count
        except Exception as exc:
            errors.append({'path': str(path), 'error': f'{type(exc).__name__}: {exc}'})
    return {'added_chunks': added, 'imported': imported, 'skipped': skipped, 'errors': errors,
            'manifest': manifest}
