import copy
import json
from pathlib import Path
import unittest

from tutor.studyhub_export import export_studyhub_deck, export_sources_markdown


QUESTION = {'stem': '概括问题', 'material': '某企业忽视质量导致投诉。', 'reference_answer': '质量管控不足。',
            'rubric': [{'name': '质量', 'points': 10, 'requirement': '指出管控不足'}], 'word_limit': 100,
            'sources': [{'id': 'Slocal', 'title': '自编材料', 'url': '', 'kind': 'local', 'text': '案例原文'}]}


class TestStudyHubExport(unittest.TestCase):
    def test_open_schema_complete_without_fake_citations(self):
        original = copy.deepcopy(QUESTION)
        deck = export_studyhub_deck([QUESTION], '概括训练')
        self.assertEqual(deck['title'], '概括训练')
        card = deck['cards'][0]
        for field in ('topic', 'objective', 'prompt', 'answer', 'hint', 'explanation', 'misconception', 'rubric'):
            self.assertIsInstance(card[field], str)
            self.assertTrue(card[field])
        self.assertEqual(card['kind'], 'open')
        self.assertIn('100字以内', card['prompt'])
        self.assertIn('非官方', card['explanation'])
        self.assertNotIn('citations', card)
        self.assertNotIn('sources', card)
        self.assertEqual(QUESTION, original)
        json.dumps(deck, ensure_ascii=False)

    def test_practice_record_wrapper(self):
        self.assertEqual(export_studyhub_deck([{'question': QUESTION, 'score': 9}], '记录')['cards'][0]['answer'], QUESTION['reference_answer'])
        q = dict(QUESTION, question_type='short_answer', skill='概括归纳')
        card = export_studyhub_deck([q], '申论')['cards'][0]
        self.assertEqual(card['kind'], 'open')
        self.assertEqual(card['topic'], '概括归纳')

    def test_missing_answer_or_rubric_rejected(self):
        for field in ('reference_answer', 'rubric'):
            q = dict(QUESTION)
            q.pop(field)
            with self.assertRaises(ValueError):
                export_studyhub_deck([q], '测试')
        with self.assertRaises(ValueError):
            export_studyhub_deck([], '测试')

    def test_choice_requires_verified_correct_flags(self):
        q = {'kind': 'quiz', 'prompt': '选择答案', 'answer': 'A', 'options': [
            {'id': 'A', 'text': '甲', 'correct': True}, {'id': 'B', 'text': '乙', 'correct': False}, {'id': 'C', 'text': '丙', 'correct': False}]}
        card = export_studyhub_deck([q], '选择题')['cards'][0]
        self.assertEqual(sum(o['correct'] for o in card['options']), 1)
        q['options'][1]['correct'] = True
        with self.assertRaises(ValueError):
            export_studyhub_deck([q], '选择题')

    def test_sources_are_separate_markdown(self):
        md = export_sources_markdown([QUESTION])
        self.assertIn('案例原文', md)
        self.assertIn('Slocal', md)
        self.assertIn('非官方', md)
        self.assertIn('草稿', md)

    def test_app_single_choice_schema(self):
        q = {'question_type': 'single_choice', 'stem': '选出正确选项', 'correct_option_id': 'B',
             'options': [{'id': 'A', 'text': '甲'}, {'id': 'B', 'text': '乙'}, {'id': 'C', 'text': '丙'}, {'id': 'D', 'text': '丁'}],
             'explanation': '计算后乙符合条件。'}
        card = export_studyhub_deck([q], '行测练习')['cards'][0]
        self.assertEqual(card['kind'], 'quiz')
        self.assertEqual(card['answer'], 'B：乙')
        self.assertEqual([o['id'] for o in card['options'] if o['correct']], ['B'])
        q['correct_option_id'] = 'E'
        with self.assertRaises(ValueError):
            export_studyhub_deck([q], '行测练习')

    def test_cloze_requires_exact_marker_answer_mapping(self):
        q = {'kind': 'cloze', 'prompt': '填写', 'answer': '质量', 'cloze': {'text': '加强{{a}}管理', 'answers': [{'id': 'a', 'value': '质量'}]}}
        self.assertEqual(export_studyhub_deck([q], '填空')['cards'][0]['cloze']['answers'][0]['value'], '质量')
        q['cloze']['answers'][0]['id'] = 'b'
        with self.assertRaises(ValueError):
            export_studyhub_deck([q], '填空')

    def test_seed_catalog_export(self):
        catalog = json.loads((Path(__file__).resolve().parents[1] / 'data' / 'seed_catalog.json').read_text(encoding='utf-8'))
        deck = export_studyhub_deck(catalog['exercises'], '国考种子训练')
        self.assertEqual(len(deck['cards']), len(catalog['exercises']))
        self.assertEqual({card['kind'] for card in deck['cards']}, {'open', 'quiz'})
        self.assertTrue(all('非官方' in card['explanation'] for card in deck['cards']))

    def test_rich_questions_are_rejected_instead_of_silently_losing_images(self):
        image = {'type': 'image', 'url': 'https://fb.fbstatic.cn/example.png'}
        variants = [dict(QUESTION, visual_required=True)]
        variants += [dict(QUESTION, **{field: [image]}) for field in ('stem_blocks', 'material_blocks', 'reference_blocks')]
        variants += [dict(QUESTION, options=[{'id': 'A', 'text': '图', 'blocks': [image]}])]
        variants += [{'question': QUESTION, 'materials': [{'blocks': [image]}]}]
        for question in variants:
            with self.subTest(question=question), self.assertRaisesRegex(ValueError, '不支持图文'):
                export_studyhub_deck([question], '图文练习')
        q = dict(QUESTION, stem_blocks=[{'type': 'text', 'text': '题干'}])
        self.assertEqual(len(export_studyhub_deck([q], '纯文本')['cards']), 1)

    def test_uncalibrated_open_question_cannot_export_numeric_rubric(self):
        with self.assertRaisesRegex(ValueError, '尚未标定'):
            export_studyhub_deck([dict(QUESTION, rubric_status='uncalibrated')], '定性反馈')

    def test_word_limits_and_generic_course_profile_defaults(self):
        question = dict(QUESTION, subject='English', length_unit='words')
        deck = export_studyhub_deck([question], 'Grammar')
        self.assertEqual(deck['course'], 'English')
        self.assertIn('100词以内', deck['cards'][0]['prompt'])
        self.assertNotIn('100字以内', deck['cards'][0]['prompt'])
        neutral = export_studyhub_deck([QUESTION], '练习')
        self.assertEqual(neutral['course'], '学习练习')
        self.assertEqual(neutral['cards'][0]['topic'], '学习练习')
        explicit = export_studyhub_deck([QUESTION], '练习', profile={'name': '物理基础', 'goal': '理解惯性'})
        self.assertEqual(explicit['course'], '物理基础')
        self.assertEqual(explicit['cards'][0]['topic'], '理解惯性')
        wrapped = export_studyhub_deck([{'question': QUESTION, 'learning_profile': {'name': '数学'}}], '练习')
        self.assertEqual(wrapped['course'], '数学')


if __name__ == '__main__':
    unittest.main()
