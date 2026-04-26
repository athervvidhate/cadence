#!/usr/bin/env python3
"""Contract-preserving regimen extraction wrapper for ZETIC Melange runtime.

This script keeps the same output contract as `extract_regimen_gemma.py`.
Only the runtime changes: inference is delegated to an on-device Melange runner.

Expected runner behavior:
- Read JSON payload from stdin.
- Return JSON to stdout containing either:
  1) `{ "medications": [...], "extractionConfidence": 0.0-1.0 }`, or
  2) `{ "result": { "medications": [...], "extractionConfidence": ... } }`.

Example runner command:
  python path/to/your_melange_runner.py
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DOSE_UNIT_PATTERN = re.compile(
    r"\b(mg|mcg|g|mEq|units|iu|IU|mL|ml|drops|puffs|tablet|tablets|capsule|capsules)\b"
)
TIME_PATTERN = re.compile(
    r"^\s*(?P<hour>\d{1,2})(?::?(?P<minute>\d{2}))?\s*(?P<ampm>[AaPp][Mm])?\s*$"
)
MEDICATION_REQUIRED_FIELDS = [
    "drugName",
    "rxNormCode",
    "dose",
    "frequency",
    "schedule",
    "instructions",
    "duration",
    "indication",
    "sourceConfidence",
]


@dataclass
class ValidationIssue:
    medication_index: int
    field: str
    message: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract regimen JSON with ZETIC Melange while keeping the same output contract."
    )
    parser.add_argument(
        "--image",
        action="append",
        dest="images",
        required=True,
        help="Path to discharge summary image. Repeat for multi-page inputs.",
    )
    parser.add_argument("--patient-id", default="unknown-patient")
    parser.add_argument(
        "--runner-cmd",
        default=os.getenv("ZETIC_RUNNER_CMD", ""),
        help="Command used to run your local Melange inference bridge.",
    )
    parser.add_argument(
        "--model-id",
        default=os.getenv("ZETIC_MODEL_ID", "cadence-regimen-v1"),
        help="On-device Melange model identifier.",
    )
    parser.add_argument("--output", type=Path, help="Optional output path for final JSON.")
    parser.add_argument("--pretty", action="store_true")
    return parser.parse_args()


def normalize_time(value: str) -> str:
    match = TIME_PATTERN.match(value)
    if not match:
        raise ValueError(f"invalid time format: {value!r}")

    hour = int(match.group("hour"))
    minute_text = match.group("minute")
    minute = int(minute_text) if minute_text is not None else 0
    ampm = match.group("ampm")

    if minute > 59:
        raise ValueError(f"minute out of range in time: {value!r}")
    if ampm:
        ampm = ampm.lower()
        if hour < 1 or hour > 12:
            raise ValueError(f"hour out of range for AM/PM time: {value!r}")
        if ampm == "pm" and hour != 12:
            hour += 12
        if ampm == "am" and hour == 12:
            hour = 0
    elif hour > 23:
        raise ValueError(f"hour out of range for 24-hour time: {value!r}")

    return f"{hour:02d}:{minute:02d}"


def _force_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize_schedule(raw_schedule: Any, frequency: str) -> list[str]:
    if raw_schedule is None:
        return []
    if isinstance(raw_schedule, str):
        raw_values = [raw_schedule]
    elif isinstance(raw_schedule, list):
        raw_values = [str(v) for v in raw_schedule]
    else:
        raw_values = [str(raw_schedule)]

    schedule: list[str] = []
    for item in raw_values:
        item = item.strip()
        if not item:
            continue
        schedule.append(normalize_time(item))

    if not schedule and "as needed" not in frequency.lower():
        return []
    return schedule


def validate_and_normalize_output(payload: dict[str, Any]) -> tuple[dict[str, Any], list[ValidationIssue]]:
    issues: list[ValidationIssue] = []
    medications = payload.get("medications")
    if not isinstance(medications, list):
        raise ValueError("Melange output must include 'medications' list.")

    normalized_meds: list[dict[str, Any]] = []
    for i, med in enumerate(medications):
        if not isinstance(med, dict):
            issues.append(ValidationIssue(i, "medication", "must be object"))
            continue
        normalized: dict[str, Any] = {}
        for field in MEDICATION_REQUIRED_FIELDS:
            if field not in med:
                issues.append(ValidationIssue(i, field, "missing required field"))
                normalized[field] = [] if field == "schedule" else ""
                continue
            value = med[field]
            if field == "schedule":
                try:
                    normalized[field] = _normalize_schedule(value, _force_str(med.get("frequency")))
                except ValueError as exc:
                    issues.append(ValidationIssue(i, field, str(exc)))
                    normalized[field] = []
            elif field == "sourceConfidence":
                try:
                    confidence = float(value)
                except (TypeError, ValueError):
                    confidence = 0.0
                normalized[field] = round(min(max(confidence, 0.0), 1.0), 3)
            else:
                normalized[field] = _force_str(value)

        if normalized.get("dose") and not DOSE_UNIT_PATTERN.search(normalized["dose"]):
            issues.append(
                ValidationIssue(i, "dose", "must contain explicit unit (mg/mEq/etc)")
            )
        if (
            "as needed" not in normalized.get("frequency", "").lower()
            and not normalized.get("schedule")
        ):
            issues.append(ValidationIssue(i, "schedule", "missing HH:MM schedule"))

        for text_field in [
            "drugName",
            "rxNormCode",
            "dose",
            "frequency",
            "instructions",
            "duration",
            "indication",
        ]:
            if not normalized.get(text_field):
                issues.append(ValidationIssue(i, text_field, "must not be empty"))

        normalized_meds.append(normalized)

    extraction_confidence_raw = payload.get("extractionConfidence", 0.0)
    try:
        extraction_confidence = float(extraction_confidence_raw)
    except (TypeError, ValueError):
        extraction_confidence = 0.0

    normalized_payload = {
        "extractionConfidence": round(min(max(extraction_confidence, 0.0), 1.0), 3),
        "medications": normalized_meds,
    }
    return normalized_payload, issues


def _build_runner_payload(model_id: str, image_paths: list[Path]) -> dict[str, Any]:
    return {
        "task": "extract_regimen",
        "modelId": model_id,
        "schema": {
            "medications": MEDICATION_REQUIRED_FIELDS,
        },
        "inputs": {
            "imagePaths": [str(path) for path in image_paths],
        },
    }


def _invoke_runner(runner_cmd: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not runner_cmd.strip():
        raise EnvironmentError(
            "Missing runner command. Set --runner-cmd or ZETIC_RUNNER_CMD."
        )

    process = subprocess.run(
        runner_cmd,
        input=json.dumps(payload),
        shell=True,
        text=True,
        capture_output=True,
        check=False,
    )
    if process.returncode != 0:
        raise RuntimeError(
            f"Melange runner failed with code {process.returncode}: {process.stderr.strip()}"
        )

    stdout = process.stdout.strip()
    if not stdout:
        raise RuntimeError("Melange runner returned empty output.")

    try:
        parsed = json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Melange runner output is not JSON: {exc}") from exc

    if isinstance(parsed, dict) and "result" in parsed and isinstance(parsed["result"], dict):
        return parsed["result"]
    if isinstance(parsed, dict):
        return parsed
    raise RuntimeError("Melange runner output must be a JSON object.")


def _build_regimen_envelope(patient_id: str, normalized_payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "patientId": patient_id,
        "extractedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "extractionPath": "zetic",
        "extractionConfidence": normalized_payload["extractionConfidence"],
        "medications": normalized_payload["medications"],
    }


def main() -> None:
    args = parse_args()
    image_paths = [Path(p).expanduser().resolve() for p in args.images]
    for path in image_paths:
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")

    runner_payload = _build_runner_payload(args.model_id, image_paths)
    raw_output = _invoke_runner(args.runner_cmd, runner_payload)
    normalized_payload, issues = validate_and_normalize_output(raw_output)
    if issues:
        issue_lines = [
            f"- medications[{issue.medication_index}].{issue.field}: {issue.message}"
            for issue in issues
        ]
        raise RuntimeError(
            "ZETIC output failed regimen contract validation:\n" + "\n".join(issue_lines)
        )

    regimen = _build_regimen_envelope(args.patient_id, normalized_payload)
    output = json.dumps(regimen, indent=2 if args.pretty else None, ensure_ascii=False)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)


if __name__ == "__main__":
    main()
