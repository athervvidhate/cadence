from __future__ import annotations

from typing import Any

from ml_pipeline.red_flag_engine import evaluate_red_flags


class EscalationAgent:
    def handle_evaluate_log(self, payload: dict[str, Any]) -> dict[str, Any]:
        daily_log = payload.get("dailyLog", {})
        result = evaluate_red_flags([daily_log])
        return {
            "type": "evaluation_complete",
            "flagLevel": result.get("flagLevel", "green"),
            "flagReasons": result.get("flagReasons", []),
            "actionsTaken": [],
        }
