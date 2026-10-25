"""Real-exam (真题) seed bank and quiz flow against a tiny synthetic workspace."""
import json
import os
from pathlib import Path
import tempfile
import concurrent.futures
import threading
from unittest.mock import patch
import unittest

from bridge import dispatch
from tutor import storage
from tutor import zhenti


def _write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')


class ZhentiTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        env_patch = patch.dict(os.environ, {'TUTOR_WORKSPACE_PATH': str(self.root / 'ws')})
        env_patch.start()
        self.addCleanup(env_patch.stop)
        db_patch = patch.object(storage, 'DB_PATH', self.root / 'ws' / '.dsh-tutorloop' / 'tutor.sqlite3')
        db_patch.start()
        self.addCleanup(db_patch.stop)
        base = self.root / 'ws' / '粉笔试卷'
        _write_json(base / '答案解析' / '行测' / '真题卷' / '2024行测样卷.解析.json', {
            'paper_id': 900001, 'name': '2024行测样卷',
            'materials': [{'id': 111, 'content': '<p>2024年进出口总值14230亿元。</p>'}],
            'solutions': [
                {'id': 501, 'content': '<p>下列表述正确的有几项？</p>', 'type': '1',
                 'correctAnswer': {'choice': '1', 'type': 201},
                 'solution': '<p>逐项核对后选B。</p>', 'keypoints': [{'id': 1, 'name': '政治常识'}]},
                {'id': 502, 'content': '<p>月均进口值约为多少亿元？</p>', 'type': '1',
                 'correctAnswer': {'choice': '2', 'type': 201},
                 'solution': '<p>进口=14230-8664≈5566，5566/12≈464。</p>', 'keypoints': [{'id': 2, 'name': '平均数'}]},
            ]})
        _write_json(base / '题目选项' / '900001.json', {
            'paper_id': 900001, 'name': '2024行测样卷',
            'questions': [
                {'id': 501, 'options': ['4', '3', '2', '1'], 'material': None},
                {'id': 502, 'options': ['395', '409', '468', '502'],
                 'material': {'id': 111, 'content': '<p>2024年进出口总值14230亿元，出口8664亿元。</p>'}},
            ]})
        _write_json(base / '答案解析' / '申论' / '真题卷' / '2024申论样卷.解析.json', {
            'paper_id': 900002, 'name': '2024申论样卷',
            'materials': [{'id': 222, 'content': '<p>H市发布城市用光总体规划，分区域控制亮度。</p>'}],
            'solutions': [
                {'id': 601, 'content': '<p>请根据给定资料，概括H市管理城市用光的做法。不超过250字。</p>', 'type': '21',
                 'correctAnswer': None, 'solution': '',
                 'keypoints': [{'id': 3, 'name': '概括措施类'}],
                 'accessories': [{'materialIndexes': [222], 'score': 10}],
                 'solutionAccessories': [{'label': 'reference', 'content': '<p>一、规划分区；二、规范用光。</p>'}],
            }]})
        storage.DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    def action(self, action, **payload):
        return dispatch({'action': action, 'payload': payload})

    def test_index_papers_and_skills(self):
        result = self.action('zhenti_papers')
        self.assertEqual(len(result['papers']), 2)
        by_subject = {p['subject']: p for p in result['papers']}
        self.assertEqual(by_subject['行测']['count'], 2)
        self.assertEqual(by_subject['申论']['count'], 1)
        self.assertIn('政治常识', result['skills']['行测'])
        self.assertIn('概括措施类', result['skills']['申论'])

    def test_single_choice_seed_full_flow_autograded(self):
        exercise = self.action('start_practice', seed_id='zhenti:900001:501')
        self.assertEqual(exercise['question']['question_type'], 'single_choice')
        self.assertEqual([o['id'] for o in exercise['question']['options']], ['A', 'B', 'C', 'D'])
        # teacher-only fields stripped from the student view
        self.assertNotIn('correct_option_id', exercise['question'])
        self.assertNotIn('explanation', exercise['question'])
        context = self.action('get_context', exercise_id=exercise['id'])
        self.assertEqual(context['exercise']['question']['correct_option_id'], 'B')
        submitted = self.action('submit_answer', exercise_id=exercise['id'], answer='B',
                                submission_id='s1', expected_version=exercise['version'])
        self.assertEqual(submitted['status'], 'graded')
        self.assertEqual(submitted['feedback']['score'], 10)

    def test_single_choice_with_material_becomes_source(self):
        exercise = self.action('start_practice', seed_id='zhenti:900001:502')
        materials = exercise['materials']
        self.assertEqual(len(materials), 1)
        self.assertIn('14230', materials[0]['text'])

    def test_shenlun_seed_carries_reference_for_teacher(self):
        exercise = self.action('start_practice', seed_id='zhenti:900002:601')
        self.assertEqual(exercise['question']['question_type'], 'short_answer')
        self.assertEqual(exercise['question']['word_limit'], 250)
        self.assertIn('给定资料', exercise['materials'][0]['title'])
        context = self.action('get_context', exercise_id=exercise['id'])
        self.assertIn('规划分区', context['exercise']['question']['reference_answer'])

    def test_paper_quiz_walkthrough_with_report(self):
        state = self.action('zhenti_start_quiz', paper_id=900001)
        self.assertEqual(state['total'], 2)
        current = self.action('student_state')['exercise']
        self.assertEqual(current['seed_id'] if 'seed_id' in current else current['question']['id'],
                         'zhenti:900001:501' if 'seed_id' in current else 'zhenti:900001:501')
        self.action('submit_answer', exercise_id=current['id'], answer='B', submission_id='q1',
                    expected_version=current['version'])
        state = self.action('zhenti_next')
        self.assertEqual(state['index'], 1)
        current = self.action('student_state')['exercise']
        self.action('submit_answer', exercise_id=current['id'], answer='A', submission_id='q2',
                    expected_version=current['version'])
        state = self.action('zhenti_next')
        self.assertTrue(state['finished'])
        report = self.action('zhenti_report')
        self.assertEqual(report['total'], 2)
        self.assertEqual(report['answered'], 2)
        self.assertEqual(report['correct'], 1)
        rows = {item['no']: item for item in report['items']}
        self.assertEqual(rows[1]['status'], 'graded')
        self.assertLess(rows[2]['score'], 8)
        self.action('zhenti_quit')
        self.assertFalse(self.action('zhenti_quiz_state')['active'])

    def test_mix_quiz_filters_by_skill(self):
        state = self.action('zhenti_start_quiz', subject='行测', skill='政治常识', count=5)
        self.assertEqual(state['total'], 1)

    def test_shenlun_without_options_file_stays_written(self):
        # 申论卷没有选项文件:仍按主观题构建,参考答案只进教师上下文。
        question, _ = zhenti.build_seed('zhenti:900002:601')
        self.assertEqual(question['question_type'], 'short_answer')
        self.assertIn('规划分区', question['reference_answer'])
        # 行测题若缺选项文件则明确报错,不静默降级。
        _write_json(self.root / 'ws' / '粉笔试卷' / '题目选项' / '900001.json',
                    {'paper_id': 900001, 'questions': []})
        zhenti.build_index(force=True)
        with self.assertRaises(ValueError):
            zhenti.build_seed('zhenti:900001:501')

    def test_custom_database_does_not_relocate_workspace_bank(self):
        with patch.object(storage, 'DB_PATH', self.root / 'elsewhere' / 'data' / 'custom.sqlite3'):
            self.assertEqual(len(zhenti.papers()['papers']), 2)
            # Windows runners may provide an 8.3 TEMP alias; compare canonical paths.
            self.assertEqual(zhenti.workspace_root(), (self.root / 'ws').resolve())

    def test_missing_options_or_invalid_choice_never_enter_mix_pool(self):
        file = self.root / 'ws' / '粉笔试卷' / '题目选项' / '900001.json'
        data = json.loads(file.read_text(encoding='utf-8'))
        data['questions'] = data['questions'][1:]
        _write_json(file, data)
        index = zhenti.build_index(force=True)
        xingce = next(p for p in index['papers'] if p['subject'] == '行测')
        self.assertFalse(xingce['questions'][0]['ok'])
        self.assertTrue(xingce['questions'][1]['ok'])
        with self.assertRaises(ValueError):
            zhenti.start_quiz(subject='行测', skill='政治常识', count=1)
        plan = zhenti.start_quiz(subject='行测', count=50)
        self.assertEqual(plan['items'], ['zhenti:900001:502'])
        self.assertFalse(zhenti.state()['active'])
        solution = self.root / 'ws' / '粉笔试卷' / '答案解析' / '行测' / '真题卷' / '2024行测样卷.解析.json'
        data = json.loads(solution.read_text(encoding='utf-8'))
        data['solutions'][1]['correctAnswer']['choice'] = '1,2'
        _write_json(solution, data)
        index = zhenti.build_index(force=True)
        self.assertFalse(next(p for p in index['papers'] if p['subject'] == '行测')['questions'][1]['ok'])

    def test_new_quiz_has_no_prior_answers_and_mode_is_inherited(self):
        first = self.action('zhenti_start_quiz', paper_id=900001, mode='exam')
        ex = self.action('student_state')['exercise']
        self.action('submit_answer', exercise_id=ex['id'], answer='B', submission_id='first-quiz', expected_version=ex['version'])
        self.action('zhenti_quit')
        second = self.action('zhenti_start_quiz', paper_id=900001, mode='exam')
        self.assertNotEqual(first['quiz_id'], second['quiz_id'])
        report = self.action('zhenti_report')
        self.assertEqual(report['answered'], 0)
        self.assertIsNone(report['accuracy'])
        self.assertIsNone(report['items'][0]['answer'])
        self.assertNotEqual(report['items'][0]['exercise_id'], ex['id'])
        self.action('zhenti_next')
        self.assertEqual(self.action('student_state')['exercise']['mode'], 'exam')

    def test_pending_and_qualitative_report_only_this_round(self):
        self.action('zhenti_start_quiz', paper_id=900002)
        ex = self.action('student_state')['exercise']
        pending = self.action('submit_answer', exercise_id=ex['id'], answer='先作答再核对。', submission_id='pending', expected_version=ex['version'])
        report = self.action('zhenti_report')
        self.assertEqual((report['answered'], report['pending'], report['scored']), (1, 1, 0))
        self.assertEqual(report['items'][0]['attempt_id'], pending['attempt_id'])
        self.assertEqual(report['items'][0]['grading_status'], 'pending')
        with storage.connect() as con:
            con.execute("UPDATE tutor_attempts SET status='graded',feedback=? WHERE id=?", (json.dumps({'score': None, 'grading_status': 'qualitative'}), pending['attempt_id']))
        report = self.action('zhenti_report')
        self.assertEqual((report['answered'], report['qualitative'], report['scored']), (1, 1, 0))
        self.assertIsNone(report['accuracy'])

    def test_quiz_failure_and_old_schema_do_not_create_fake_active_round(self):
        with patch('tutor.zhenti.build_seed', side_effect=ValueError('不能加载')):
            with self.assertRaises(ValueError):
                self.action('zhenti_start_quiz', paper_id=900001)
        self.assertFalse(zhenti.state()['active'])
        storage.set_value('zhenti_quiz_active', {'quiz_id': 'old', 'items': ['zhenti:900001:501'], 'index': 0})
        self.assertTrue(zhenti.state()['invalidated'])
        self.assertFalse(zhenti.state()['active'])
        with self.assertRaises(ValueError):
            zhenti.report()

    def test_commit_does_not_advance_when_exercise_creation_fails(self):
        self.action('zhenti_start_quiz', paper_id=900001)
        before = zhenti.state()
        with patch('tutor.controller._insert_exercise', side_effect=ValueError('创建失败')):
            with self.assertRaises(ValueError):
                self.action('zhenti_next')
        self.assertEqual(zhenti.state(), before)

    def test_failed_binding_rolls_back_exercise_and_current_pointer(self):
        self.action('zhenti_start_quiz', paper_id=900001)
        before = zhenti.state()
        current = storage.get_value('current_exercise')
        with storage.connect() as con:
            count = con.execute('SELECT COUNT(*) FROM exercises').fetchone()[0]
        for function, action in [('activate_quiz', 'zhenti_start_quiz'), ('commit_quiz_step', 'zhenti_next')]:
            with patch('tutor.zhenti.' + function, side_effect=ValueError('绑定失败')):
                with self.assertRaises(ValueError):
                    self.action(action, **({'paper_id': 900001} if action == 'zhenti_start_quiz' else {}))
            self.assertEqual(storage.get_value('current_exercise'), current)
            self.assertEqual(zhenti.state(), before)
            with storage.connect() as con:
                self.assertEqual(con.execute('SELECT COUNT(*) FROM exercises').fetchone()[0], count)

    def test_concurrent_next_rolls_back_losing_request_completely(self):
        self.action('zhenti_start_quiz', paper_id=900001)
        original = zhenti.next_quiz_plan
        barrier = threading.Barrier(2)
        def plan():
            result = original()
            barrier.wait(timeout=10)
            return result
        def advance(_):
            try:
                self.action('zhenti_next')
                return 'success'
            except ValueError:
                return 'conflict'
        with patch('tutor.zhenti.next_quiz_plan', side_effect=plan):
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(advance, range(2)))
        self.assertCountEqual(results, ['success', 'conflict'])
        state = zhenti.state()
        self.assertEqual(state['index'], 1)
        self.assertEqual(storage.get_value('current_exercise'), state['current_exercise_id'])
        with storage.connect() as con:
            self.assertEqual(con.execute('SELECT COUNT(*) FROM exercises').fetchone()[0], 2)

    def test_rich_images_preserved_and_unsafe_urls_remain_blocked(self):
        from tutor.rich_content import html_to_blocks, analyze_blocks
        data = self.root / 'ws' / '粉笔试卷' / '答案解析' / '行测' / '真题卷' / '2024行测样卷.解析.json'
        solution = json.loads(data.read_text(encoding='utf-8'))
        solution['solutions'][0]['content'] = '<p>观察图形</p><img src="https://fb.fbstatic.cn/test/stem.png">'
        _write_json(data, solution)
        path = self.root / 'ws' / '粉笔试卷' / '题目选项' / '900001.json'
        options = json.loads(path.read_text(encoding='utf-8'))
        options['questions'][0]['options'] = [f'<img src="https://fb.fenbike.cn/test/{i}.png">' for i in range(4)]
        options['questions'][0]['material'] = {'content': '<img src="https://fb.fbstatic.cn/chart.png">'}
        _write_json(path, options)
        question, sources = zhenti.build_seed('zhenti:900001:501')
        self.assertTrue(question['visual_required'])
        self.assertTrue(question['visual_supported'])
        self.assertEqual(question['options'][0]['text'], '')
        self.assertEqual(question['options'][0]['blocks'][0]['type'], 'image')
        self.assertEqual(sources[0]['text'], '')
        self.assertTrue(sources[0]['blocks'])
        self.assertEqual(sources[0]['content_role'], 'student_material')
        self.assertEqual(question['student_material_ids'], ['P1'])
        relative = analyze_blocks(html_to_blocks('<img src="//fb.fbstatic.cn/chart.png">'))
        self.assertTrue(relative['visual_supported'])
        self.assertEqual(relative['blocks'][0]['url'], 'https://fb.fbstatic.cn/chart.png')
        for url in ('http://fb.fbstatic.cn/a.png', 'https://fb.fbstatic.cn.evil/a.png', 'file:///a.png', 'https://127.0.0.1/a.png', 'https://u:p@fb.fbstatic.cn/a.png'):
            visual = analyze_blocks(html_to_blocks(f'<img src="{url}">'))
            self.assertTrue(visual['visual_required'])
            self.assertFalse(visual['visual_supported'])
            self.assertEqual(visual['blocks'][0]['url'], '')

    def test_index_traversal_is_rejected_and_cannot_read_outside_workspace(self):
        index = zhenti.build_index()
        index['papers'][0]['name'] = '../../private'
        _write_json(zhenti._index_path(), index)
        with self.assertRaises(ValueError):
            zhenti.papers()
        with self.assertRaises(ValueError):
            zhenti._options_path('../../private')


if __name__ == '__main__':
    unittest.main()
