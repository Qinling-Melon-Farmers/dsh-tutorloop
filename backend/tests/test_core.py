"""Minimal dependency-free checks for the chunker and schemas."""
import unittest
from tutor.ingestion import split_chunks
from tutor.schemas import Question


class TestCore(unittest.TestCase):
    def test_chunks_keep_source_locator(self):
        text = "这是一个用于解释历史经验复用的长示例。" * 80
        rows = split_chunks(text, "case.pdf", "第2页", size=120, overlap=20)
        self.assertGreater(len(rows), 1)
        self.assertEqual(len({row['id'] for row in rows}), len(rows))
        self.assertTrue(all(row['locator'].startswith("第2页") for row in rows))

    def test_question_schema(self):
        question = Question(difficulty="提高", material="事实材料", stem="归纳问题", word_limit=100,
                            reference_answer="参考", rubric=[
                                {"name": "问题", "requirement": "具体", "points": 5, "evidence_ids": ["S123"]},
                                {"name": "启示", "requirement": "准确", "points": 5, "evidence_ids": ["S123"]}], hint="阅读材料")
        self.assertEqual(sum(x.points for x in question.rubric), 10)


if __name__ == "__main__":
    unittest.main()
