"""Durable workflow invariants; every test uses an isolated temporary SQLite DB."""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from tutor import controller as tutor, storage


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='gongkao-workflow-')
        self.path = Path(self.tmp.name) / 'test.sqlite3'
        self.patcher = patch.object(storage, 'DB_PATH', self.path)
        self.patcher.start()
        self.seed = next(s for s in tutor.seeds() if s['question']['question_type'] == 'short_answer')

    def tearDown(self):
        self.patcher.stop()
        self.tmp.cleanup()

    def start(self):
        return tutor.start_practice(self.seed['question']['id'])

    def submit(self, ex, sid='submission-1'):
        return tutor.submit_answer(ex['id'], '精简表单，共享信息，上门服务。', sid, tutor.get_exercise(ex['id'])['version'])

    def feedback(self, ex):
        q = tutor.get_exercise(ex['id'])['question']
        return {'criteria': [{'name': r['name'], 'awarded': r['points'], 'feedback': '对应材料事实',
                              'evidence_ids': r['evidence_ids'], 'student_span': '精简表单'} for r in q['rubric']],
                'strengths': ['覆盖材料'], 'omissions': [], 'unsupported_claims': [],
                'organization_feedback': '按事项组织', 'improved_answer': q['reference_answer'],
                'next_skill': q['skill'], 'next_exercise_instruction': '换一道同类新题独立完成'}

    def test_duplicate_submission_is_idempotent_even_after_version_changes(self):
        ex = self.start()
        first = self.submit(ex)
        repeat = tutor.submit_answer(ex['id'], '精简表单，共享信息，上门服务。', 'submission-1', 0)
        self.assertEqual(first['attempt_id'], repeat['attempt_id'])
        self.assertEqual(len(tutor.attempts_for(ex['id'])), 1)
        with self.assertRaises(ValueError):
            tutor.submit_answer(ex['id'], '另一个答案', 'submission-1', 0)

    def test_stale_version_rejected_without_creating_attempt(self):
        ex = self.start()
        with self.assertRaises(ValueError):
            tutor.submit_answer(ex['id'], '作答', 'stale', 99)
        self.assertEqual(tutor.attempts_for(ex['id']), [])

    def test_student_start_and_overview_do_not_leak_teacher_answers(self):
        ex = self.start()
        for shown in [ex, tutor.overview()['current_exercise']]:
            for hidden in ['reference_answer', 'correct_option_id', 'explanation', 'rubric', 'hint']:
                self.assertNotIn(hidden, shown['question'])
            self.assertNotIn('sources', shown)
        self.assertIn('rubric', tutor.get_context(ex['id'])['exercise']['question'])

    def test_hint_and_answer_reveal_do_not_count_as_independent_success(self):
        for index, kind in enumerate(['hint', 'answer']):
            ex = self.start()
            tutor.reveal(ex['id'], kind)
            attempt = self.submit(ex, 'assisted-' + str(index))
            tutor.apply_feedback(attempt['attempt_id'], self.feedback(ex))
            self.assertEqual(tutor.attempts_for(ex['id'])[0]['assisted'], 1)
            review = next(r for r in tutor.overview()['reviews'] if r['seed_id'] == self.seed['question']['id'])
            self.assertEqual(review['successes'], 0)

    def test_invalid_feedback_preserves_pending_without_zero_score(self):
        ex = self.start()
        attempt = self.submit(ex)
        invalid = self.feedback(ex)
        invalid['criteria'] = []
        with self.assertRaises(ValueError):
            tutor.apply_feedback(attempt['attempt_id'], invalid)
        saved = tutor.attempts_for(ex['id'])[0]
        self.assertEqual(saved['status'], 'pending')
        self.assertIsNone(saved['feedback'])
        self.assertIsNone(storage.get_attempts()[0]['score'])
        self.assertEqual(tutor.overview()['reviews'], [])

    def test_new_process_recovers_current_question_and_attempt(self):
        ex = self.start()
        attempt = self.submit(ex)
        process = subprocess.run([sys.executable, '-X', 'utf8', str(storage.PROJECT_ROOT / 'bridge.py')],
                                 input=json.dumps({'action': 'get_context', 'payload': {}}),
                                 text=True, encoding='utf-8', capture_output=True,
                                 env={**os.environ, 'TUTOR_DB_PATH': str(self.path)}, check=True)
        response = json.loads(process.stdout)
        self.assertTrue(response['ok'], response)
        self.assertEqual(response['data']['exercise']['id'], ex['id'])
        self.assertEqual(response['data']['attempts'][0]['id'], attempt['attempt_id'])

    def test_different_exercises_keep_attempts_and_versions_separate(self):
        first, second = self.start(), self.start()
        self.submit(first)
        self.assertEqual(len(tutor.get_context(first['id'])['attempts']), 1)
        self.assertEqual(tutor.get_context(second['id'])['attempts'], [])
        self.assertEqual(tutor.get_exercise(second['id'])['version'], 0)
        with self.assertRaises(ValueError):
            self.submit(second)

    def test_concurrent_duplicate_submission_commits_once(self):
        ex = self.start()
        def submit(_):
            return tutor.submit_answer(ex['id'], '并发答案', 'same-concurrent-id', 0)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            outcomes = list(executor.map(submit, range(2)))
        self.assertEqual(outcomes[0]['attempt_id'], outcomes[1]['attempt_id'])
        self.assertEqual(len(tutor.attempts_for(ex['id'])), 1)


if __name__ == '__main__':
    unittest.main()
