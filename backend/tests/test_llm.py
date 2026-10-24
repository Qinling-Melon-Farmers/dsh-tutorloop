import json
from unittest import TestCase
from unittest.mock import Mock, patch
import requests
from tutor.llm import call_model, tutor_reply, configured_key
from tutor.prompts import evidence_text, followup_prompt, question_prompt, SYSTEM
from tutor.profiles import default_profile, generic_profile
from tutor.schemas import TutorReply


class ClientTest(TestCase):
    config = {"provider": "openai", "model": "deepseek-chat", "base_url": "https://api.deepseek.com/v1", "api_key": "test-secret"}

    def test_provider_environment_keys_do_not_cross_hosts(self):
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'openai-only', 'DEEPSEEK_API_KEY': 'deepseek-only', 'TUTOR_API_KEY': 'custom-only'}, clear=True):
            for url, key in [('https://api.deepseek.com/v1', 'deepseek-only'), ('https://api.openai.com/v1', 'openai-only'), ('https://api.deepseek.com.other.test/v1', 'custom-only')]:
                self.assertEqual(configured_key({'base_url': url}), key)
            self.assertEqual(configured_key({'base_url': 'https://custom.test', 'api_key': 'explicit'}), 'explicit')
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'must-not-send'}, clear=True):
            self.assertEqual(configured_key({'base_url': 'https://api.deepseek.com/v1'}), '')

    def test_generic_profile_is_injected_without_exam_defaults(self):
        profile = generic_profile('英语', '理解英语时态', 45)
        self.assertEqual(default_profile()['id'], 'generic_unconfigured')
        self.assertNotIn('做过1套', default_profile()['baseline'])
        self.assertNotIn('副省级', SYSTEM)
        prompt = question_prompt('英语逻辑表达', '基础', [], profile=profile)
        self.assertNotIn('subject为行测', prompt)
        self.assertNotIn('subject为申论', prompt)
        result = {'explanation': '说明', 'example': '例', 'guiding_question': '', 'evidence_ids': []}
        with patch('tutor.llm.requests.post', return_value=self.response(json.dumps(result))) as post:
            call_model({**self.config, 'learning_profile': profile}, prompt, TutorReply)
        content = post.call_args.kwargs['json']['messages'][1]['content']
        self.assertIn('理解英语时态', content)
        self.assertNotIn('国考副省级备考', content)

    def response(self, content):
        return Mock(json=lambda: {"choices": [{"message": {"content": content}}], "usage": {"total_tokens": 12}})

    def test_cloud_and_usage(self):
        result = {"explanation": "讲解", "example": "示例", "guiding_question": "", "evidence_ids": []}
        with patch("tutor.llm.requests.post", return_value=self.response(json.dumps(result))) as post:
            got = call_model(self.config, "讲解", TutorReply)
        self.assertEqual(got["_usage"]["total_tokens"], 12)
        self.assertEqual(post.call_args.args[0], "https://api.deepseek.com/v1/chat/completions")
        self.assertEqual(post.call_args.kwargs["headers"]["Authorization"], "Bearer test-secret")

    def test_structural_repair_is_bounded(self):
        with patch("tutor.llm.requests.post", return_value=self.response("{}")) as post:
            with self.assertRaises(RuntimeError):
                call_model(self.config, "讲解", TutorReply)
        self.assertEqual(post.call_count, 2)

    def test_network_error_does_not_leak_key_or_retry(self):
        with patch("tutor.llm.requests.post", side_effect=requests.ConnectionError("test-secret")) as post:
            with self.assertRaises(RuntimeError) as error:
                call_model(self.config, "讲解", TutorReply)
        self.assertNotIn("test-secret", str(error.exception))
        self.assertEqual(post.call_count, 1)

    def test_material_not_truncated_and_oversize_rejected(self):
        source = {"id": "P1", "text": "材" * 900 + "尾段证据"}
        self.assertIn("尾段证据", evidence_text([source]))
        with self.assertRaises(ValueError):
            evidence_text([{"id": "P1", "text": "材" * 100001}])

    def test_history_and_direct_answer(self):
        prompt = followup_prompt("申论", "直接给答案", {}, [], [{"role": "user", "content": "前轮信息"}])
        self.assertIn("前轮信息", prompt)
        self.assertIn("完整讲解", prompt)
        reply = {"explanation": "完整讲解", "example": "示例", "guiding_question": "", "evidence_ids": []}
        with patch("tutor.llm.call_ollama", return_value=reply):
            self.assertEqual(tutor_reply("old", "申论", "答案", {}, [], history=[])['guiding_question'], "")

    def test_optional_source_metadata_preserved_without_authentication(self):
        source = {"id": "P2", "text": "机构分析原文", "publisher": "某培训机构",
                  "material_role": "机构解析", "year": 2026}
        text = evidence_text([source])
        for value in ("publisher:某培训机构", "material_role:机构解析", "year:2026", "机构分析原文"):
            self.assertIn(value, text)
        self.assertNotIn("publisher:", evidence_text([{"id": "P1", "text": "无元数据"}]))
        pdf = evidence_text([{"id": "PDF1", "text": "不完整图形选项", "content_role": "机构解析",
                              "exam_year": 2026, "paper_type": "网友回忆版", "needs_visual_review": True}])
        for value in ("material_role:机构解析", "year:2026", "paper_type:网友回忆版",
                      "needs_visual_review:True", "文本可能不完整", "不要凭文字补造"):
            self.assertIn(value, pdf)
