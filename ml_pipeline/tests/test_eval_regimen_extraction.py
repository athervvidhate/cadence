import unittest
from pathlib import Path

from ml_pipeline.eval_regimen_extraction import (
    DatasetDocument,
    PredictionRecord,
    evaluate_document,
    extract_discontinued_names,
    normalize_time_value,
)


class EvalRegimenExtractionTests(unittest.TestCase):
    def test_normalize_time_value_variants(self) -> None:
        self.assertEqual(normalize_time_value("0800"), "08:00")
        self.assertEqual(normalize_time_value("8:00 AM"), "08:00")
        self.assertEqual(normalize_time_value("9:15 pm"), "21:15")

    def test_extract_discontinued_names_parses_inline_and_bullets(self) -> None:
        lines = [
            "DISCONTINUE HOME MEDS: Lisinopril 10 mg daily; Metoprolol tartrate 25 mg BID",
            "- Ibuprofen 400 mg PRN pain",
            "",
            "Instructions: low sodium diet",
        ]
        names = extract_discontinued_names(lines)
        self.assertIn("lisinopril", names)
        self.assertIn("metoprolol tartrate", names)
        self.assertIn("ibuprofen", names)

    def test_evaluate_document_scores_missing_extra_and_discontinued(self) -> None:
        document = DatasetDocument(
            doc_id="chf_en_999",
            discharge_lines=[
                "DISCONTINUE HOME MEDS: Ibuprofen 400 mg PRN",
                "",
            ],
            medications=[
                {
                    "drugName": "Furosemide",
                    "dose": "40 mg",
                    "frequency": "twice daily",
                    "schedule": ["08:00", "20:00"],
                    "instructions": "Take with food",
                },
                {
                    "drugName": "Lisinopril",
                    "dose": "10 mg",
                    "frequency": "once daily",
                    "schedule": ["08:00"],
                    "instructions": "Take each morning",
                },
            ],
        )
        prediction = PredictionRecord(
            path=Path("pred.json"),
            payload={
                "patientId": "chf_en_999",
                "medications": [
                    {
                        "drugName": "Furosemide",
                        "dose": "40 mg tab",
                        "frequency": "BID",
                        "schedule": ["0800", "20:00"],
                        "instructions": "with food",
                    },
                    {
                        "drugName": "Ibuprofen",
                        "dose": "400 mg",
                        "frequency": "as needed",
                        "schedule": [],
                        "instructions": "for pain",
                    },
                ],
            },
            doc_id="chf_en_999",
            patient_id="chf_en_999",
            extraction_confidence=0.9,
            modified_time=0.0,
        )

        result = evaluate_document(document, prediction)
        self.assertEqual(result.matched_medications, 1)
        self.assertEqual(result.gt_medications, 2)
        self.assertEqual(result.predicted_medications, 2)
        self.assertAlmostEqual(result.medication_precision, 0.5)
        self.assertAlmostEqual(result.medication_recall, 0.5)
        self.assertIn("Lisinopril", result.missing_medications)
        self.assertIn("Ibuprofen", result.extra_medications)
        self.assertIn("Ibuprofen", result.discontinued_included)
        self.assertEqual(result.dose_units_present, 2)
        self.assertAlmostEqual(result.field_accuracy, 0.5)


if __name__ == "__main__":
    unittest.main()
