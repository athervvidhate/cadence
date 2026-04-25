from __future__ import annotations

from typing import Any


class CarePlanAgent:
    def handle_build_plan(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": "plan_built",
            "patientId": payload.get("patientId"),
            "regimenId": payload.get("regimenId"),
            "carePlanId": f"cp_{abs(hash(str(payload))) % 10_000_000}",
            "totalDays": 30,
        }
