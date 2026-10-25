import copy
import unittest

from tutor.retrieval import retrieve


class RetrievalProjectionTest(unittest.TestCase):
    def test_compatible_glyphs_match_without_rewriting_cited_original(self):
        source = {'id': 'P1', 'title': '原PDF', 'text': '⾏政执法应当注重事实与证据。',
                  'search_text': '行政执法应当注重事实与证据。'}
        distractor = {'id': 'P2', 'title': '其他资料', 'text': '春季花卉培育需要控制水分。'}
        chunks = [source, distractor]
        original = copy.deepcopy(chunks)
        self.assertIs(retrieve('行政执法', chunks, k=1)[0], source)
        self.assertEqual(retrieve('⾏政执法', copy.deepcopy(chunks), k=1)[0]['text'], source['text'])
        self.assertEqual(chunks, original)
        self.assertIn('⾏', source['text'])
        # The projection is authoritative for indexing only. An unrelated
        # projection must not silently fall back to the original citation text.
        source['search_text'] = '花卉培育与浇水'
        self.assertEqual(retrieve('行政执法', chunks), [])


class LargeCorpusTest(unittest.TestCase):
    """A real workspace can hold 10k+ chunks; the exact index must stay fast."""

    def setUp(self):
        self.fillers = [{'id': f'F{i}', 'title': '模考卷', 'text': '春季花卉培育需要控制水分与温度。'}
                        for i in range(2500)]

    def test_prefilter_keeps_relevant_chunk_on_large_corpus(self):
        source = {'id': 'S1', 'title': '真题', 'text': '城市用光需要分区域亮度管理，避免光污染。'}
        chunks = self.fillers + [source]
        self.assertEqual(retrieve('分区域亮度管理', chunks, k=2)[0]['id'], 'S1')

    def test_projection_still_authoritative_on_large_corpus(self):
        source = {'id': 'S1', 'title': '原PDF', 'text': '城市用光需要分区域亮度管理。',
                  'search_text': '花卉培育与浇水'}
        chunks = self.fillers + [source]
        self.assertEqual(retrieve('分区域亮度管理', chunks), [])

    def test_empty_query_stays_empty(self):
        self.assertEqual(retrieve('的', self.fillers + [{'id': 'S1', 'title': 't', 'text': '亮度管理'}]), [])

    def test_threshold_preserves_api_case_and_nfkc_without_mutating_source(self):
        for size in (1999, 2000):
            source = {'id': 'S1', 'text': 'API 与⾏政知识', 'title': '原文'}
            chunks = self.fillers[:size] + [source]
            for query in ('API', 'api', '行政'):
                self.assertIs(retrieve(query, chunks, 1)[0], source)
            self.assertEqual(source['text'], 'API 与⾏政知识')

    def test_cat_is_not_crowded_out_by_high_frequency_substrings(self):
        chunks = [{'id': str(i), 'text': 'concatenate ' * 8} for i in range(2000)]
        target = {'id': 'target', 'text': 'cat'}
        self.assertEqual(retrieve('cat', chunks + [target], 1), [target])

    def test_single_candidate_still_requires_token_match(self):
        # The substring is not an independent token; candidate count must not
        # change lexical matching semantics.
        chunks = self.fillers + [{'id': 'noise', 'text': 'concatenate'}]
        self.assertEqual(retrieve('cat', chunks), [])


if __name__ == '__main__':
    unittest.main()
