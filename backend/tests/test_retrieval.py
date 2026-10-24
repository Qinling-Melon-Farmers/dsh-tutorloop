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


if __name__ == '__main__':
    unittest.main()
