import unittest

from ml_pipeline.symptom_keyword_extractor import extract_symptoms


class SymptomKeywordExtractorTests(unittest.TestCase):
    def test_extracts_sob_exertion(self) -> None:
        out = extract_symptoms("I get short of breath walking to the kitchen.")
        self.assertEqual(out["shortnessOfBreath"], "exertion")

    def test_extracts_sob_rest(self) -> None:
        out = extract_symptoms("I am short of breath at rest and breathless just talking.")
        self.assertEqual(out["shortnessOfBreath"], "rest")

    def test_extracts_swelling_mild(self) -> None:
        out = extract_symptoms("My shoes feel tighter and I have a little ankle swelling.")
        self.assertEqual(out["swelling"], "mild")

    def test_extracts_swelling_severe(self) -> None:
        out = extract_symptoms("My legs are very swollen today.")
        self.assertEqual(out["swelling"], "severe")

    def test_extracts_chest_pain_moderate(self) -> None:
        out = extract_symptoms("I have chest discomfort today with pressure in my chest.")
        self.assertEqual(out["chestPain"], "moderate")

    def test_extracts_fatigue_moderate(self) -> None:
        out = extract_symptoms("I feel pretty drained and more tired than usual.")
        self.assertEqual(out["fatigue"], "moderate")

    def test_defaults_to_none_when_no_keywords(self) -> None:
        out = extract_symptoms("I slept fine and watched TV.")
        self.assertEqual(out["shortnessOfBreath"], "none")
        self.assertEqual(out["swelling"], "none")
        self.assertEqual(out["chestPain"], "none")
        self.assertEqual(out["fatigue"], "none")

    def test_preserves_raw_transcript(self) -> None:
        text = "No chest pain and breathing is normal."
        out = extract_symptoms(text)
        self.assertEqual(out["rawTranscript"], text)


if __name__ == "__main__":
    unittest.main()
