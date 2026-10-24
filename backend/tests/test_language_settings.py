"""Language preferences are durable workspace settings, never learning-goal rewrites."""
import os
from pathlib import Path
import tempfile
from unittest import TestCase
from unittest.mock import patch
from tutor import controller, storage
from bridge import dispatch


class LanguageSettingsTest(TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        db_patch = patch.object(storage, 'DB_PATH', Path(self.temp.name) / 'test.sqlite3')
        db_patch.start()
        self.addCleanup(db_patch.stop)
        env_patch = patch.dict(os.environ, {'TUTORLOOP_LANGUAGE': 'zh'})
        env_patch.start()
        self.addCleanup(env_patch.stop)

    def test_default_chinese_and_independent_goal(self):
        profile = controller.learning_profile()
        self.assertEqual(controller.language_settings(), {'language': 'zh', 'resolved_language': 'zh'})
        self.assertIsNone(storage.get_value('language_settings'))
        controller.language_settings(language='en')
        self.assertEqual(controller.learning_profile(), profile)
        self.assertEqual(controller.overview()['language_settings']['resolved_language'], 'en')
        self.assertEqual(controller.student_state()['language_settings']['resolved_language'], 'en')

    def test_environment_defaults_and_persisted_override(self):
        with patch.dict(os.environ, {'TUTORLOOP_LANGUAGE': 'en'}):
            self.assertEqual(controller.language_settings()['language'], 'en')
            controller.language_settings(language='zh')
            self.assertEqual(controller.language_settings()['language'], 'zh')
        self.assertEqual(storage.get_value('language_settings')['language'], 'zh')

    def test_auto_resolves_from_ui_and_remains_durable(self):
        with patch.dict(os.environ, {'TUTORLOOP_LANGUAGE': 'auto'}):
            self.assertEqual(controller.language_settings(), {'language': 'auto', 'resolved_language': 'zh'})
        controller.language_settings(language='auto', resolved_language='en')
        self.assertEqual(dispatch({'action': 'language_settings', 'payload': {}}), {'language': 'auto', 'resolved_language': 'en'})
        self.assertEqual(controller.language_settings(resolved_language='zh'), {'language': 'auto', 'resolved_language': 'zh'})
        self.assertEqual(storage.get_value('language_settings'), {'language': 'auto', 'resolved_language': 'zh'})

    def test_invalid_values_do_not_change_saved_preferences(self):
        original = controller.language_settings(language='en')
        for payload in ({'language': 'fr'}, {'language': None}, {'language': True}, {'language': []},
                        {'resolved_language': 'auto'}, {'resolved_language': None},
                        {'language': 'zh', 'resolved_language': 'en'}, {'resolved_language': 'zh'}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                controller.language_settings(**payload)
            self.assertEqual(controller.language_settings(), original)
        with patch.dict(os.environ, {'TUTORLOOP_LANGUAGE': 'invalid'}), self.assertRaises(ValueError):
            controller.language_settings()

    def test_existing_exercise_frozen_data_is_unchanged_when_language_changes(self):
        seed = controller.seeds()[0]
        exercise = controller.start_practice(seed['question']['id'])
        before = controller.get_exercise(exercise['id'])
        controller.language_settings(language='en')
        context = controller.get_context(exercise['id'])
        self.assertEqual(context['language_settings'], {'language': 'en', 'resolved_language': 'en'})
        self.assertEqual(context['exercise']['question'], before['question'])
        self.assertEqual(context['learning_profile'], before['learning_profile'])
        self.assertEqual(controller.student_state(exercise['id'])['language_settings']['language'], 'en')
