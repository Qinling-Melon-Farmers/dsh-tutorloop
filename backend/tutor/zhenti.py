"""Real-exam (真题) seed bank built from local fenbi solution files.

Data layout inside the workspace (workspace root is derived from the DB path):
  粉笔试卷/答案解析/{行测|申论}/{真题卷|模考卷}/{name}.解析.json
  粉笔试卷/题目选项/{paper_id}.json     xingce only: options + per-question material
  粉笔试卷/真题索引.json                 generated index, rebuilt on demand

seed ids look like ``zhenti:{paper_id}:{question_id}``. Quiz (整卷/组卷)
progress is persisted through storage settings so a paper can be resumed.
Reference answers and explanations live only inside the frozen question and
are stripped by public_exercise before students submit.
"""
import html
import json
import random
import re
from datetime import datetime, timezone
from pathlib import Path

from . import storage as db

_INDEX_NAME = '真题索引.json'
_SOLUTION_DIR = '答案解析'
_OPTIONS_DIR = '题目选项'
_CHOICE_LETTERS = 'ABCDEFGH'
_QUIZ_KEY = 'zhenti_quiz_active'


def _now():
    return datetime.now(timezone.utc).isoformat()


def workspace_root() -> Path:
    return db.DB_PATH.parent.parent


def _html_text(value) -> str:
    if not value:
        return ''
    text = re.sub(r'<br\s*/?>|</p>|</div>|</li>', '\n', str(value))
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def _index_path() -> Path:
    return workspace_root() / '粉笔试卷' / _INDEX_NAME


def _solution_path(subject: str, kind: str, name: str) -> Path:
    return workspace_root() / '粉笔试卷' / _SOLUTION_DIR / subject / kind / f'{name}.解析.json'


def _options_path(paper_id) -> Path:
    return workspace_root() / '粉笔试卷' / _OPTIONS_DIR / f'{paper_id}.json'


def _year_of(name: str) -> int:
    match = re.search(r'(20\d\d)', name)
    return int(match.group(1)) if match else 0


def _skill_of(solution: dict, no: int, subject: str) -> str:
    points = ((solution.get('solutions') or [])[no - 1].get('keypoints')) if no <= len(solution.get('solutions') or []) else None
    if points:
        return str(points[0].get('name') or '').strip()[:30] or (f'{subject}综合')
    return f'{subject}综合'


def _word_limit_of(stem: str, default: int = 250) -> int:
    match = re.search(r'不超过\s*(\d+)\s*字', stem)
    if match:
        return max(1, min(1500, int(match.group(1))))
    match = re.search(r'(\d+)\s*[-~～]\s*(\d+)\s*字', stem)
    if match:
        return max(1, min(1500, int(match.group(2))))
    return default


def _quiz_materials(solution: dict, indexes) -> list[dict]:
    """Materials referenced by a shenlun question (by materialIndexes id)."""
    texts = []
    for material in solution.get('materials') or []:
        if indexes and material.get('id') not in indexes:
            continue
        content = _html_text(material.get('content'))
        if content:
            texts.append({'title': f"给定资料（材料ID {material.get('id')}）", 'text': content})
    if not texts and indexes is None:
        for material in solution.get('materials') or []:
            content = _html_text(material.get('content'))
            if content:
                texts.append({'title': f"给定资料（材料ID {material.get('id')}）", 'text': content})
    return texts


def build_index(force: bool = False) -> dict:
    """Scan solution (and options) files into the light index file."""
    path = _index_path()
    if path.exists() and not force:
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            pass
    papers = []
    root = workspace_root() / '粉笔试卷' / _SOLUTION_DIR
    if not root.exists():
        return {'papers': papers}
    for file in root.rglob('*.解析.json'):
        try:
            data = json.loads(file.read_text(encoding='utf-8'))
        except Exception:
            continue
        solutions = data.get('solutions') or []
        if not solutions:
            continue
        subject, kind = file.relative_to(root).parts[0], file.relative_to(root).parts[1]
        paper_id = data.get('paper_id')
        options_file = _options_path(paper_id)
        options_map = {}
        if options_file.exists():
            try:
                for q in json.loads(options_file.read_text(encoding='utf-8')).get('questions') or []:
                    options_map[str(q.get('id'))] = q
            except Exception:
                options_map = {}
        questions = []
        for no, item in enumerate(solutions, start=1):
            qid = str(item.get('id'))
            options = options_map.get(qid) or {}
            opts = options.get('options') or []
            choice = ((item.get('correctAnswer') or {}).get('choice'))
            single = choice is not None
            ok = bool(single and len(opts) >= 2) or (not single and bool(_reference_answer(item)))
            questions.append({'no': no, 'qid': qid, 'seed': f'zhenti:{paper_id}:{qid}',
                              't': 'single' if single else 'short',
                              'skill': _skill_of(data, no, subject),
                              'ok': ok})
        papers.append({'paper_id': paper_id, 'name': data.get('name') or file.stem,
                       'subject': subject, 'kind': kind, 'year': _year_of(data.get('name') or ''),
                       'count': len(questions), 'questions': questions})
    papers.sort(key=lambda p: (p['subject'], p['kind'] != '真题卷', -p['year'], p['name']))
    index = {'papers': papers, 'rebuilt_at': _now()}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(index, ensure_ascii=False), encoding='utf-8')
    return index


def _reference_answer(solution_item: dict) -> str:
    for accessory in solution_item.get('solutionAccessories') or []:
        if accessory.get('label') == 'reference':
            return _html_text(accessory.get('content'))
    return ''


def papers() -> dict:
    index = build_index()
    skills = {}
    for paper in index.get('papers') or []:
        bucket = skills.setdefault(paper['subject'], {})
        for q in paper.get('questions') or []:
            bucket[q['skill']] = bucket.get(q['skill'], 0) + 1
    listing = [{'paper_id': p['paper_id'], 'name': p['name'], 'subject': p['subject'],
                'kind': p['kind'], 'year': p['year'], 'count': p['count']} for p in index.get('papers') or []]
    ranked = {s: [k for k, _ in sorted(b.items(), key=lambda kv: -kv[1])]
              for s, b in skills.items()}
    return {'papers': listing, 'skills': ranked}


def paper_detail(paper_id) -> dict:
    index = build_index()
    for paper in index.get('papers') or []:
        if str(paper['paper_id']) == str(paper_id):
            return {'paper_id': paper['paper_id'], 'name': paper['name'], 'subject': paper['subject'],
                    'kind': paper['kind'], 'year': paper['year'], 'questions': paper['questions']}
    raise ValueError('未找到这套试卷，请重新生成真题索引。')


def _load_paper(paper) -> tuple[dict, dict]:
    file = _solution_path(paper['subject'], paper['kind'], paper['name'])
    if not file.exists():
        raise ValueError('找不到这套卷的解析文件。')
    solution = json.loads(file.read_text(encoding='utf-8'))
    options_file = _options_path(paper['paper_id'])
    options_map = {}
    if options_file.exists():
        for q in json.loads(options_file.read_text(encoding='utf-8')).get('questions') or []:
            options_map[str(q.get('id'))] = q
    return solution, options_map


def build_seed(seed_id: str) -> tuple[dict, list[dict]]:
    """Return (question, sources) for a zhenti seed id, aligned with _question checks."""
    parts = seed_id.split(':')
    if len(parts) != 3 or parts[0] != 'zhenti':
        raise ValueError('真题编号格式不正确。')
    paper_id, qid = parts[1], parts[2]
    detail = paper_detail(paper_id)
    entry = next((q for q in detail['questions'] if q['qid'] == qid), None)
    if entry is None:
        raise ValueError('未找到这道真题。')
    solution, options_map = _load_paper(detail)
    item = next((s for s in solution['solutions'] if str(s['id']) == qid), None)
    if item is None:
        raise ValueError('未找到这道真题的内容。')
    stem = _html_text(item.get('content'))
    explanation = _html_text(item.get('solution'))
    skill = entry['skill']
    if entry['t'] == 'single':
        opt_data = options_map.get(qid) or {}
        opts = [o for o in opt_data.get('options') or []]
        if len(opts) < 2:
            raise ValueError('这道题缺少选项，暂不能练习。')
        choice = str((item.get('correctAnswer') or {}).get('choice')).split(',')[0]
        correct = _CHOICE_LETTERS[int(choice)] if choice.isdigit() and int(choice) < len(opts) else None
        if correct is None:
            raise ValueError('这道题缺少标准答案，暂不能练习。')
        material = opt_data.get('material') or {}
        material_text = _html_text(material.get('content'))
        source = {'id': 'P1', 'title': f"{detail['name']}·第{entry['no']}题材料" if material_text else f"{detail['name']}·题干",
                  'locator': f'第{entry["no"]}题', 'url': '', 'kind': 'zhenti_material',
                  'text': material_text or (stem + '\n' + '\n'.join(f'{_CHOICE_LETTERS[i]}. {t}' for i, t in enumerate(opts)))}
        question = {'id': seed_id, 'subject': detail['subject'], 'skill': skill,
                    'question_type': 'single_choice',
                    'options': [{'id': _CHOICE_LETTERS[i], 'text': str(t)} for i, t in enumerate(opts)],
                    'correct_option_id': correct, 'explanation': explanation, 'difficulty': '提高',
                    'material': f"[P1] {source['text'][:2000]}", 'stem': stem, 'word_limit': 150,
                    'reference_answer': f'{correct}。{explanation[:400]}',
                    'rubric': [{'name': '正确选择', 'requirement': f'选择{correct}', 'points': 10, 'evidence_ids': ['P1']}],
                    'hint': f'本题考查：{skill}。先排除与题干条件直接矛盾的选项。'}
        return question, [source]
    # subjective (shenlun)
    indexes = None
    for accessory in item.get('accessories') or []:
        if accessory.get('materialIndexes'):
            indexes = set(accessory['materialIndexes'])
            break
    materials = _quiz_materials(solution, indexes)
    sources = [{'id': f'P{i + 1}', 'title': m['title'] or f'材料{i + 1}', 'locator': f'材料{i + 1}',
                'url': '', 'kind': 'zhenti_material', 'text': m['text']} for i, m in enumerate(materials)]
    if not sources:
        sources = [{'id': 'P1', 'title': f'{detail["name"]}·题干', 'locator': f'第{entry["no"]}题',
                    'url': '', 'kind': 'zhenti_material', 'text': stem}]
    reference = _reference_answer(item) or (explanation or '参考答案缺失，由导师按材料批改。')
    question = {'id': seed_id, 'subject': detail['subject'], 'skill': skill,
                'question_type': 'short_answer', 'options': [], 'correct_option_id': None,
                'explanation': explanation, 'difficulty': '提高',
                'material': f"[P1] {sources[0]['text'][:2000]}", 'stem': stem,
                'word_limit': _word_limit_of(stem), 'reference_answer': reference[:4000],
                'rubric': [{'name': '申论作答', 'requirement': '按参考答案要点逐条对照：覆盖度、准确性、条理与字数',
                            'points': 10, 'evidence_ids': [s['id'] for s in sources][:4]}],
                'hint': '先定位材料中与问法直接相关的句子，再分条概括，不引入材料外推断。'}
    return question, sources


def is_zhenti(seed_id: str) -> bool:
    return isinstance(seed_id, str) and seed_id.startswith('zhenti:')


# ---------- quiz (整卷 / 组卷) ----------

def _quiz() -> dict | None:
    return db.get_value(_QUIZ_KEY) or None


def start_quiz(paper_id=None, subject=None, skill=None, count=10, shuffle=False) -> dict:
    if paper_id is not None:
        detail = paper_detail(paper_id)
        items = [q['seed'] for q in detail['questions'] if q['ok']]
        title = f"整卷 · {detail['name']}"
    else:
        index = build_index()
        pool = []
        for paper in index.get('papers') or []:
            if subject and paper['subject'] != subject:
                continue
            for q in paper.get('questions') or []:
                if q['ok'] and skill and q['skill'] != skill:
                    continue
                pool.append(q['seed'])
        if not pool:
            raise ValueError('没有符合条件的题目，请调整科目或考点。')
        count = max(1, min(int(count or 10), 50, len(pool)))
        items = random.sample(pool, count)
        title = f'组卷 · {subject or "全部"}{("·" + skill) if skill else ""} · {count}题'
    if shuffle:
        random.shuffle(items)
    quiz = {'quiz_id': f'quiz-{int(datetime.now().timestamp())}', 'title': title,
            'items': items, 'index': 0, 'started_at': _now()}
    db.set_value(_QUIZ_KEY, quiz)
    return state()


def state() -> dict:
    quiz = _quiz()
    if not quiz:
        return {'active': False}
    return {'active': True, 'quiz_id': quiz['quiz_id'], 'title': quiz['title'],
            'total': len(quiz['items']), 'index': quiz['index'],
            'current_seed': quiz['items'][quiz['index']] if quiz['index'] < len(quiz['items']) else None,
            'finished': quiz['index'] >= len(quiz['items'])}


def advance() -> dict:
    quiz = _quiz()
    if not quiz:
        raise ValueError('没有进行中的整卷或组卷。')
    if quiz['index'] + 1 >= len(quiz['items']):
        quiz['index'] = len(quiz['items'])
        db.set_value(_QUIZ_KEY, quiz)
        return {**state(), 'finished': True, 'report': report()}
    quiz['index'] += 1
    db.set_value(_QUIZ_KEY, quiz)
    return state()


def quit_quiz() -> dict:
    db.set_value(_QUIZ_KEY, None)
    return {'active': False}


def report() -> dict:
    quiz = _quiz()
    if not quiz:
        raise ValueError('没有进行中的整卷或组卷。')
    rows = []
    correct = graded = pending = 0
    with db.connect() as con:
        for position, seed in enumerate(quiz['items'], start=1):
            row = con.execute(
                'SELECT e.id, a.status, a.answer, a.feedback FROM exercises e '
                "JOIN tutor_attempts a ON a.exercise_id = e.id AND a.status = 'graded' "
                'WHERE e.seed_id = ? ORDER BY a.created_at DESC LIMIT 1', (seed,)).fetchone()
            meta = con.execute('SELECT topic FROM exercises WHERE seed_id = ? LIMIT 1', (seed,)).fetchone()
            entry = {'no': position, 'seed': seed, 'skill': meta['topic'] if meta else '',
                     'status': row['status'] if row else 'unanswered', 'answer': row['answer'] if row else None}
            if row:
                graded += 1
                feedback = json.loads(row['feedback'] or '{}')
                score = feedback.get('score')
                entry['score'] = score
                if (row['status'] == 'graded' and score is not None and score >= 8
                        and not feedback.get('over_word_limit')):
                    correct += 1
            else:
                pending_row = con.execute(
                    'SELECT 1 FROM exercises e JOIN tutor_attempts a ON a.exercise_id = e.id '
                    "AND a.status = 'pending' WHERE e.seed_id = ? LIMIT 1", (seed,)).fetchone()
                if pending_row:
                    entry['status'] = 'pending'
                    pending += 1
            rows.append(entry)
    total_done = graded
    return {'quiz_id': quiz['quiz_id'], 'title': quiz['title'], 'total': len(quiz['items']),
            'answered': total_done, 'correct': correct, 'pending': pending,
            'accuracy': round(correct / total_done, 3) if total_done else None, 'items': rows}
