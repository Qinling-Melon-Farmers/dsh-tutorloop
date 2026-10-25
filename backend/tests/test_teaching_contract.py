"""Teaching guarantees: isolated DBs, synthetic sources, no model requests."""
import copy
from concurrent.futures import ThreadPoolExecutor
import json
import os
import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch
from tutor import controller as c, storage as db
from tutor import materials
from tutor.llm import validate_feedback


class TeachingContractTest(TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        patched = patch.object(db, 'DB_PATH', Path(self.tmp.name) / '.dsh-tutorloop' / 'tutor.sqlite3')
        patched.start(); self.addCleanup(patched.stop)
        c.set_profile(name='English reading', goal='Explain cause and effect', daily_minutes=30, subjects=['English'])
        self.sources = [dict(id='P1', title='Student passage', text='No water makes a plant wilt.', kind='local', content_role='student_material'),
                        dict(id='T1', title='Teacher reference', text='TEACHER_ONLY_SENTINEL evaporation', kind='local', content_role='institution_explanation_unverified')]
        db.add_chunks(self.sources)
        self.q = dict(difficulty='基础', material='No water makes a plant wilt.', stem='Why does it wilt?',
                      word_limit=30, reference_answer='No water.', student_material_ids=['P1'],
                      rubric=[dict(name='Cause', requirement='Identify lack of water', points=10, evidence_ids=['P1'])])

    def feedback(self, name='Cause', answer='No water.'):
        return dict(criteria=[dict(name=name, awarded=10, feedback='Identifies the stated cause.', evidence_ids=['P1'], student_span=answer)],
                    strengths=['Identified cause'], omissions=[], unsupported_claims=[], organization_feedback='',
                    improved_answer='No water.', next_skill='Cause and effect', next_exercise_instruction='Try a new passage.')

    def create(self, **overrides):
        return c.create_practice({**self.q, **overrides}, ['P1', 'T1'], mode='exam')

    def write_pdf(self, path, text):
        from pypdf import PdfWriter
        from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
        writer = PdfWriter(); page = writer.add_blank_page(width=600, height=800)
        font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
        page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): writer._add_object(font)})})
        stream = DecodedStreamObject(); stream.set_data(b'BT /F1 12 Tf 40 700 Td (' + text.encode('ascii') + b') Tj ET')
        page[NameObject('/Contents')] = writer._add_object(stream)
        with path.open('wb') as output: writer.write(output)

    def test_teacher_reference_hidden_in_create_restart_and_public_state(self):
        ex = self.create(reference_blocks=[{'type': 'text', 'text': 'TEACHER_ONLY_SENTINEL'}])
        ex = c.start_practice(ex['seed_id'], mode='exam')
        for state in (ex, c.student_state(ex['id'])['exercise'], c.overview()['current_exercise']):
            self.assertNotIn('TEACHER_ONLY_SENTINEL', json.dumps(state))
            self.assertEqual([s['id'] for s in state['materials']], ['P1'])
            self.assertEqual(state['materials'][0]['content_role'], 'student_material')
        self.assertEqual(len(c.get_context(ex['id'])['exercise']['sources']), 2)
        with self.assertRaises(ValueError):
            self.create(student_material_ids=['T1'])

    def test_real_answer_pdf_import_cannot_be_published_as_student_material(self):
        path = Path(self.tmp.name) / '机构答案解析.pdf'
        self.write_pdf(path, 'TEACHER_ONLY_SENTINEL: evaporation.')
        with patch.dict(os.environ, {'TUTOR_WORKSPACE_PATH': self.tmp.name}):
            result = materials.import_file(str(path))
        self.assertEqual(result['added_chunks'], 1)
        imported = next(s for s in db.get_chunks() if s.get('original_filename') == path.name)
        self.assertIn('explanation', imported['content_role'])
        sources = ['P1', imported['id']]
        ex = c.create_practice(self.q, sources, mode='exam')
        ex = c.start_practice(ex['seed_id'], mode='exam')
        self.assertNotIn('TEACHER_ONLY_SENTINEL', json.dumps(c.student_state(ex['id'])))
        self.assertIn('TEACHER_ONLY_SENTINEL', json.dumps(c.get_context(ex['id'])))
        with self.assertRaises(ValueError):
            c.create_practice({**self.q, 'student_material_ids': [imported['id']]}, sources)

    def test_legacy_snapshot_keeps_question_text_but_never_publishes_unknown_sources(self):
        ex = self.create()
        legacy = {k: v for k, v in self.q.items() if k != 'student_material_ids'}
        with db.connect() as con:
            con.execute('UPDATE exercises SET question=? WHERE id=?', (db.dumps(legacy), ex['id']))
        public = c.student_state(ex['id'])['exercise']
        self.assertEqual(public['question']['material'], self.q['material'])
        self.assertEqual(public['materials'], [])
        self.assertEqual(c.get_exercise(ex['id'])['question'], legacy)

    def test_uncalibrated_feedback_is_qualitative_and_does_not_create_review(self):
        ex = self.create(rubric_status='uncalibrated')
        pending = c.submit_answer(ex['id'], 'No water.', 'qualitative', ex['version'])
        result = c.apply_feedback(pending['attempt_id'], self.feedback())
        self.assertEqual(result['grading_status'], 'qualitative')
        self.assertIsNone(result['score']); self.assertIsNone(result['max_score'])
        self.assertIsNone(result['criteria'][0]['awarded'])
        self.assertEqual(c.overview()['reviews'], [])
        self.assertEqual(c.apply_feedback(pending['attempt_id'], result), result)

    def test_prepare_rubric_freezes_before_answers_and_enforces_version(self):
        ex = self.create(rubric_status='uncalibrated')
        ready = c.prepare_rubric(ex['id'], self.q['rubric'], ex['version'])['exercise']
        self.assertEqual(ready['question']['rubric_status'], 'ready')
        self.assertEqual(ready['version'], ex['version'] + 1)
        with self.assertRaises(ValueError):
            c.submit_answer(ex['id'], 'No water.', 'stale', ex['version'])
        pending = c.submit_answer(ex['id'], 'No water.', 'ready-answer', ready['version'])
        with self.assertRaises(ValueError):
            c.prepare_rubric(ex['id'], self.q['rubric'], c.get_exercise(ex['id'])['version'])
        self.assertEqual(c.apply_feedback(pending['attempt_id'], self.feedback())['score'], 10)

    def test_pending_uncalibrated_cannot_be_calibrated_after_reading_answer(self):
        ex = self.create(rubric_status='uncalibrated')
        c.submit_answer(ex['id'], 'No water.', 'pending', ex['version'])
        with self.assertRaises(ValueError):
            c.prepare_rubric(ex['id'], self.q['rubric'], c.get_exercise(ex['id'])['version'])
        self.assertEqual(c.get_exercise(ex['id'])['question']['rubric_status'], 'uncalibrated')

    def test_prepare_and_first_answer_cannot_both_win_same_version_race(self):
        ex = self.create(rubric_status='uncalibrated')
        def compete(action):
            try:
                if action == 'prepare': c.prepare_rubric(ex['id'], self.q['rubric'], ex['version'])
                else: c.submit_answer(ex['id'], 'No water.', 'racing-answer', ex['version'])
                return action
            except ValueError:
                return 'rejected'
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(compete, ['prepare', 'submit']))
        self.assertEqual(results.count('rejected'), 1)
        question = c.get_exercise(ex['id'])['question']
        self.assertFalse(question['rubric_status'] == 'ready' and c.attempts_for(ex['id']))

    def test_new_feedback_requires_both_evidence_and_student_quote(self):
        for field in ('evidence_ids', 'student_span'):
            feedback = self.feedback(); feedback['criteria'][0].pop(field)
            with self.subTest(field=field), self.assertRaises(ValueError):
                validate_feedback(self.q, 'No water.', self.sources, feedback)
        bad = self.feedback(answer='invented student words')
        with self.assertRaises(ValueError): validate_feedback(self.q, 'No water.', self.sources, bad)

    def test_generic_defaults_come_from_profile_and_english_words_are_counted(self):
        ex = self.create(length_unit='words', word_limit=5)
        q = c.get_exercise(ex['id'])['question']
        self.assertEqual(q['subject'], 'English')
        self.assertEqual(q['skill'], 'Explain cause and effect')
        answer = "I don't know state-of-the-art syntax."
        result = validate_feedback(q, answer, self.sources, self.feedback(answer=answer))
        self.assertEqual(result['answer_length'], 5)
        self.assertFalse(result['over_word_limit'])

    def test_required_image_cannot_submit_without_real_confirmation(self):
        ex = self.create(stem_blocks=[{'type': 'image', 'url': 'https://fb.fbstatic.cn/images/figure.png', 'alt': 'Diagram'}])
        self.assertTrue(ex['question']['visual_required'])
        with self.assertRaises(ValueError): c.submit_answer(ex['id'], 'No water.', 'no-image-confirm', ex['version'])
        self.assertEqual(c.attempts_for(ex['id']), [])
        self.assertEqual(c.submit_answer(ex['id'], 'No water.', 'image-confirm', ex['version'], visual_confirmed=True)['status'], 'pending')
        bad = self.create(stem_blocks=[{'type': 'image', 'url': 'https://untrusted.test/figure.png'}])
        self.assertFalse(bad['question']['visual_supported'])
        with self.assertRaises(ValueError): c.submit_answer(bad['id'], 'No water.', 'unsupported', bad['version'], visual_confirmed=True)

    def test_old_graded_history_is_not_revalidated_or_rewritten(self):
        ex = self.create(); pending = c.submit_answer(ex['id'], 'No water.', 'legacy', ex['version'])
        old = {'score': 7, 'max_score': 10, 'criteria': [{'name': 'old criterion', 'awarded': 7, 'feedback': 'legacy'}]}
        with db.connect() as con:
            con.execute("UPDATE tutor_attempts SET status='graded',feedback=? WHERE id=?", (db.dumps(old), pending['attempt_id']))
        self.assertEqual(c.apply_feedback(pending['attempt_id'], copy.deepcopy(old)), old)
        self.assertEqual(c.attempts_for(ex['id'])[0]['feedback'], old)

    def test_legacy_raw_image_snapshot_cannot_be_newly_scored_as_plain_text(self):
        ex = self.create()
        old = {**self.q, 'stem': '<img src="https://fb.fbstatic.cn/old.png">'}
        with db.connect() as con:
            con.execute('UPDATE exercises SET question=? WHERE id=?', (db.dumps(old), ex['id']))
        with self.assertRaises(ValueError):
            c.submit_answer(ex['id'], 'No water.', 'old-image', ex['version'], visual_confirmed=True)
        self.assertEqual(c.attempts_for(ex['id']), [])

    def test_pdf_visual_review_is_advisory_but_missing_images_are_not(self):
        path = Path(self.tmp.name) / 'lesson.pdf'
        self.write_pdf(path, 'No water makes a plant wilt. ' * 4)
        with patch.dict(os.environ, {'TUTOR_WORKSPACE_PATH': self.tmp.name}):
            materials.import_file(str(path))
        plain = next(s for s in db.get_chunks() if s.get('original_filename') == path.name)
        self.assertTrue(plain['needs_visual_review'])
        question = {**self.q, 'student_material_ids': [plain['id']],
                    'rubric': [{**self.q['rubric'][0], 'evidence_ids': [plain['id']]}]}
        ex = c.create_practice(question, [plain['id']])
        self.assertFalse(ex['question']['visual_required'])
        c.submit_answer(ex['id'], 'No water.', 'plain-pdf', ex['version'])
        db.add_chunks([{**plain, 'image_count': 1}])
        missing = c.create_practice(question, [plain['id']])
        self.assertTrue(missing['question']['visual_required'])
        self.assertFalse(missing['question']['visual_supported'])
        with self.assertRaises(ValueError):
            c.submit_answer(missing['id'], 'No water.', 'missing-pdf-image', missing['version'], visual_confirmed=True)

    def test_teacher_material_role_cannot_be_overridden_by_default_content_role(self):
        db.add_chunks([{**self.sources[0], 'content_role': 'user_supplied_unverified', 'material_role': 'teacher_reference', 'text': 'TEACHER_ONLY_SENTINEL'}])
        with self.assertRaises(ValueError):
            self.create()
