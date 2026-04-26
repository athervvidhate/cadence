"""Care Plan Agent scaffold for Cadence demo.

This module mirrors the Care Plan prompt contract and can be wired into a
Fetch.ai uAgent runtime. It builds the prompt payload and validates minimal
output constraints before a gateway persist step.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional


EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"\b(?:\+?\d[\d .\-()]{7,}\d)\b")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")


@dataclass
class CarePlanRequest:
    patient_profile: Dict[str, Any]
    regimen: Dict[str, Any]
    start_date_iso: str
    regimen_id: Optional[str] = None
    force_regenerate: bool = False


def _prompt_dir() -> Path:
    return (
        Path(__file__).resolve().parents[2]
        / "mobile_ocr_demo"
        / "backend"
        / "prompts"
    )


def load_system_prompt() -> str:
    return (_prompt_dir() / "care-plan-system-prompt.txt").read_text(encoding="utf-8")


def load_user_template() -> str:
    return (_prompt_dir() / "care-plan-user-template.txt").read_text(encoding="utf-8")


def build_user_prompt(payload: CarePlanRequest) -> str:
    template = load_user_template()
    return (
        template.replace(
            "{{patient_profile_json}}", json.dumps(payload.patient_profile, indent=2)
        )
        .replace("{{regimen_json}}", json.dumps(payload.regimen, indent=2))
        .replace("{{start_date_iso}}", payload.start_date_iso)
    )


def build_gateway_payload(payload: CarePlanRequest) -> Dict[str, Any]:
    return {
        "patientProfile": payload.patient_profile,
        "regimen": payload.regimen,
        "startDate": payload.start_date_iso,
        "regimenId": payload.regimen_id,
        "forceRegenerate": payload.force_regenerate,
    }


def _contains_pii(value: str) -> bool:
    return bool(EMAIL_RE.search(value) or PHONE_RE.search(value) or SSN_RE.search(value))


def validate_plan_shape(plan: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    days = plan.get("days")
    if not isinstance(days, list):
        return ["days must be a list"]
    if len(days) != 30:
        errors.append("days length must be 30")
    for idx, day in enumerate(days, start=1):
        if day.get("dayNumber") != idx:
            errors.append(f"dayNumber mismatch at day {idx}")
        for checkin in day.get("checkIns", []):
            script = checkin.get("script", {})
            for field_value in script.values():
                if isinstance(field_value, str) and _contains_pii(field_value):
                    errors.append(f"PII-like content in script at day {idx}")
                    break
        for reminder in day.get("medicationReminders", []):
            text = reminder.get("reminderText", "")
            if isinstance(text, str) and _contains_pii(text):
                errors.append(f"PII-like content in reminder at day {idx}")
                break
    return errors


def today_iso() -> str:
    return date.today().isoformat()

