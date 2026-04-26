import unittest

from ml_pipeline.red_flag_engine import evaluate_red_flags


def make_log(
    day: int,
    *,
    weight: float | None = 180.0,
    sob: str = "none",
    swelling: str = "none",
    chest_pain: str = "none",
    fatigue: str = "none",
    missed_doses: int = 0,
) -> dict:
    meds_taken = [{"drugName": f"med{i}", "taken": False} for i in range(missed_doses)]
    meds_taken.extend([{"drugName": "taken-med", "taken": True}])

    return {
        "date": f"2026-04-{day:02d}",
        "dayNumber": day,
        "weightLbs": weight,
        "medsTaken": meds_taken,
        "symptoms": {
            "shortnessOfBreath": sob,
            "swelling": swelling,
            "chestPain": chest_pain,
            "fatigue": fatigue,
            "rawTranscript": "",
        },
    }


class RedFlagEngineTests(unittest.TestCase):
    def test_01_empty_history_is_green(self) -> None:
        result = evaluate_red_flags([])
        self.assertEqual(result["flagLevel"], "green")
        self.assertEqual(result["flagReasons"], [])

    def test_02_single_day_no_signals_green(self) -> None:
        result = evaluate_red_flags([make_log(1)])
        self.assertEqual(result["flagLevel"], "green")

    def test_03_single_day_chest_pain_is_red(self) -> None:
        result = evaluate_red_flags([make_log(1, chest_pain="mild")])
        self.assertEqual(result["flagLevel"], "red")
        self.assertIn("new chest pain", result["flagReasons"])

    def test_04_weight_gain_over_5_in_7d_is_red(self) -> None:
        logs = [make_log(1, weight=180), make_log(7, weight=186)]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "red")
        self.assertIn("weight gain >5 lb in 7d", result["flagReasons"])

    def test_05_weight_gain_equal_5_in_7d_not_red(self) -> None:
        logs = [make_log(1, weight=180), make_log(7, weight=185)]
        result = evaluate_red_flags(logs)
        self.assertNotEqual(result["flagLevel"], "red")
        self.assertNotIn("weight gain >5 lb in 7d", result["flagReasons"])

    def test_06_weight_gain_over_2_with_new_symptom_is_red(self) -> None:
        logs = [make_log(1, weight=180), make_log(2, weight=183, sob="exertion")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "red")
        self.assertIn("weight gain >2 lb in 24h + new symptom", result["flagReasons"])

    def test_07_weight_gain_over_2_alone_is_yellow(self) -> None:
        logs = [make_log(1, weight=180), make_log(2, weight=183)]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "yellow")
        self.assertIn("weight gain >2 lb in 24h", result["flagReasons"])

    def test_08_weight_gain_exactly_2_not_trigger(self) -> None:
        logs = [make_log(1, weight=180), make_log(2, weight=182)]
        result = evaluate_red_flags(logs)
        self.assertNotIn("weight gain >2 lb in 24h", result["flagReasons"])

    def test_09_sob_at_rest_is_red(self) -> None:
        logs = [make_log(1), make_log(2, sob="rest")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "red")
        self.assertIn("shortness of breath at rest", result["flagReasons"])

    def test_10_new_chest_pain_is_red(self) -> None:
        logs = [make_log(1, chest_pain="none"), make_log(2, chest_pain="moderate")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "red")
        self.assertIn("new chest pain", result["flagReasons"])

    def test_11_new_exertional_sob_is_yellow(self) -> None:
        logs = [make_log(1, sob="none"), make_log(2, sob="exertion")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "yellow")
        self.assertIn("new shortness of breath on exertion", result["flagReasons"])

    def test_12_exertional_sob_not_new_not_yellow(self) -> None:
        logs = [make_log(1, sob="exertion"), make_log(2, sob="exertion")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "green")

    def test_13_new_mild_swelling_is_yellow(self) -> None:
        logs = [make_log(1, swelling="none"), make_log(2, swelling="mild")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "yellow")
        self.assertIn("new mild ankle swelling", result["flagReasons"])

    def test_14_missed_more_than_two_doses_is_yellow(self) -> None:
        logs = [make_log(1), make_log(2, missed_doses=3)]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "yellow")
        self.assertIn("missed >2 doses in 24h", result["flagReasons"])

    def test_15_missed_two_doses_not_yellow(self) -> None:
        logs = [make_log(1), make_log(2, missed_doses=2)]
        result = evaluate_red_flags(logs)
        self.assertNotIn("missed >2 doses in 24h", result["flagReasons"])

    def test_16_urgent_for_rest_sob_plus_chest_pain(self) -> None:
        logs = [make_log(1), make_log(2, sob="rest", chest_pain="mild")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "urgent")
        self.assertIn("shortness of breath at rest + chest pain", result["flagReasons"])

    def test_17_missing_weight_still_flags_symptom_rules(self) -> None:
        logs = [make_log(1, weight=180), make_log(2, weight=None, sob="rest")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "red")
        self.assertIn("shortness of breath at rest", result["flagReasons"])

    def test_18_single_day_missing_data_is_green(self) -> None:
        logs = [make_log(1, weight=None, sob="none", swelling="none", chest_pain="none", fatigue="none")]
        result = evaluate_red_flags(logs)
        self.assertEqual(result["flagLevel"], "green")

    def test_19_unsorted_logs_are_handled(self) -> None:
        log_day_2 = make_log(2, weight=183, sob="none")
        log_day_1 = make_log(1, weight=180, sob="none")
        result = evaluate_red_flags([log_day_2, log_day_1])
        self.assertEqual(result["flagLevel"], "yellow")
        self.assertIn("weight gain >2 lb in 24h", result["flagReasons"])

    def test_20_weight_metrics_none_when_unavailable(self) -> None:
        logs = [make_log(1, weight=None), make_log(2, weight=None)]
        result = evaluate_red_flags(logs)
        self.assertIsNone(result["metrics"]["weightDelta24h"])
        self.assertIsNone(result["metrics"]["weightDelta7d"])


if __name__ == "__main__":
    unittest.main()
