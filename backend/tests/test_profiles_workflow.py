"""Profile migration and progress checks; never touch the user's teaching DB."""
import json
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
from unittest import TestCase
from unittest.mock import patch
from tutor import controller, storage
from tutor.profiles import generic_profile, default_profile
from tutor.schemas import Question


class ProfileWorkflowTest(TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'isolated.sqlite3'
        self.patcher = patch.object(storage, 'DB_PATH', self.path)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.profile = generic_profile('英语时态', '理解现在完成时', 40)
        storage.set_value('learning_profile', self.profile)
        self.sources = [{'id': 'P1', 'title': '自编英语材料', 'text': 'I have lived here for three years.', 'kind': 'synthetic_case'}]
        self.question = {'subject': '英语', 'skill': '时态解释', 'difficulty': '基础', 'material': '[P1] I have lived here for three years.',
                         'stem': '说明句中时态的作用', 'word_limit': 50, 'reference_answer': '强调过去开始且持续至今。',
                         'rubric': [{'name': '持续关系', 'requirement': '说明从过去持续至今', 'points': 10, 'evidence_ids': ['P1']}]}

    def complete(self, ex, sid, answer='从过去持续至今'):
        result = controller.submit_answer(ex['id'], answer, sid, controller.get_exercise(ex['id'])['version'])
        feedback = {'criteria': [{'name': '持续关系', 'awarded': 10, 'feedback': '正确指出持续关系', 'evidence_ids': ['P1'], 'student_span': answer}],
                    'strengths': ['指出持续至今'], 'omissions': [], 'unsupported_claims': [], 'organization_feedback': '',
                    'improved_answer': '从过去持续至今', 'next_skill': '时态解释', 'next_exercise_instruction': '换句验证'}
        return controller.apply_feedback(result['attempt_id'], feedback)

    def test_generic_question_json_and_profile_snapshot(self):
        restored = Question.model_validate_json(json.dumps(self.question)).model_dump()
        self.assertEqual(restored['subject'], '英语')
        ex = controller.create_exercise(restored, self.sources)
        storage.set_value('learning_profile', default_profile())
        self.assertEqual(controller.get_context(ex['id'])['learning_profile'], self.profile)
        self.assertEqual(controller.get_exercise(ex['id'])['question']['subject'], '英语')

    def test_memoir_uses_current_generic_profile(self):
        text = controller.export_memoir()['text']
        self.assertIn('理解现在完成时', text)
        self.assertIn('40分钟', text)
        self.assertNotIn('国考副省级', text)
        self.assertTrue(controller.export_memoir()['candidate_only'])

    def test_immediate_repeat_does_not_increase_success_or_delay_due(self):
        first = controller.create_exercise(self.question, self.sources, seed_id='generated:retention')
        self.complete(first, 'first')
        old = dict(controller.overview()['reviews'][0])
        second = controller.start_practice('generated:retention')
        self.complete(second, 'second')
        new = controller.overview()['reviews'][0]
        self.assertEqual(new['successes'], old['successes'])
        self.assertEqual(new['due_at'], old['due_at'])

    def test_overlength_full_score_does_not_advance(self):
        ex = controller.create_exercise(self.question, self.sources)
        result = self.complete(ex, 'too-long', '字' * 51)
        self.assertTrue(result['over_word_limit'])
        self.assertEqual(controller.overview()['reviews'][0]['successes'], 0)

    def test_old_exercise_table_migration_is_repeatable(self):
        # Isolate a genuinely old DB without the profile column.
        legacy = Path(self.temp.name) / 'old.sqlite3'
        with closing(sqlite3.connect(legacy)) as con:
            con.execute('CREATE TABLE exercises(id TEXT PRIMARY KEY, seed_id TEXT, topic TEXT, question TEXT, sources TEXT, mode TEXT, version INTEGER DEFAULT 0, hints_used INTEGER DEFAULT 0, answer_shown INTEGER DEFAULT 0, created_at TEXT)')
            con.execute('INSERT INTO exercises(id,question,sources) VALUES(?,?,?)', ('old', json.dumps(self.question), json.dumps(self.sources)))
            con.commit()
        with patch.object(storage, 'DB_PATH', legacy):
            for _ in range(2):
                ex = controller.get_exercise('old')
                self.assertEqual(ex['learning_profile']['id'], default_profile()['id'])
                self.assertEqual(ex['question']['subject'], '英语')
