#!/usr/bin/env python3
"""Deterministic CHF red-flag rules for rolling daily logs.

Clinical threshold references:
- American Heart Association warning signs for heart failure monitoring:
  rapid weight gain of >2-3 lb in 24h or >5 lb in a week should trigger action.
  https://www.heart.org/en/health-topics/heart-failure/warning-signs-of-heart-failure
- AHA heart failure symptom guidance (shortness of breath, swelling, chest pain):
  https://www.heart.org/en/health-topics/heart-failure
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal, Sequence

AHA_WEIGHT_GAIN_24H_LBS = 2.0
AHA_WEIGHT_GAIN_7D_LBS = 5.0

FlagLevel = Literal["green", "yellow", "red", "urgent"]

SOB_RANK = {"none": 0, "exertion": 1, "rest": 2}
SWELLING_RANK = {"none": 0, "mild": 1, "moderate": 2, "severe": 3}
PAIN_RANK = {"none": 0, "mild": 1, "moderate": 2, "severe": 3}
FATIGUE_RANK = {"none": 0, "mild": 1, "moderate": 2, "severe": 3}


@dataclass(frozen=True)
class FlagResult:
    level: FlagLevel
    reasons: list[str]
    metrics: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "flagLevel": self.level,
            "flagReasons": self.reasons,
            "metrics": self.metrics,
        }


def evaluate_red_flags(daily_logs: Sequence[dict[str, Any]]) -> dict[str, Any]:
    """Evaluate rolling daily logs and return deterministic flag level + reasons."""
    if not daily_logs:
        return FlagResult(
            level="green",
            reasons=[],
            metrics={"weightDelta24h": None, "weightDelta7d": None, "missedDoses24h": 0},
        ).as_dict()

    logs = _sort_logs(daily_logs)
    window = logs[-7:]
    current = window[-1]
    previous = window[-2] if len(window) > 1 else None

    current_weight = _as_float(current.get("weightLbs"))
    previous_weight = _as_float(previous.get("weightLbs")) if previous else None
    first_weight = _as_float(window[0].get("weightLbs"))

    weight_delta_24h = (
        round(current_weight - previous_weight, 3)
        if current_weight is not None and previous_weight is not None
        else None
    )
    weight_delta_7d = (
        round(current_weight - first_weight, 3)
        if current_weight is not None and first_weight is not None and len(window) > 1
        else None
    )

    current_symptoms = _normalize_symptoms(current.get("symptoms"))
    previous_symptoms = _normalize_symptoms(previous.get("symptoms")) if previous else _empty_symptoms()

    missed_doses_24h = _count_missed_doses(current.get("medsTaken"))
    any_new_symptom = _has_any_new_or_worse_symptom(current_symptoms, previous_symptoms)

    sob_current = current_symptoms["shortnessOfBreath"]
    chest_pain_current = current_symptoms["chestPain"]
    swelling_current = current_symptoms["swelling"]

    metrics = {
        "weightDelta24h": weight_delta_24h,
        "weightDelta7d": weight_delta_7d,
        "missedDoses24h": missed_doses_24h,
    }

    # Optional urgent subset used by escalation logic:
    # "SOB at rest + chest pain" is treated as higher than red.
    urgent_reasons: list[str] = []
    if sob_current == "rest" and chest_pain_current != "none":
        urgent_reasons.append("shortness of breath at rest + chest pain")
    if urgent_reasons:
        return FlagResult(level="urgent", reasons=urgent_reasons, metrics=metrics).as_dict()

    red_reasons: list[str] = []
    if weight_delta_7d is not None and weight_delta_7d > AHA_WEIGHT_GAIN_7D_LBS:
        red_reasons.append("weight gain >5 lb in 7d")
    if (
        weight_delta_24h is not None
        and weight_delta_24h > AHA_WEIGHT_GAIN_24H_LBS
        and any_new_symptom
    ):
        red_reasons.append("weight gain >2 lb in 24h + new symptom")
    if sob_current == "rest":
        red_reasons.append("shortness of breath at rest")
    if _is_new_chest_pain(current_symptoms, previous_symptoms):
        red_reasons.append("new chest pain")
    if red_reasons:
        return FlagResult(level="red", reasons=red_reasons, metrics=metrics).as_dict()

    yellow_reasons: list[str] = []
    if (
        weight_delta_24h is not None
        and weight_delta_24h > AHA_WEIGHT_GAIN_24H_LBS
        and not any_new_symptom
    ):
        yellow_reasons.append("weight gain >2 lb in 24h")
    if _is_new_sob_on_exertion(current_symptoms, previous_symptoms):
        yellow_reasons.append("new shortness of breath on exertion")
    if _is_new_mild_swelling(current_symptoms, previous_symptoms):
        yellow_reasons.append("new mild ankle swelling")
    if missed_doses_24h > 2:
        yellow_reasons.append("missed >2 doses in 24h")
    if yellow_reasons:
        return FlagResult(level="yellow", reasons=yellow_reasons, metrics=metrics).as_dict()

    return FlagResult(level="green", reasons=[], metrics=metrics).as_dict()


def _sort_logs(daily_logs: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    indexed = []
    for idx, log in enumerate(daily_logs):
        dt = _parse_date(log.get("date"))
        if dt is not None:
            key = (0, dt.timestamp(), idx)
        else:
            day_num = log.get("dayNumber")
            if isinstance(day_num, int):
                key = (1, float(day_num), idx)
            else:
                key = (2, float(idx), idx)
        indexed.append((key, log))

    indexed.sort(key=lambda item: item[0])
    return [item[1] for item in indexed]


def _parse_date(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str) or not value.strip():
        return None

    clean = value.strip()
    if clean.endswith("Z"):
        clean = clean[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(clean)
    except ValueError:
        return None


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _empty_symptoms() -> dict[str, str]:
    return {
        "shortnessOfBreath": "none",
        "swelling": "none",
        "chestPain": "none",
        "fatigue": "none",
    }


def _normalize_symptoms(raw: Any) -> dict[str, str]:
    if not isinstance(raw, dict):
        return _empty_symptoms()

    symptoms = _empty_symptoms()
    for key in symptoms:
        value = raw.get(key, "none")
        symptoms[key] = str(value).strip().lower() if value is not None else "none"
        if not symptoms[key]:
            symptoms[key] = "none"
    return symptoms


def _count_missed_doses(meds_taken: Any) -> int:
    if not isinstance(meds_taken, list):
        return 0
    missed = 0
    for med in meds_taken:
        if isinstance(med, dict) and med.get("taken") is False:
            missed += 1
    return missed


def _is_new_or_worse(current: str, previous: str, rank_map: dict[str, int]) -> bool:
    current_rank = rank_map.get(current, 0)
    previous_rank = rank_map.get(previous, 0)
    return current_rank > previous_rank


def _has_any_new_or_worse_symptom(current: dict[str, str], previous: dict[str, str]) -> bool:
    return any(
        [
            _is_new_or_worse(current["shortnessOfBreath"], previous["shortnessOfBreath"], SOB_RANK),
            _is_new_or_worse(current["swelling"], previous["swelling"], SWELLING_RANK),
            _is_new_or_worse(current["chestPain"], previous["chestPain"], PAIN_RANK),
            _is_new_or_worse(current["fatigue"], previous["fatigue"], FATIGUE_RANK),
        ]
    )


def _is_new_chest_pain(current: dict[str, str], previous: dict[str, str]) -> bool:
    return _is_new_or_worse(current["chestPain"], previous["chestPain"], PAIN_RANK) and current[
        "chestPain"
    ] != "none"


def _is_new_sob_on_exertion(current: dict[str, str], previous: dict[str, str]) -> bool:
    return (
        current["shortnessOfBreath"] == "exertion"
        and _is_new_or_worse(current["shortnessOfBreath"], previous["shortnessOfBreath"], SOB_RANK)
    )


def _is_new_mild_swelling(current: dict[str, str], previous: dict[str, str]) -> bool:
    return (
        current["swelling"] == "mild"
        and previous.get("swelling", "none") == "none"
    )

