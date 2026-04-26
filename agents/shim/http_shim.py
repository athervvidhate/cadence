from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agents.src.care_plan_agent import CarePlanAgent
from agents.src.escalation_agent import EscalationAgent
from agents.src.regimen_agent import RegimenAgent

app = FastAPI(title="DischargeCoach Agent Shim")

regimen_agent = RegimenAgent()
care_plan_agent = CarePlanAgent()
escalation_agent = EscalationAgent()


@app.post("/agents/regimen/extract_regimen")
def extract_regimen(payload: dict[str, Any]) -> dict[str, Any]:
    return regimen_agent.handle_extract_regimen(payload)


@app.post("/agents/care-plan/build_plan")
def build_plan(payload: dict[str, Any]) -> dict[str, Any]:
    return care_plan_agent.handle_build_plan(payload)


@app.post("/agents/escalation/evaluate_log")
def evaluate_log(payload: dict[str, Any]) -> dict[str, Any]:
    return escalation_agent.handle_evaluate_log(payload)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8001)
