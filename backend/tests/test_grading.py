from unittest import TestCase
from unittest.mock import patch
from tutor.llm import grade_answer, validate_feedback


class GradingTest(TestCase):
    def test_score_is_derived_from_frozen_rubric(self):
        q = {
            "stem": "提炼问题", "material": "资料", "reference_answer": "示范",
            "word_limit": 60, "difficulty": "提高",
            "rubric": [
                {"name": "信息覆盖", "points": 6, "requirement": "覆盖事实", "evidence_ids": ["S1"]},
                {"name": "表达", "points": 4, "requirement": "准确", "evidence_ids": ["S1"]},
            ]
        }
        model_out = {
            "criteria": [{"name": "信息覆盖", "awarded": 9, "feedback": "基本正确", "evidence_ids": ["S1"], "student_span": "答案"},
                         {"name": "表达", "awarded": 2.2, "feedback": "部分", "evidence_ids": ["S1"], "student_span": "答案"}],
            "strengths": [], "omissions": [], "unsupported_claims": [],
            "organization_feedback": "良好", "improved_answer": "示范", "next_skill": "提取证据",
            "next_exercise_instruction": "再练一题",
        }
        with patch("tutor.llm.call_ollama", return_value=model_out):
            got = grade_answer("test", q, "答案", [{"id": "S1", "title": "测试", "locator": "正文", "url": "", "kind": "local", "text": "用于验证成绩汇总的材料文本"}])
        self.assertEqual(got["score"], 8.0)
        self.assertEqual(got["max_score"], 10)
        self.assertEqual(got["criteria"][0]["awarded"], 6)
        self.assertEqual(got["criteria"][1]["awarded"], 2.0)

    def test_missing_duplicate_extra_and_invalid_citations_fail(self):
        q = {"difficulty": "基础", "material": "事实", "stem": "概括", "word_limit": 60,
             "reference_answer": "事实", "rubric": [{"name": "事实", "requirement": "概括事实", "points": 10, "evidence_ids": ["P1"]}]}
        base = {"criteria": [{"name": "事实", "awarded": 5, "feedback": "修改", "evidence_ids": ["P1"], "student_span": "我的答案"}], "strengths": [],
                "omissions": [], "unsupported_claims": [], "organization_feedback": "", "improved_answer": "事实",
                "next_skill": "提炼", "next_exercise_instruction": "换材料"}
        sources = [{"id": "P1"}]
        bad_criteria = [[], base['criteria'] * 2,
                        [{"name": "额外", "awarded": 5, "feedback": ""}],
                        [{**base['criteria'][0], "evidence_ids": ["不存在"]}],
                        [{**base['criteria'][0], "student_span": "答案中没有的句子"}]]
        for criteria in bad_criteria:
            with self.subTest(criteria=criteria), self.assertRaises(ValueError):
                validate_feedback(q, "我的答案", sources, {**base, "criteria": criteria})

    def test_overlength_feedback_validation_is_idempotent(self):
        q = {"difficulty": "基础", "material": "事实", "stem": "概括", "word_limit": 2,
             "reference_answer": "事实", "rubric": [{"name": "事实", "requirement": "概括事实", "points": 10, "evidence_ids": ["P1"]}]}
        feedback = {"criteria": [{"name": "事实", "awarded": 5, "feedback": "修改", "evidence_ids": ["P1"], "student_span": "我的长答案"}], "strengths": [],
                    "omissions": [], "unsupported_claims": [], "organization_feedback": "压缩重复内容",
                    "improved_answer": "事实", "next_skill": "压缩", "next_exercise_instruction": "删重复"}
        first = validate_feedback(q, "我的长答案", [{"id": "P1"}], feedback)
        second = validate_feedback(q, "我的长答案", [{"id": "P1"}], first)
        self.assertEqual(first, second)
        self.assertTrue(first["over_word_limit"])
        self.assertEqual(first["organization_feedback"].count("答案超出字数限制"), 1)
