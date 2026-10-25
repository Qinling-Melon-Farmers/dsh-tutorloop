"""Workspace-bound real-exam bank, rich content and instance-scoped quizzes."""
import json
import os
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from . import storage as db
from .rich_content import html_to_blocks, blocks_text, analyze_blocks

_INDEX_NAME = '真题索引.json'
_SOLUTION_DIR = '答案解析'
_OPTIONS_DIR = '题目选项'
_CHOICE_LETTERS = 'ABCDEFGH'
_QUIZ_KEY = 'zhenti_quiz_active'
_MAX_JSON_BYTES = 32 * 1024 * 1024


def _now():
    return datetime.now(timezone.utc).isoformat()


def workspace_root():
    configured = os.environ.get('TUTOR_WORKSPACE_PATH', '').strip()
    root = Path(configured).expanduser() if configured else db.DB_PATH.parent.parent
    return root.resolve()


def _component(value):
    if not isinstance(value, str):
        raise ValueError('题库路径字段必须为文本。')
    if not value or value in {'.', '..'} or len(value) > 240 or any(c in value for c in '/\\:\x00'):
        raise ValueError('题库路径字段无效。')
    return value


def _id(value):
    value = str(value)
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', value) or value == 'None':
        raise ValueError('题库编号无效。')
    return value


def _contained(path):
    root = workspace_root()
    path = Path(path).resolve()
    if not path.is_relative_to(root):
        raise ValueError('题库文件不能指向工作区外。')
    return path


def _read_json(path):
    path = _contained(path)
    with path.open('rb') as stream:
        raw = stream.read(_MAX_JSON_BYTES + 1)
    if len(raw) > _MAX_JSON_BYTES:
        raise ValueError('题库JSON超过32MB限制。')
    data = json.loads(raw.decode('utf-8-sig'))
    if not isinstance(data, dict):
        raise ValueError('题库JSON必须为对象。')
    return data


def _index_path():
    return _contained(workspace_root() / '粉笔试卷' / _INDEX_NAME)


def _solution_path(subject, kind, name):
    return _contained(workspace_root() / '粉笔试卷' / _SOLUTION_DIR / _component(subject) / _component(kind) / (_component(name) + '.解析.json'))


def _options_path(paper_id):
    return _contained(workspace_root() / '粉笔试卷' / _OPTIONS_DIR / (_id(paper_id) + '.json'))


def _html_text(value):
    return blocks_text(html_to_blocks(value))


def _year_of(name):
    match = re.search(r'(20\d\d)', name)
    return int(match.group(1)) if match else 0


def _skill_of(solution, no, subject):
    items = solution.get('solutions') or []
    points = items[no - 1].get('keypoints') if 0 < no <= len(items) else None
    return str(points[0].get('name') or '').strip()[:100] if points else f'{subject}综合'


def _word_limit_of(stem, default=250):
    match = re.search(r'不超过\s*(\d+)\s*字', stem)
    if match:
        return max(1, min(1500, int(match.group(1))))
    match = re.search(r'(\d+)\s*[-~～]\s*(\d+)\s*字', stem)
    return max(1, min(1500, int(match.group(2)))) if match else default


def _reference_blocks(item):
    blocks = []
    for accessory in item.get('solutionAccessories') or []:
        if accessory.get('label') == 'reference':
            blocks.extend(html_to_blocks(accessory.get('content')))
    return blocks


def _reference_answer(item):
    return blocks_text(_reference_blocks(item))


def _quiz_materials(solution, indexes):
    materials = []
    wanted = {str(value) for value in indexes} if indexes else None
    available = {str(m.get('id')) for m in solution.get('materials') or []}
    if wanted is not None and not wanted.issubset(available):
        raise ValueError('题目所引用的部分材料缺失。')
    for material in solution.get('materials') or []:
        if wanted is not None and str(material.get('id')) not in wanted:
            continue
        blocks = html_to_blocks(material.get('content'))
        if blocks:
            materials.append({'title': f"给定资料（材料ID {material.get('id')}）", 'text': blocks_text(blocks), 'blocks': blocks})
    return materials


def _options_map(paper_id):
    path = _options_path(paper_id)
    if not path.exists():
        return {}
    data = _read_json(path)
    return {_id(q.get('id')): q for q in data.get('questions') or [] if isinstance(q, dict)}


def _choice(item, opts):
    answer = (item.get('correctAnswer') or {}).get('choice')
    if answer is None:
        return None
    answer = str(answer)
    # A multi-answer key cannot silently become the first single-choice answer.
    if not re.fullmatch(r'\d+', answer) or not 2 <= len(opts) <= len(_CHOICE_LETTERS):
        return None
    number = int(answer)
    return _CHOICE_LETTERS[number] if 0 <= number < len(opts) else None


def _ready(item, option):
    if (item.get('correctAnswer') or {}).get('choice') is not None:
        opts = option.get('options') or []
        if not isinstance(opts, list):
            return False
        return _choice(item, opts) is not None and all(bool(html_to_blocks(t)) for t in opts)
    return bool(_reference_blocks(item))


def _validate_index(data):
    if not isinstance(data.get('papers'), list):
        raise ValueError('题库索引格式无效。')
    for paper in data['papers']:
        _id(paper.get('paper_id'))
        for key in ('subject', 'kind', 'name'):
            _component(paper.get(key, ''))
        if not isinstance(paper.get('questions'), list):
            raise ValueError('题目索引格式无效。')
        for entry in paper['questions']:
            qid = _id(entry.get('qid'))
            if entry.get('seed') != f"zhenti:{paper['paper_id']}:{qid}":
                raise ValueError('题目索引编号不一致。')
    return data


def build_index(force=False):
    path = _index_path()
    if path.exists() and not force:
        return _validate_index(_read_json(path))
    root = _contained(workspace_root() / '粉笔试卷' / _SOLUTION_DIR)
    papers, errors = [], []
    if not root.exists():
        return {'papers': papers, 'errors': errors}
    for file in sorted(root.rglob('*.解析.json')):
        try:
            file = _contained(file)
            parts = file.relative_to(root).parts
            if len(parts) != 3:
                continue
            subject, kind = map(_component, parts[:2])
            data = _read_json(file)
            solutions = data.get('solutions') or []
            if not solutions:
                continue
            paper_id = _id(data.get('paper_id'))
            name = _component(data.get('name') or file.name[:-len('.解析.json')])
            # Index identity must point back to the scanned file, never a JSON-supplied path.
            if _solution_path(subject, kind, name) != file:
                raise ValueError('试卷名称与文件名不一致。')
            options = _options_map(paper_id)
            questions = []
            for no, item in enumerate(solutions, 1):
                qid = _id(item.get('id'))
                questions.append({'no': no, 'qid': qid, 'seed': f'zhenti:{paper_id}:{qid}',
                                  't': 'single' if (item.get('correctAnswer') or {}).get('choice') is not None else 'short',
                                  'skill': _skill_of(data, no, subject), 'ok': _ready(item, options.get(qid) or {})})
            papers.append({'paper_id': data['paper_id'], 'name': name, 'subject': subject,
                           'kind': kind, 'year': _year_of(name), 'count': len(questions), 'questions': questions})
        except (OSError, ValueError, TypeError, KeyError, AttributeError) as exc:
            errors.append({'file': file.name, 'error': str(exc)[:300]})
    papers.sort(key=lambda p: (p['subject'], p['kind'] != '真题卷', -p['year'], p['name']))
    result = {'papers': papers, 'rebuilt_at': _now(), 'errors': errors}
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.' + uuid4().hex + '.tmp')
    try:
        temporary.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    return result


def papers():
    skills, listing = {}, []
    for paper in build_index().get('papers') or []:
        bucket = skills.setdefault(paper['subject'], {})
        ready = [q for q in paper['questions'] if q.get('ok') is True]
        for question in ready:
            bucket[question['skill']] = bucket.get(question['skill'], 0) + 1
        listing.append({key: paper[key] for key in ('paper_id', 'name', 'subject', 'kind', 'year', 'count')} | {'ready_count': len(ready)})
    return {'papers': listing, 'skills': {subject: [skill for skill, _ in sorted(bucket.items(), key=lambda p: -p[1])] for subject, bucket in skills.items()}}


def paper_detail(paper_id):
    paper_id = _id(paper_id)
    for paper in build_index().get('papers') or []:
        if str(paper['paper_id']) == paper_id:
            return {key: paper[key] for key in ('paper_id', 'name', 'subject', 'kind', 'year', 'questions')}
    raise ValueError('未找到这套试卷，请重新生成真题索引。')


def _load_paper(paper):
    data = _read_json(_solution_path(paper['subject'], paper['kind'], paper['name']))
    if str(data.get('paper_id')) != str(paper['paper_id']):
        raise ValueError('试卷文件与索引编号不一致。')
    return data, _options_map(paper['paper_id'])


def _source(sid, title, locator, blocks):
    visual = analyze_blocks(blocks)
    return {'id': sid, 'title': title, 'locator': locator, 'url': '', 'kind': 'zhenti_material',
            'content_role': 'student_material', 'text': blocks_text(blocks), **visual}


def build_seed(seed_id):
    parts = seed_id.split(':') if isinstance(seed_id, str) else []
    if len(parts) != 3 or parts[0] != 'zhenti':
        raise ValueError('真题编号格式不正确。')
    paper_id, qid = map(_id, parts[1:])
    detail = paper_detail(paper_id)
    entry = next((q for q in detail['questions'] if str(q['qid']) == qid), None)
    if entry is None:
        raise ValueError('未找到这道真题。')
    solution, options_map = _load_paper(detail)
    item = next((q for q in solution.get('solutions') or [] if str(q.get('id')) == qid), None)
    if item is None:
        raise ValueError('未找到这道题的内容。')
    option = options_map.get(qid) or {}
    if not _ready(item, option):
        raise ValueError('这道题缺少有效选项或参考答案，暂不能练习。')
    stem_blocks = html_to_blocks(item.get('content'))
    stem = blocks_text(stem_blocks) or '请根据图像作答。'
    explanation = _html_text(item.get('solution'))
    base = {'id': seed_id, 'subject': detail['subject'], 'skill': entry['skill'], 'difficulty': '提高',
            'stem': stem, 'stem_blocks': stem_blocks, 'explanation': explanation,
            'hint': f"本题考查：{entry['skill']}。先定位材料与题干条件。"}
    if (item.get('correctAnswer') or {}).get('choice') is not None:
        options = []
        for i, value in enumerate(option.get('options') or []):
            blocks = html_to_blocks(value)
            options.append({'id': _CHOICE_LETTERS[i], 'text': blocks_text(blocks), 'blocks': blocks})
        material_blocks = html_to_blocks((option.get('material') or {}).get('content'))
        if material_blocks:
            source = _source('P1', f"{detail['name']}·第{entry['no']}题材料", f"第{entry['no']}题", material_blocks)
        else:
            source = _source('P1', f"{detail['name']}·题干", f"第{entry['no']}题", stem_blocks)
        sources = [source]
        correct = _choice(item, option['options'])
        question = {**base, 'question_type': 'single_choice', 'options': options,
                    'correct_option_id': correct, 'word_limit': 150, 'rubric_status': 'ready',
                    'reference_answer': f'{correct}。{explanation}',
                    'rubric': [{'name': '正确选择', 'requirement': f'选择{correct}', 'points': 10, 'evidence_ids': ['P1']}]}
    else:
        indexes = next((a['materialIndexes'] for a in item.get('accessories') or [] if a.get('materialIndexes')), None)
        materials = _quiz_materials(solution, indexes)
        if indexes and not materials:
            raise ValueError('题目所引用材料缺失，不能以题干替代。')
        sources = [_source(f'P{i+1}', m['title'], f'材料{i+1}', m['blocks']) for i, m in enumerate(materials)]
        if not sources:
            raise ValueError('申论缺少给定资料，暂不能练习。')
        question = {**base, 'question_type': 'short_answer', 'options': [], 'correct_option_id': None,
                    'word_limit': _word_limit_of(stem), 'reference_answer': _reference_answer(item) or '参考答案含图像，需教师查看参考图像后核对。',
                    'reference_blocks': _reference_blocks(item), 'rubric_status': 'uncalibrated',
                    'rubric': [{'name': '待标定', 'requirement': '量表尚未确认，仅给定性反馈，不提供精确评分。',
                                'points': 10, 'evidence_ids': [s['id'] for s in sources]}]}
    material_blocks = []
    for source in sources:
        material_blocks.extend(source['blocks'])
    all_blocks = stem_blocks + material_blocks + [block for opt in question['options'] for block in opt['blocks']]
    visuals = analyze_blocks(all_blocks)
    question.update(material='\n\n'.join(f"[{s['id']}] {s['text']}" for s in sources),
                    material_blocks=material_blocks, student_material_ids=[s['id'] for s in sources],
                    visual_required=visuals['visual_required'], visual_supported=visuals['visual_supported'])
    return question, sources


def is_zhenti(seed_id):
    return isinstance(seed_id, str) and seed_id.startswith('zhenti:')


def _quiz():
    quiz = db.get_value(_QUIZ_KEY)
    if (not isinstance(quiz, dict) or quiz.get('schema_version') != 2
            or not isinstance(quiz.get('exercise_ids'), list) or not isinstance(quiz.get('items'), list)
            or not quiz['items'] or len(quiz['items']) != len(quiz['exercise_ids'])
            or type(quiz.get('index')) is not int or not 0 <= quiz['index'] <= len(quiz['items'])
            or quiz.get('mode') not in ('coach', 'exam')):
        return None
    return quiz


def start_quiz(paper_id=None, subject=None, skill=None, count=10, shuffle=False, mode='coach'):
    if mode not in ('coach', 'exam'):
        raise ValueError('未知练习模式。')
    if paper_id is not None:
        detail = paper_detail(paper_id)
        items = [q['seed'] for q in detail['questions'] if q.get('ok') is True]
        title = f"整卷 · {detail['name']}"
    else:
        pool = [q['seed'] for p in build_index().get('papers') or [] if not subject or p['subject'] == subject
                for q in p['questions'] if q.get('ok') is True and (not skill or q['skill'] == skill)]
        if isinstance(count, bool) or not isinstance(count, int) or not 1 <= count <= 50:
            raise ValueError('组卷数量须为1至50。')
        items = random.sample(pool, min(count, len(pool)))
        title = f'组卷 · {subject or "全部"}{("·" + skill) if skill else ""} · {len(items)}题'
    if not items:
        raise ValueError('没有符合条件的可用题目。')
    if shuffle:
        random.shuffle(items)
    # Preparation is side-effect-free: the controller must create the first
    # exercise successfully before activation. Later seeds revalidate on load.
    build_seed(items[0])
    return {'schema_version': 2, 'quiz_id': 'quiz-' + uuid4().hex, 'title': title,
            'items': items, 'exercise_ids': [None] * len(items), 'index': 0,
            'mode': mode, 'started_at': _now(), 'current_seed': items[0], 'finished': False}


def activate_quiz(plan, exercise_id, con=None):
    if con is None:
        with db.connect() as connection:
            connection.execute('BEGIN IMMEDIATE')
            activate_quiz(plan, exercise_id, con=connection)
        return state()
    if not isinstance(plan, dict) or plan.get('schema_version') != 2 or plan.get('index') != 0:
        raise ValueError('无效的整卷准备状态。')
    quiz = {key: plan[key] for key in ('schema_version', 'quiz_id', 'title', 'items', 'exercise_ids', 'index', 'mode', 'started_at')}
    _check_exercise(quiz, 0, exercise_id, con)
    quiz['exercise_ids'][0] = exercise_id
    db.set_value(_QUIZ_KEY, quiz, con)
    return None


def _check_exercise(quiz, index, exercise_id, con):
    row = con.execute('SELECT seed_id,mode FROM exercises WHERE id=?', (exercise_id,)).fetchone()
    if not row or row['seed_id'] != quiz['items'][index] or row['mode'] != quiz['mode']:
        raise ValueError('本轮练习实例与题目或模式不一致。')


def state():
    quiz = _quiz()
    if not quiz:
        return {'active': False, 'invalidated': bool(db.get_value(_QUIZ_KEY)), 'note': '旧整卷记录无可靠轮次归属时请重新开卷。'}
    finished = quiz['index'] >= len(quiz['items'])
    return {'active': True, 'quiz_id': quiz['quiz_id'], 'title': quiz['title'], 'mode': quiz['mode'],
            'total': len(quiz['items']), 'index': quiz['index'], 'finished': finished,
            'current_seed': None if finished else quiz['items'][quiz['index']],
            'current_exercise_id': None if finished else quiz['exercise_ids'][quiz['index']]}


def quiz_current_exercise_id():
    return state().get('current_exercise_id')


def next_quiz_plan():
    quiz = _quiz()
    if not quiz:
        raise ValueError('没有可继续的本轮整卷，请重新开卷。')
    index = min(quiz['index'] + 1, len(quiz['items']))
    return {'quiz_id': quiz['quiz_id'], 'index': index, 'mode': quiz['mode'],
            'current_seed': quiz['items'][index] if index < len(quiz['items']) else None,
            'finished': index >= len(quiz['items'])}


def commit_quiz_step(quiz_id, index, exercise_id=None, con=None):
    if con is None:
        with db.connect() as connection:
            connection.execute('BEGIN IMMEDIATE')
            commit_quiz_step(quiz_id, index, exercise_id, con=connection)
        result = state()
        return {**result, 'report': report()} if result['finished'] else result
    saved = con.execute('SELECT value FROM settings WHERE key=?', (_QUIZ_KEY,)).fetchone()
    quiz = json.loads(saved['value']) if saved else None
    if not isinstance(quiz, dict) or quiz.get('schema_version') != 2 or quiz.get('quiz_id') != quiz_id:
        raise ValueError('整卷已切换，请刷新。')
    expected = min(quiz['index'] + 1, len(quiz['items']))
    if index != expected:
        raise ValueError('整卷进度已变化，请刷新。')
    if index < len(quiz['items']):
        _check_exercise(quiz, index, exercise_id, con)
        quiz['exercise_ids'][index] = exercise_id
    elif exercise_id is not None:
        raise ValueError('已完成整卷不能绑定额外练习。')
    quiz['index'] = index
    db.set_value(_QUIZ_KEY, quiz, con)
    return None


def advance():
    raise ValueError('整卷推进须由教学控制器绑定本轮练习实例。')


def quit_quiz():
    db.set_value(_QUIZ_KEY, None)
    return {'active': False}


def report():
    quiz = _quiz()
    if not quiz:
        raise ValueError('没有可报告的本轮整卷，请重新开卷。')
    rows, correct, scored, pending, answered, qualitative = [], 0, 0, 0, 0, 0
    with db.connect() as con:
        for no, (seed, exercise_id) in enumerate(zip(quiz['items'], quiz['exercise_ids']), 1):
            row = con.execute('SELECT id,status,answer,feedback FROM tutor_attempts WHERE exercise_id=? ORDER BY revision DESC,created_at DESC LIMIT 1', (exercise_id,)).fetchone() if exercise_id else None
            meta = con.execute('SELECT topic FROM exercises WHERE id=?', (exercise_id,)).fetchone() if exercise_id else None
            entry = {'no': no, 'seed': seed, 'exercise_id': exercise_id, 'skill': meta['topic'] if meta else '',
                     'attempt_id': row['id'] if row else None,
                     'status': row['status'] if row else 'unanswered', 'answer': row['answer'] if row else None,
                     'grading_status': 'pending' if row and row['status'] == 'pending' else 'unanswered'}
            if row:
                answered += 1
            if row and row['status'] != 'pending':
                feedback = json.loads(row['feedback'] or '{}')
                score = feedback.get('score')
                if isinstance(score, (int, float)) and not isinstance(score, bool):
                    scored += 1
                    entry['score'] = score
                    entry['grading_status'] = 'scored'
                    if score >= 8 and not feedback.get('over_word_limit'):
                        correct += 1
                else:
                    entry['status'] = 'qualitative'
                    entry['grading_status'] = 'qualitative'
                    qualitative += 1
            elif row and row['status'] == 'pending':
                pending += 1
            rows.append(entry)
    return {'quiz_id': quiz['quiz_id'], 'title': quiz['title'], 'total': len(rows),
            'answered': answered, 'scored': scored, 'graded': scored, 'qualitative': qualitative,
            'correct': correct, 'pending': pending,
            'accuracy': round(correct / scored, 3) if scored else None, 'items': rows}
