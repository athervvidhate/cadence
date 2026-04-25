#!/usr/bin/env python3
"""Extract CHF medication regimens from discharge-summary images using Gemma 3.

Usage:
  python ml_pipeline/extract_regimen_gemma.py \
    --image ./page1.jpg --image ./page2.jpg \
    --patient-id demo-patient-001 \
    --output regimen.json

Environment:
  GOOGLE_API_KEY=<google ai studio key>
  GEMMA_MODEL=gemma-3-27b-it  # optional override
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types


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

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "extractionConfidence": {"type": "number"},
        "medications": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "drugName": {"type": "string"},
                    "rxNormCode": {"type": "string"},
                    "dose": {"type": "string"},
                    "frequency": {"type": "string"},
                    "schedule": {"type": "array", "items": {"type": "string"}},
                    "instructions": {"type": "string"},
                    "duration": {"type": "string"},
                    "indication": {"type": "string"},
                    "sourceConfidence": {"type": "number"},
                },
                "required": MEDICATION_REQUIRED_FIELDS,
            },
        },
    },
    "required": ["medications"],
}


EXTRACTION_PROMPT = """You are a clinical medication extraction engine for CHF discharge paperwork.

Task:
Extract ACTIVE discharge medications from the attached image(s) and output ONLY valid JSON.

Rules:
1) Include only active discharge medications. Exclude explicitly discontinued or held-home meds.
2) Preserve dose exactly with dose unit. Dose must include units (e.g., mg, mcg, mEq, units, mL).
3) Normalize schedule to 24-hour HH:MM array. If PRN/as-needed and no fixed time, use [].
4) Map frequencies to plain text such as: once daily, twice daily, three times daily, as needed, every other day, three times weekly.
5) Keep instructions concise and clinically relevant (hold parameters, with food, before breakfast, etc).
6) Use "ongoing" for duration unless a stop period is explicitly stated.
7) Indication should be short and practical (e.g., "diuretic for fluid overload").
8) sourceConfidence must be a number in [0,1].
9) If RxNorm is not visible, infer best-known code when high confidence; otherwise use "unknown".
10) Do not include markdown, commentary, or code fences.

Output JSON object shape:
{
  "extractionConfidence": <number 0..1>,
  "medications": [
    {
      "drugName": "string",
      "rxNormCode": "string",
      "dose": "string with mandatory unit",
      "frequency": "string",
      "schedule": ["HH:MM", "HH:MM"],
      "instructions": "string",
      "duration": "string",
      "indication": "string",
      "sourceConfidence": 0.0
    }
  ]
}
"""


@dataclass
class ValidationIssue:
    medication_index: int
    field: str
    message: str

    def to_text(self) -> str:
        return f"medications[{self.medication_index}].{self.field}: {self.message}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract regimen JSON from discharge-summary image(s) using Gemma 3 multimodal."
    )
    parser.add_argument(
        "--image",
        action="append",
        dest="images",
        default=[],
        help="Path to a discharge summary image. Repeat --image for multi-page summaries.",
    )
    parser.add_argument(
        "--text-file",
        type=Path,
        help="Optional text file containing discharge summary content (non-image test mode).",
    )
    parser.add_argument(
        "--synthetic-doc-id",
        help=(
            "Optional synthetic document ID from dataset (e.g., chf_en_001). "
            "Lets you test extraction without images."
        ),
    )
    parser.add_argument(
        "--dataset-path",
        type=Path,
        default=Path("ml_pipeline/data/chf_synthetic_discharge_summaries_v1.json"),
        help="Dataset JSON path used by --synthetic-doc-id.",
    )
    parser.add_argument(
        "--patient-id",
        default="unknown-patient",
        help="Patient ID to include in final regimen envelope.",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("GEMMA_MODEL", "gemma-3-27b-it"),
        help="Gemma model name in Google AI Studio.",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=2,
        help="Number of model repair retries after validation failure.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help=(
            "Optional output filename (for example: regimen.json). "
            "File is written inside a unique per-run folder."
        ),
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("ml_pipeline/out/extractions"),
        help="Base folder where unique extraction run folders are created.",
    )
    parser.add_argument(
        "--raw-output",
        type=Path,
        help=(
            "Optional raw output filename (for example: raw_response.txt). "
            "File is written inside the same unique per-run folder."
        ),
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output.",
    )
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


def clean_json_text(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


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

    # Allow empty schedules for PRN medications.
    if not schedule and "as needed" not in frequency.lower():
        # Keep empty and let validator surface it as a hard failure.
        return []

    return schedule


def validate_and_normalize_output(payload: dict[str, Any]) -> tuple[dict[str, Any], list[ValidationIssue]]:
    issues: list[ValidationIssue] = []
    medications = payload.get("medications")

    if not isinstance(medications, list):
        raise ValueError("Model output must include 'medications' as a list.")

    normalized_meds: list[dict[str, Any]] = []
    for i, med in enumerate(medications):
        if not isinstance(med, dict):
            issues.append(ValidationIssue(i, "medication", "must be an object"))
            continue

        normalized: dict[str, Any] = {}
        for field in MEDICATION_REQUIRED_FIELDS:
            if field not in med:
                issues.append(ValidationIssue(i, field, "missing required field"))
                normalized[field] = "" if field != "schedule" else []
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
                    confidence = -1.0
                if confidence < 0.0 or confidence > 1.0:
                    issues.append(
                        ValidationIssue(i, "sourceConfidence", "must be numeric in range [0,1]")
                    )
                    confidence = min(max(confidence, 0.0), 1.0)
                normalized[field] = round(confidence, 3)
            else:
                normalized[field] = _force_str(value)

        # Hard-check dose units.
        dose = normalized.get("dose", "")
        if dose and not DOSE_UNIT_PATTERN.search(dose):
            issues.append(
                ValidationIssue(
                    i,
                    "dose",
                    "must contain explicit dose unit (mg/mcg/mEq/units/mL/etc)",
                )
            )

        # Hard-check required non-empty text fields.
        for field in [
            "drugName",
            "rxNormCode",
            "dose",
            "frequency",
            "instructions",
            "duration",
            "indication",
        ]:
            if not normalized.get(field):
                issues.append(ValidationIssue(i, field, "must not be empty"))

        if "as needed" not in normalized.get("frequency", "").lower() and not normalized.get("schedule"):
            issues.append(
                ValidationIssue(
                    i, "schedule", "must include at least one HH:MM time for scheduled medications"
                )
            )

        normalized_meds.append(normalized)

    extraction_confidence_raw = payload.get("extractionConfidence", 0.0)
    try:
        extraction_confidence = float(extraction_confidence_raw)
    except (TypeError, ValueError):
        extraction_confidence = 0.0
    extraction_confidence = round(min(max(extraction_confidence, 0.0), 1.0), 3)

    normalized_payload = {
        "extractionConfidence": extraction_confidence,
        "medications": normalized_meds,
    }
    return normalized_payload, issues


def format_validation_feedback(issues: list[ValidationIssue]) -> str:
    if not issues:
        return ""
    lines = ["Validation failed. Fix these exactly:"]
    for issue in issues:
        lines.append(f"- {issue.to_text()}")
    return "\n".join(lines)


def load_image_parts(image_paths: list[Path]) -> list[types.Part]:
    parts: list[types.Part] = []
    for path in image_paths:
        if not path.exists():
            raise FileNotFoundError(
                f"Image not found: {path}. Provide a real file path, or use --synthetic-doc-id for no-image testing."
            )
        mime_type = mimetypes.guess_type(str(path))[0] or "image/jpeg"
        parts.append(types.Part.from_bytes(data=path.read_bytes(), mime_type=mime_type))
    return parts


def load_synthetic_doc_text(dataset_path: Path, doc_id: str) -> str:
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {dataset_path}")

    payload = json.loads(dataset_path.read_text(encoding="utf-8"))
    docs = payload.get("documents", [])
    for doc in docs:
        if doc.get("id") == doc_id:
            lines = doc.get("dischargeSummaryLines", [])
            if not isinstance(lines, list):
                raise ValueError(f"Document {doc_id} has invalid dischargeSummaryLines format.")
            return "\n".join(str(line) for line in lines)

    available_ids = ", ".join(str(d.get("id")) for d in docs if d.get("id"))
    raise ValueError(f"Unknown synthetic doc ID '{doc_id}'. Available IDs: {available_ids}")


def build_text_context(args: argparse.Namespace) -> str:
    chunks: list[str] = []

    if args.text_file:
        text_file = args.text_file.expanduser().resolve()
        if not text_file.exists():
            raise FileNotFoundError(f"Text file not found: {text_file}")
        chunks.append(
            "DISCHARGE SUMMARY (TEXT FILE INPUT):\n"
            + text_file.read_text(encoding="utf-8")
        )

    if args.synthetic_doc_id:
        dataset_path = args.dataset_path.expanduser().resolve()
        synthetic_text = load_synthetic_doc_text(dataset_path, args.synthetic_doc_id)
        chunks.append(
            f"SYNTHETIC DISCHARGE SUMMARY ({args.synthetic_doc_id}):\n{synthetic_text}"
        )

    return "\n\n".join(chunk.strip() for chunk in chunks if chunk.strip())


def _slugify(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9_-]+", "-", value.strip())
    slug = re.sub(r"-{2,}", "-", slug).strip("-_")
    return slug or "run"


def _run_label(args: argparse.Namespace, image_paths: list[Path]) -> str:
    if image_paths:
        first_stem = _slugify(image_paths[0].stem)
        return f"{first_stem}_{len(image_paths)}p"
    if args.synthetic_doc_id:
        return _slugify(args.synthetic_doc_id)
    if args.text_file:
        return _slugify(args.text_file.expanduser().resolve().stem)
    return "input"


def _json_filename(value: Path | None, default_name: str) -> str:
    if value is None:
        return default_name
    name = value.name.strip()
    if not name:
        return default_name
    if not name.lower().endswith(".json"):
        return f"{name}.json"
    return name


def _raw_filename(value: Path | None, default_name: str) -> str:
    if value is None:
        return default_name
    name = value.name.strip()
    return name or default_name


def resolve_run_output_paths(
    args: argparse.Namespace, image_paths: list[Path]
) -> tuple[Path, Path, Path]:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
    label = _run_label(args, image_paths)
    run_dir = args.output_root.expanduser().resolve() / f"{label}_{timestamp}"
    run_dir.mkdir(parents=True, exist_ok=False)

    regimen_path = run_dir / _json_filename(args.output, "regimen.json")
    raw_path = run_dir / _raw_filename(args.raw_output, "raw_model_response.txt")
    return run_dir, regimen_path, raw_path


def call_gemma_json(
    client: genai.Client,
    model: str,
    image_parts: list[types.Part],
    text_context: str = "",
    supplemental_feedback: str = "",
) -> str:
    prompt = EXTRACTION_PROMPT
    if text_context:
        prompt = (
            f"{prompt}\n\nAdditional source content (OCR/text mode):\n{text_context}\n"
        )
    if supplemental_feedback:
        prompt = f"{prompt}\n\n{supplemental_feedback}"

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt), *image_parts],
        )
    ]

    # First attempt uses explicit JSON schema to reduce malformed output.
    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
                response_schema=OUTPUT_SCHEMA,
            ),
        )
        if response.text:
            return response.text
    except Exception:
        pass

    # Fallback when schema-constrained generation is unavailable for the model.
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(temperature=0.0),
    )
    if not response.text:
        raise RuntimeError("Model returned empty response text.")
    return response.text


def build_regimen_envelope(
    patient_id: str, normalized_payload: dict[str, Any], extraction_path: str = "gemma_fallback"
) -> dict[str, Any]:
    return {
        "patientId": patient_id,
        "extractedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "extractionPath": extraction_path,
        "extractionConfidence": normalized_payload["extractionConfidence"],
        "medications": normalized_payload["medications"],
    }


def main() -> None:
    args = parse_args()

    if not args.images and not args.text_file and not args.synthetic_doc_id:
        raise ValueError(
            "Provide at least one input source: --image, --text-file, or --synthetic-doc-id."
        )

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise EnvironmentError("GOOGLE_API_KEY is required.")

    image_paths = [Path(p).expanduser().resolve() for p in args.images]
    image_parts = load_image_parts(image_paths) if image_paths else []
    text_context = build_text_context(args)
    run_dir, regimen_output_path, raw_output_path = resolve_run_output_paths(args, image_paths)
    client = genai.Client(api_key=api_key)

    feedback = ""
    last_raw = ""
    last_issues: list[ValidationIssue] = []
    normalized_payload: dict[str, Any] | None = None

    for _ in range(args.max_retries + 1):
        raw_text = call_gemma_json(
            client,
            args.model,
            image_parts,
            text_context=text_context,
            supplemental_feedback=feedback,
        )
        last_raw = raw_text
        cleaned = clean_json_text(raw_text)

        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            feedback = (
                "Your previous output was not valid JSON. "
                f"JSON parse error: {exc}. Return only valid JSON."
            )
            continue

        normalized_payload, issues = validate_and_normalize_output(payload)
        last_issues = issues
        if not issues:
            break
        feedback = format_validation_feedback(issues)

    if args.raw_output:
        raw_output_path.write_text(last_raw, encoding="utf-8")

    if normalized_payload is None or last_issues:
        issue_text = "\n".join(f"- {issue.to_text()}" for issue in last_issues) or "- unknown issue"
        raise RuntimeError(f"Could not produce schema-valid regimen output.\n{issue_text}")

    regimen = build_regimen_envelope(args.patient_id, normalized_payload)
    output_text = json.dumps(regimen, indent=2 if args.pretty else None, ensure_ascii=False)
    regimen_output_path.write_text(output_text + "\n", encoding="utf-8")

    if args.output:
        print(f"Saved regimen JSON to {regimen_output_path}")
        if args.raw_output:
            print(f"Saved raw model output to {raw_output_path}")
        print(f"Run folder: {run_dir}")
    else:
        print(output_text)


if __name__ == "__main__":
    main()
