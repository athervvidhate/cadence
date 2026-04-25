#!/usr/bin/env python3
"""Deterministic symptom keyword extractor for CHF voice transcripts."""

from __future__ import annotations

import argparse
import json
import re
from typing import Any


def _normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s']", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def _contains_any(normalized_text: str, phrases: list[str]) -> bool:
    return any(phrase in normalized_text for phrase in phrases)


SOB_PHRASES = {
    "rest": [
        "short of breath at rest",
        "short of breath sitting still",
        "hard to breathe while resting",
        "breathing trouble while lying down",
        "can't catch my breath even sitting",
        "woke up gasping",
        "breathless just talking",
        "out of breath doing nothing",
    ],
    "exertion": [
        "short of breath walking",
        "winded walking to the bathroom",
        "out of breath with activity",
        "breathing gets worse when i move",
        "need to stop to catch my breath",
        "short of breath climbing stairs",
        "can breathe fine sitting but not walking",
        "a little short of breath walking to the kitchen",
    ],
    "none": [
        "no shortness of breath",
        "breathing is normal",
        "not short of breath",
        "breathing feels okay",
        "no trouble breathing",
    ],
}

SWELLING_PHRASES = {
    "severe": [
        "legs are very swollen",
        "ankles are very swollen",
        "swelling is severe",
        "my feet are huge today",
    ],
    "moderate": [
        "ankles are more swollen today",
        "noticeable swelling in my legs",
        "my socks are leaving deep marks",
        "swelling is getting worse",
    ],
    "mild": [
        "a little ankle swelling",
        "ankles are a bit puffy",
        "slight swelling in my feet",
        "mild swelling around my ankles",
        "my shoes feel tighter",
    ],
    "none": [
        "no swelling",
        "no ankle swelling",
        "legs are not swollen",
        "no puffiness",
    ],
}

CHEST_PAIN_PHRASES = {
    "severe": [
        "severe chest pain",
        "crushing chest pain",
        "worst chest pain",
        "heavy pressure in my chest",
    ],
    "moderate": [
        "moderate chest pain",
        "chest pain that comes and goes",
        "chest discomfort today",
        "pressure in my chest",
    ],
    "mild": [
        "mild chest pain",
        "slight chest pain",
        "little chest discomfort",
        "tiny bit of chest pain",
    ],
    "none": [
        "no chest pain",
        "no chest discomfort",
        "chest feels fine",
        "not having chest pain",
    ],
}

FATIGUE_PHRASES = {
    "severe": [
        "extremely tired",
        "exhausted all day",
        "too tired to get out of bed",
        "completely wiped out",
    ],
    "moderate": [
        "more tired than usual",
        "moderately tired",
        "fatigue is worse today",
        "i feel pretty drained",
    ],
    "mild": [
        "a little tired",
        "slightly fatigued",
        "mild fatigue",
        "a bit low energy",
    ],
    "none": [
        "no fatigue",
        "energy is normal",
        "not tired",
        "feels energetic today",
    ],
}


def _extract_sob(normalized_text: str) -> str:
    if _contains_any(normalized_text, SOB_PHRASES["rest"]):
        return "rest"
    if _contains_any(normalized_text, SOB_PHRASES["exertion"]):
        return "exertion"
    if _contains_any(normalized_text, SOB_PHRASES["none"]):
        return "none"
    return "none"


def _extract_swelling(normalized_text: str) -> str:
    for level in ("severe", "moderate", "mild"):
        if _contains_any(normalized_text, SWELLING_PHRASES[level]):
            return level
    if _contains_any(normalized_text, SWELLING_PHRASES["none"]):
        return "none"
    return "none"


def _extract_chest_pain(normalized_text: str) -> str:
    for level in ("severe", "moderate", "mild"):
        if _contains_any(normalized_text, CHEST_PAIN_PHRASES[level]):
            return level
    if _contains_any(normalized_text, CHEST_PAIN_PHRASES["none"]):
        return "none"
    return "none"


def _extract_fatigue(normalized_text: str) -> str:
    for level in ("severe", "moderate", "mild"):
        if _contains_any(normalized_text, FATIGUE_PHRASES[level]):
            return level
    if _contains_any(normalized_text, FATIGUE_PHRASES["none"]):
        return "none"
    return "none"


def extract_symptoms(transcript: str) -> dict[str, Any]:
    """Map transcript text to daily_logs.symptoms schema deterministically."""
    normalized = _normalize_text(transcript or "")
    return {
        "shortnessOfBreath": _extract_sob(normalized),
        "swelling": _extract_swelling(normalized),
        "chestPain": _extract_chest_pain(normalized),
        "fatigue": _extract_fatigue(normalized),
        "rawTranscript": transcript or "",
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract symptoms from transcript using keyword rules.")
    parser.add_argument("--transcript", required=True, help="Transcript string from ASR.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    symptoms = extract_symptoms(args.transcript)
    print(json.dumps(symptoms, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
