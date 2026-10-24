"""Workspace-bound imports and explicit snippet/full-text provenance."""
from datetime import datetime, timezone
import hashlib
import os
from pathlib import Path
import unicodedata

from . import storage as db
from .ingestion import parse_upload, MAX_UPLOAD_BYTES
from . import paper_import, retrieval


def workspace_path(path, *, directory=False):
    if not isinstance(path, str) or not path.strip() or '\x00' in path:
        raise ValueError('请提供明确的工作区内资料路径。')
    configured = os.environ.get('TUTOR_WORKSPACE_PATH', '').strip()
    if not configured:
        raise ValueError('未配置TUTOR_WORKSPACE_PATH，不能读取本机资料。')
    configured_root = Path(os.path.abspath(Path(configured).expanduser()))
    root = configured_root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError('工作区路径不是文件夹。')
    candidate = Path(path).expanduser()
    if not candidate.is_absolute():
        candidate = root / candidate
    # Reject lexical escapes (including another Windows drive/UNC share) before
    # resolving a potentially remote or inaccessible out-of-workspace path.
    lexical = Path(os.path.abspath(candidate))
    # Windows may supply the configured workspace through its 8.3 spelling.
    # Accept that spelling and its resolved form, then enforce the real target.
    if not (lexical.is_relative_to(root) or lexical.is_relative_to(configured_root)):
        raise ValueError('资料路径必须位于当前工作区内。')
    resolved = lexical.resolve(strict=True)
    if not resolved.is_relative_to(root):
        raise ValueError('资料链接不能指向工作区外。')
    if directory and not resolved.is_dir():
        raise ValueError('请选择资料文件夹。')
    if not directory and not resolved.is_file():
        raise ValueError('请选择资料文件。')
    return resolved


def source_summary(chunk):
    keys = ('id', 'title', 'locator', 'url', 'kind', 'fetched_at', 'publication_date',
            'authority', 'publisher', 'content_role', 'pdf_page', 'document_id',
            'file_sha256', 'needs_visual_review', 'verification_status')
    row = {key: chunk[key] for key in keys if key in chunk}
    row['content_scope'] = ('search_snippet' if chunk.get('kind') == 'web_snippet_only' else
                            'web_fulltext' if chunk.get('kind') == 'web_fulltext' else 'local_text')
    row['is_fulltext'] = chunk.get('kind') != 'web_snippet_only'
    row['char_count'] = len(chunk.get('text', ''))
    return row


def _paper_result(result):
    return {'added_chunks': result['added_chunks'], 'documents': result['imported'],
            'skipped': result['skipped'], 'errors': result['errors'],
            'statuses': ['按PDF页码保存文字；图形、表格与跨页题目需回看原件，未自动生成题目或答案。']}


def import_file(path):
    target = workspace_path(path)
    if target.suffix.lower() == '.pdf':
        return _paper_result(paper_import.import_file(target))
    if target.suffix.lower() not in {'.txt', '.md', '.docx', '.html', '.htm'}:
        raise ValueError('支持PDF、TXT、MD、DOCX、HTML资料。')
    with target.open('rb') as stream:
        raw = stream.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError('文件超过20 MB限制，请拆分。')
    digest = hashlib.sha256(raw).hexdigest()
    manifest = db.get_value('material_manifest_v1', {'documents': {}})
    if digest in manifest['documents']:
        return {'added_chunks': 0, 'documents': [], 'skipped': [{'path': str(target), 'sha256': digest}], 'errors': [], 'statuses': ['相同文件内容已导入。']}
    chunks = parse_upload(target.name, raw)
    if not chunks:
        raise ValueError('没有可提取正文；未保存空资料。')
    for index, chunk in enumerate(chunks):
        chunk['id'] = 'FILE' + hashlib.sha256(f'{digest}:{index}'.encode()).hexdigest()[:24]
        chunk.update(file_sha256=digest, document_id='file:' + digest,
                     original_filename=target.name, original_path=str(target),
                     content_role='user_supplied_unverified', verification_status='unverified',
                     imported_at=datetime.now(timezone.utc).isoformat(),
                     search_text=unicodedata.normalize('NFKC', chunk['text']))
    added = db.add_chunks(chunks)
    document = {'document_id': 'file:' + digest, 'sha256': digest, 'filename': target.name,
                'path': str(target), 'size_bytes': len(raw), 'chunk_count': len(chunks),
                'verification_status': 'unverified'}
    manifest['documents'][digest] = document
    db.set_value('material_manifest_v1', manifest)
    return {'added_chunks': added, 'documents': [document], 'skipped': [], 'errors': [],
            'sources': [source_summary(chunk) for chunk in chunks],
            'statuses': ['保存导入文本与来源；用户提供的材料不自动认定为官方内容。']}


def import_folder(path):
    target = workspace_path(path, directory=True)
    supported = {'.pdf', '.txt', '.md', '.docx', '.html', '.htm'}
    paths = []
    for candidate in target.rglob('*'):
        if candidate.suffix.lower() not in supported or not candidate.is_file():
            continue
        if not candidate.resolve().is_relative_to(target):
            continue
        paths.append(candidate)
        if len(paths) > paper_import.MAX_SCAN_FILES:
            raise ValueError('每批最多300份资料，请选择更具体的子文件夹。')
    combined = {'added_chunks': 0, 'documents': [], 'skipped': [], 'errors': [], 'statuses': []}
    # A fixed list excludes later downloads and unfinished .part files.
    for candidate in sorted(paths, key=str):
        try:
            result = import_file(str(candidate))
            combined['added_chunks'] += result['added_chunks']
            for key in ('documents', 'skipped', 'errors'):
                combined[key].extend(result[key])
        except Exception as exc:
            combined['errors'].append({'path': str(candidate), 'error': f'{type(exc).__name__}: {exc}'})
    combined['statuses'] = ['按文件内容去重；仅导入启动时完成的受支持文件，未自动拆题或创建答案。']
    return combined


def _persist_web(chunks, statuses):
    return {'added_chunks': db.add_chunks(chunks),
            'sources': [source_summary(chunk) for chunk in chunks], 'statuses': statuses,
            'note': '搜索摘要不代表已读取网页全文；来源与答案权威性须单独核验。'}


def search_materials(query, limit=3):
    if not isinstance(query, str) or not query.strip() or len(query) > 1000:
        raise ValueError('请提供1000字以内的搜索词。')
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 3:
        raise ValueError('联网搜索结果数须为1至3。')
    chunks, statuses = retrieval.search_web(query.strip(), limit)
    return _persist_web(chunks, statuses)


def fetch_material(url):
    if not isinstance(url, str) or len(url) > 4000 or not url.strip():
        raise ValueError('请提供有效网页URL。')
    chunks, statuses = retrieval.fetch_url(url.strip())
    return _persist_web(chunks, statuses)
