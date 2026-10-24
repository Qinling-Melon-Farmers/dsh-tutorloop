"""Headless public actions: temporary workspace/DB, mocked network only."""
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from bridge import dispatch
from tutor import controller, materials, storage
from tutor.profiles import default_profile


class BridgeActionsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.workspace = self.root / 'workspace'
        self.workspace.mkdir()
        db_patch = patch.object(storage, 'DB_PATH', self.root / 'isolated.sqlite3')
        db_patch.start()
        self.addCleanup(db_patch.stop)
        env_patch = patch.dict(os.environ, {'TUTOR_WORKSPACE_PATH': str(self.workspace)})
        env_patch.start()
        self.addCleanup(env_patch.stop)

    def action(self, action, **payload):
        return dispatch({'action': action, 'payload': payload})

    def test_generic_default_and_saved_private_profile_preserved(self):
        profile = self.action('overview')['learning_profile']
        self.assertEqual(profile['id'], 'generic_unconfigured')
        self.assertNotIn('做过', profile['baseline'])
        self.assertNotEqual(profile['daily_minutes'], 300)
        archived = {'id': 'custom_old', 'name': '旧档案', 'goal': '旧目标', 'daily_minutes': 95, 'baseline': '用户已保存基础', 'subjects': ['英语']}
        storage.set_value('learning_profile', archived)
        self.assertEqual(self.action('overview')['learning_profile'], archived)
        self.assertEqual(self.action('student_state')['learning_profile'], archived)

    def test_set_profile_validates_and_explicit_exam_preset(self):
        result = self.action('set_profile', name='英语', goal='长句阅读', daily_minutes=45, baseline='刚开始', subjects=['阅读'])
        self.assertEqual(result['learning_profile']['subjects'], ['阅读'])
        self.assertEqual(controller.learning_profile()['baseline'], '刚开始')
        preset = self.action('set_profile', preset='gongkao')['learning_profile']
        self.assertEqual(preset['id'], 'gongkao')
        self.assertEqual(preset['baseline'], default_profile()['baseline'])
        for payload in ({'name': None, 'goal': '目标', 'daily_minutes': 40}, {'name': '学习', 'goal': '目标', 'daily_minutes': True}):
            with self.assertRaises(ValueError):
                self.action('set_profile', **payload)
        self.assertEqual(controller.learning_profile(), preset)

    def test_import_exact_file_preserves_source_and_deduplicates(self):
        path = self.workspace / 'notes.md'
        text = '可追溯的学习资料与原文证据。' * 40
        path.write_text(text, encoding='utf-8')
        first = self.action('import_file', path='notes.md')
        self.assertGreater(first['added_chunks'], 0)
        self.assertEqual(first['documents'][0]['filename'], 'notes.md')
        self.assertIn('file_sha256', storage.get_chunks()[0])
        self.assertIn('原文证据', storage.get_chunks()[0]['text'])
        second = self.action('import_file', path=str(path))
        self.assertEqual(second['added_chunks'], 0)
        self.assertEqual(len(second['skipped']), 1)

    def test_configured_workspace_alias_accepts_its_own_absolute_child(self):
        source = self.workspace / 'aliases.md'
        source.write_text('An imported source must retain its verified workspace boundary. ' * 10, encoding='utf-8')
        alias = self.root / 'workspace-alias'
        original_resolve = Path.resolve
        # Model the alternate spelling returned by Windows TEMP (RUNNER~1)
        # without depending on that volume having 8.3 name creation enabled.
        def resolve(path, **kwargs):
            if path == alias:
                return original_resolve(self.workspace, **kwargs)
            if path == alias / source.name:
                return original_resolve(source, **kwargs)
            return original_resolve(path, **kwargs)
        with patch.dict(os.environ, {'TUTOR_WORKSPACE_PATH': str(alias)}), patch('tutor.materials.Path.resolve', autospec=True, side_effect=resolve):
            result = self.action('import_file', path=str(alias / source.name))
        self.assertGreater(result['added_chunks'], 0)

    def test_missing_workspace_and_path_escape_rejected_without_reading(self):
        outside = self.root / 'private.txt'
        outside.write_text('private', encoding='utf-8')
        with self.assertRaises(ValueError):
            self.action('import_file', path='../private.txt')
        with self.assertRaises(ValueError):
            self.action('import_file', path=str(outside))
        with patch.dict(os.environ, {'TUTOR_WORKSPACE_PATH': ''}):
            with self.assertRaises(ValueError):
                self.action('import_file', path='private.txt')
        self.assertEqual(storage.count_chunks(), 0)

    def test_symbolic_link_escape_rejected(self):
        outside = self.root / 'private.txt'
        outside.write_text('private', encoding='utf-8')
        link = self.workspace / 'link.txt'
        try:
            link.symlink_to(outside)
        except OSError:
            # Windows may deny creating test symlinks. Exercise the same
            # resolved-path boundary without requiring elevated privileges.
            original_resolve = Path.resolve
            def resolve(path, **kwargs):
                return outside if path == link else original_resolve(path, **kwargs)
            with patch('tutor.materials.Path.resolve', autospec=True, side_effect=resolve):
                with self.assertRaises(ValueError):
                    self.action('import_file', path='link.txt')
            return
        with self.assertRaises(ValueError):
            self.action('import_file', path='link.txt')

    def test_pdf_import_uses_page_metadata_not_answer_cards(self):
        path = self.workspace / '2026年行测网友回忆版.pdf'
        path.write_bytes(b'%PDF-test')
        fake = SimpleNamespace(is_encrypted=False, pages=[SimpleNamespace(extract_text=lambda: '题面正文须结合原页核对图形。' * 40, images=[])])
        with patch('pypdf.PdfReader', return_value=fake):
            result = self.action('import_file', path=path.name)
        self.assertGreater(result['added_chunks'], 0)
        source = storage.get_chunks()[0]
        self.assertEqual(source['pdf_page'], 1)
        self.assertEqual(source['paper_type'], 'recalled_exam')
        self.assertTrue(source['needs_visual_review'])
        self.assertIsNone(self.action('overview')['current_exercise'])

    def test_folder_import_supported_files_and_ignores_partial_download(self):
        (self.workspace / 'a.txt').write_text('正确导入资料原文。' * 20, encoding='utf-8')
        (self.workspace / 'b.md').write_text('另一份可用资料。' * 20, encoding='utf-8')
        (self.workspace / 'unfinished.pdf.part').write_bytes(b'partial')
        first = self.action('import_folder', path='.')
        self.assertEqual(len(first['documents']), 2)
        self.assertFalse(first['errors'])
        repeat = self.action('import_folder', path='.')
        self.assertEqual(repeat['added_chunks'], 0)
        self.assertEqual(len(repeat['skipped']), 2)

    def test_search_persists_snippet_and_marks_summary_without_inventing_fulltext(self):
        snippet = {'id': 'Sweb', 'title': '结果', 'locator': '搜索摘要', 'url': 'https://example.com/a', 'kind': 'web_snippet_only', 'text': '搜索服务返回的摘要。' * 8, 'fetched_at': '2026-01-01T00:00:00Z'}
        with patch('tutor.retrieval.search_web', return_value=([snippet], ['仅搜索摘要'])) as search:
            result = self.action('search_materials', query='学习资料', limit=2)
        search.assert_called_once_with('学习资料', 2)
        self.assertEqual(result['added_chunks'], 1)
        self.assertEqual(result['sources'][0]['content_scope'], 'search_snippet')
        self.assertFalse(result['sources'][0]['is_fulltext'])
        self.assertNotIn('text', result['sources'][0])
        self.assertEqual(storage.get_chunks()[0]['text'], snippet['text'])
        self.assertEqual(result['statuses'], ['仅搜索摘要'])
        with self.assertRaises(ValueError):
            self.action('search_materials', query='test', limit=4)

    def test_fetch_persists_fulltext_and_failure_stays_explicit(self):
        page = {'id': 'Sfull', 'title': '正文', 'locator': '网页正文', 'url': 'https://example.com/a', 'kind': 'web_fulltext', 'text': '网页可见正文。' * 20}
        with patch('tutor.retrieval.fetch_url', return_value=([page], ['已读取可见文本'])):
            result = self.action('fetch_material', url='https://example.com/a')
        self.assertEqual(result['sources'][0]['content_scope'], 'web_fulltext')
        self.assertTrue(result['sources'][0]['is_fulltext'])
        with patch('tutor.retrieval.fetch_url', return_value=([], ['网页获取失败'])):
            failed = self.action('fetch_material', url='https://example.com/b')
        self.assertEqual(failed['added_chunks'], 0)
        self.assertEqual(failed['sources'], [])
        self.assertEqual(failed['statuses'], ['网页获取失败'])

    def test_public_state_hides_teacher_fields_but_allows_real_feedback(self):
        seed = next(row for row in controller.seeds() if row['question']['question_type'] == 'single_choice')
        ex = self.action('start_practice', seed_id=seed['question']['id'])
        state = self.action('student_state', exercise_id=ex['id'])
        for field in ('reference_answer', 'correct_option_id', 'rubric', 'hint', 'explanation'):
            self.assertNotIn(field, state['exercise']['question'])
        self.assertNotIn('sources', state['exercise'])
        # 卷面视图：学生可见材料原文与出处，但看不到教师参考。
        materials = state['exercise']['materials']
        self.assertTrue(materials)
        self.assertEqual(materials[0]['text'], seed['sources'][0]['text'])
        for material in materials:
            self.assertNotIn('reference_answer', material)
        result = self.action('submit_answer', exercise_id=ex['id'], answer=seed['question']['correct_option_id'], submission_id='one', expected_version=ex['version'])
        self.assertEqual(result['status'], 'graded')
        self.assertTrue(self.action('student_state', exercise_id=ex['id'])['attempts'][0]['feedback'])
        self.assertIn('rubric', self.action('get_context', exercise_id=ex['id'])['exercise']['question'])

    def test_method_cards_and_request_shapes(self):
        self.assertEqual(len(self.action('method_cards')['cards']), 8)
        for request in ([], {'action': 'overview', 'payload': []}, {'action': 'unknown'}):
            with self.assertRaises(ValueError):
                dispatch(request)


if __name__ == '__main__':
    unittest.main()
