"""Real-exam (真题) seed bank and quiz flow against a tiny synthetic workspace."""
import json
import os
from pathlib import Path
import tempfile
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


if __name__ == '__main__':
    unittest.main()
