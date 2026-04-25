#!/usr/bin/env python3
"""Evaluate regimen extraction outputs against synthetic ground truth.

This evaluator compares predicted regimen JSON files against the synthetic CHF
dataset and reports:
- Field-level accuracy (drugName, dose, frequency, schedule, instructions)
- Medication matching precision / recall / F1
- Dose-unit presence rate in predictions
- False inclusion of discontinued medications
- Per-document error details
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SCORING_FIELDS = ("drugName", "dose", "frequency", "schedule", "instructions")
DOSE_UNIT_PATTERN = re.compile(
    r"\b(mg|mcg|g|meq|units|iu|ml|mL|drops|puffs|tablet|tablets|capsule|capsules)\b",
    re.IGNORECASE,
)
TIME_PATTERN = re.compile(
    r"^\s*(?P<hour>\d{1,2})(?::?(?P<minute>\d{2}))?\s*(?P<ampm>[AaPp][Mm])?\s*$"
)

DRUG_FORM_TOKENS = {
    "tab",
    "tabs",
    "tablet",
    "tablets",
    "cap",
    "caps",
    "capsule",
    "capsules",
    "er",
    "xr",
    "sr",
    "dr",
    "sl",
    "po",
    "oral",
    "chewable",
    "extended",
    "release",
}
BRAND_NOISE_TOKENS = {"entresto"}
INSTRUCTION_STOPWORDS = {
    "take",
    "and",
    "the",
    "a",
    "an",
    "to",
    "with",
    "at",
    "in",
    "of",
    "for",
    "on",
    "by",
    "every",
    "daily",
}
FREQUENCY_ALIASES = {
    "qd": "once daily",
    "qday": "once daily",
    "qam": "once daily",
    "qhs": "once daily",
    "bid": "twice daily",
    "tid": "three times daily",
    "prn": "as needed",
}
DISCONTINUE_KEYWORDS = (
    "discontinue",
    "stop",
    "do not take",
    "no tomar",
)
SECTION_BREAK_KEYWORDS = (
    "instructions",
    "self-care",
    "patient counseling",
    "follow up",
    "follow-up",
    "indicaciones",
)
SPANISH_DRUG_ALIASES = {
    "furosemida": "furosemide",
    "enalapril": "enalapril",
    "espironolactona": "spironolactone",
    "dapagliflozina": "dapagliflozin",
    "digoxina": "digoxin",
    "eplerenona": "eplerenone",
    "sacubitrilo": "sacubitril",
    "torasemida": "torsemide",
    "torsemida": "torsemide",
    "cloruro de potasio": "potassium chloride",
}
DISCONTINUE_STOP_TOKENS = {
    "daily",
    "once",
    "twice",
    "three",
    "times",
    "bid",
    "tid",
    "prn",
    "qhs",
    "qam",
    "as",
    "needed",
    "every",
    "por",
    "cada",
    "con",
    "sin",
}


@dataclass
class DatasetDocument:
    doc_id: str
    medications: list[dict[str, Any]]
    discharge_lines: list[str]


@dataclass
class PredictionRecord:
    path: Path
    payload: dict[str, Any]
    doc_id: str | None
    patient_id: str
    extraction_confidence: float | None
    modified_time: float


@dataclass
class DocEvaluation:
    doc_id: str
    prediction_path: str
    patient_id: str
    matched_medications: int
    gt_medications: int
    predicted_medications: int
    medication_precision: float
    medication_recall: float
    medication_f1: float
    field_correct_counts: dict[str, int]
    field_total_counts: dict[str, int]
    field_accuracy: float
    missing_medications: list[str]
    extra_medications: list[str]
    discontinued_included: list[str]
    dose_units_present: int
    field_mismatches: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "docId": self.doc_id,
            "predictionPath": self.prediction_path,
            "patientId": self.patient_id,
            "matchedMedications": self.matched_medications,
            "groundTruthMedicationCount": self.gt_medications,
            "predictedMedicationCount": self.predicted_medications,
            "medicationPrecision": self.medication_precision,
            "medicationRecall": self.medication_recall,
            "medicationF1": self.medication_f1,
            "fieldCorrectCounts": self.field_correct_counts,
            "fieldTotalCounts": self.field_total_counts,
            "fieldAccuracy": self.field_accuracy,
            "missingMedications": self.missing_medications,
            "extraMedications": self.extra_medications,
            "discontinuedIncluded": self.discontinued_included,
            "doseUnitsPresent": self.dose_units_present,
            "fieldMismatches": self.field_mismatches,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate regimen extraction outputs against synthetic ground truth."
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path("ml_pipeline/data/chf_synthetic_discharge_summaries_v1.json"),
        help="Path to synthetic dataset JSON.",
    )
    parser.add_argument(
        "--predictions-dir",
        type=Path,
        default=Path("ml_pipeline/out/extractions"),
        help="Directory to recursively scan for prediction JSON files.",
    )
    parser.add_argument(
        "--prediction-file",
        action="append",
        type=Path,
        default=[],
        help="Additional prediction JSON file(s) to include.",
    )
    parser.add_argument(
        "--use-all-runs",
        action="store_true",
        help="Evaluate every mapped run. Default: only latest prediction per doc_id.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("ml_pipeline/out/eval"),
        help="Directory where summary outputs are written.",
    )
    parser.add_argument(
        "--summary-json",
        default="summary.json",
        help="Summary JSON filename written under --output-dir.",
    )
    parser.add_argument(
        "--report-md",
        default="report.md",
        help="Markdown report filename written under --output-dir.",
    )
    parser.add_argument(
        "--fail-on-missing-docs",
        action="store_true",
        help="Exit with code 2 if one or more dataset docs are missing predictions.",
    )
    return parser.parse_args()


def canonical_text(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_drug_name(value: Any) -> str:
    text = canonical_text(value)
    text = re.sub(r"\([^)]*\)", " ", text)
    text = text.replace("/", " ")
    text = re.sub(r"[^a-z0-9\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # Phrase-level bilingual alias replacement before token filtering.
    for spanish, english in sorted(SPANISH_DRUG_ALIASES.items(), key=lambda item: -len(item[0])):
        text = re.sub(rf"\b{re.escape(spanish)}\b", english, text)

    tokens = []
    for token in text.split():
        if token in DRUG_FORM_TOKENS:
            continue
        if token in BRAND_NOISE_TOKENS:
            continue
        tokens.append(token)
    return " ".join(tokens).strip()


def normalize_dose(value: Any) -> str:
    text = canonical_text(value)
    text = text.replace("/", " / ")
    text = re.sub(r"[^a-z0-9\s./-]", " ", text)
    tokens = []
    for token in text.split():
        if token in DRUG_FORM_TOKENS:
            continue
        tokens.append(token)
    return " ".join(tokens).strip()


def normalize_frequency(value: Any) -> str:
    text = canonical_text(value)
    if not text:
        return ""
    for alias, canonical in FREQUENCY_ALIASES.items():
        text = re.sub(rf"\b{re.escape(alias)}\b", canonical, text)

    if "as needed" in text:
        return "as needed"
    if "three times weekly" in text:
        return "three times weekly"
    if "every other day" in text:
        return "every other day"
    if "three times daily" in text or "every 8" in text:
        return "three times daily"
    if "twice daily" in text or "every 12" in text:
        return "twice daily"
    if "once daily" in text or "daily" in text or "every 24" in text:
        return "once daily"
    return text


def normalize_time_value(value: Any) -> str:
    text = canonical_text(value).upper()
    match = TIME_PATTERN.match(text)
    if not match:
        return canonical_text(value)

    hour = int(match.group("hour"))
    minute_text = match.group("minute")
    minute = int(minute_text) if minute_text else 0
    ampm = match.group("ampm")
    if minute > 59:
        return canonical_text(value)

    if ampm:
        ampm = ampm.lower()
        if hour < 1 or hour > 12:
            return canonical_text(value)
        if ampm == "pm" and hour != 12:
            hour += 12
        if ampm == "am" and hour == 12:
            hour = 0
    else:
        if hour > 23:
            return canonical_text(value)

    return f"{hour:02d}:{minute:02d}"


def normalize_schedule(value: Any) -> list[str]:
    if not isinstance(value, list):
        if value is None:
            return []
        value = [value]

    normalized = [normalize_time_value(item) for item in value if canonical_text(item)]
    return sorted(normalized)


def instruction_tokens(value: Any) -> set[str]:
    text = canonical_text(value)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = {token for token in text.split() if token and token not in INSTRUCTION_STOPWORDS}
    return tokens


def instructions_match(ground_truth: Any, predicted: Any) -> bool:
    gt_text = canonical_text(ground_truth)
    pred_text = canonical_text(predicted)
    if not gt_text and not pred_text:
        return True
    if gt_text == pred_text:
        return True
    gt_tokens = instruction_tokens(gt_text)
    pred_tokens = instruction_tokens(pred_text)
    if not gt_tokens and not pred_tokens:
        return True
    if not gt_tokens or not pred_tokens:
        return False
    overlap = len(gt_tokens & pred_tokens)
    union = len(gt_tokens | pred_tokens)
    jaccard = overlap / union if union else 0.0
    return jaccard >= 0.5


def dose_has_unit(dose_value: Any) -> bool:
    return bool(DOSE_UNIT_PATTERN.search(str(dose_value or "")))


def name_similarity(name_a: Any, name_b: Any) -> float:
    left = normalize_drug_name(name_a)
    right = normalize_drug_name(name_b)
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0
    if left in right or right in left:
        return 0.9

    left_tokens = set(left.split())
    right_tokens = set(right.split())
    overlap = len(left_tokens & right_tokens)
    union = len(left_tokens | right_tokens)
    return overlap / union if union else 0.0


def match_medications(
    ground_truth_meds: list[dict[str, Any]], predicted_meds: list[dict[str, Any]]
) -> tuple[list[tuple[int, int, float]], set[int], set[int]]:
    candidate_pairs: list[tuple[float, int, int]] = []
    for gt_idx, gt_med in enumerate(ground_truth_meds):
        for pred_idx, pred_med in enumerate(predicted_meds):
            score = name_similarity(gt_med.get("drugName"), pred_med.get("drugName"))
            if score >= 0.6:
                candidate_pairs.append((score, gt_idx, pred_idx))

    candidate_pairs.sort(reverse=True, key=lambda item: item[0])
    matched_gt: set[int] = set()
    matched_pred: set[int] = set()
    matches: list[tuple[int, int, float]] = []
    for score, gt_idx, pred_idx in candidate_pairs:
        if gt_idx in matched_gt or pred_idx in matched_pred:
            continue
        matched_gt.add(gt_idx)
        matched_pred.add(pred_idx)
        matches.append((gt_idx, pred_idx, score))

    missing_gt = set(range(len(ground_truth_meds))) - matched_gt
    extra_pred = set(range(len(predicted_meds))) - matched_pred
    return matches, missing_gt, extra_pred


def parse_discontinued_entries(line: str) -> list[str]:
    text = canonical_text(line)
    if not text:
        return []
    text = re.sub(r"^[\-\*\d\).\s]+", "", text)

    segments = [segment.strip() for segment in re.split(r";", text) if segment.strip()]
    if not segments:
        segments = [text]

    names: list[str] = []
    for segment in segments:
        cleaned = re.sub(r"^[\-\*]\s*", "", segment)
        tokens = cleaned.split()
        if not tokens:
            continue
        collected: list[str] = []
        for token in tokens:
            if any(char.isdigit() for char in token):
                break
            if token in DISCONTINUE_STOP_TOKENS:
                break
            collected.append(token)
        candidate = " ".join(collected) if collected else tokens[0]
        candidate = normalize_drug_name(candidate)
        if candidate:
            names.append(candidate)
    return names


def extract_discontinued_names(lines: list[str]) -> set[str]:
    names: set[str] = set()
    in_section = False
    for raw_line in lines:
        line = raw_line.strip()
        lower_line = line.lower()
        if not line:
            if in_section:
                in_section = False
            continue

        has_keyword = any(keyword in lower_line for keyword in DISCONTINUE_KEYWORDS)
        if has_keyword:
            in_section = True
            after_colon = line.split(":", 1)[1] if ":" in line else ""
            for name in parse_discontinued_entries(after_colon):
                names.add(name)
            continue

        if in_section:
            if any(keyword in lower_line for keyword in SECTION_BREAK_KEYWORDS):
                in_section = False
                continue
            for name in parse_discontinued_entries(line):
                names.add(name)
    return names


def field_matches(field: str, gt_value: Any, pred_value: Any) -> bool:
    if field == "drugName":
        return name_similarity(gt_value, pred_value) >= 0.85
    if field == "dose":
        return normalize_dose(gt_value) == normalize_dose(pred_value)
    if field == "frequency":
        return normalize_frequency(gt_value) == normalize_frequency(pred_value)
    if field == "schedule":
        return normalize_schedule(gt_value) == normalize_schedule(pred_value)
    if field == "instructions":
        return instructions_match(gt_value, pred_value)
    return canonical_text(gt_value) == canonical_text(pred_value)


def evaluate_document(doc: DatasetDocument, prediction: PredictionRecord) -> DocEvaluation:
    gt_meds = doc.medications
    pred_meds_raw = prediction.payload.get("medications")
    pred_meds = pred_meds_raw if isinstance(pred_meds_raw, list) else []

    matches, missing_gt, extra_pred = match_medications(gt_meds, pred_meds)
    matched_gt_indexes = {gt_idx for gt_idx, _, _ in matches}
    matched_pred_indexes = {pred_idx for _, pred_idx, _ in matches}

    field_correct_counts = {field: 0 for field in SCORING_FIELDS}
    field_total_counts = {field: len(gt_meds) for field in SCORING_FIELDS}
    field_mismatches: list[str] = []

    for gt_idx, pred_idx, _ in matches:
        gt_med = gt_meds[gt_idx]
        pred_med = pred_meds[pred_idx]
        for field in SCORING_FIELDS:
            is_match = field_matches(field, gt_med.get(field), pred_med.get(field))
            if is_match:
                field_correct_counts[field] += 1
            else:
                field_mismatches.append(
                    (
                        f"{gt_med.get('drugName', 'unknown')}::{field} "
                        f"(expected='{gt_med.get(field)}', got='{pred_med.get(field)}')"
                    )
                )

    for gt_idx in sorted(missing_gt):
        gt_name = gt_meds[gt_idx].get("drugName", "unknown")
        for field in SCORING_FIELDS:
            field_mismatches.append(f"{gt_name}::{field} (missing medication)")

    missing_medications = [
        gt_meds[idx].get("drugName", "unknown")
        for idx in sorted(set(range(len(gt_meds))) - matched_gt_indexes)
    ]
    extra_medications = [
        pred_meds[idx].get("drugName", "unknown")
        for idx in sorted(set(range(len(pred_meds))) - matched_pred_indexes)
    ]

    discontinued_names = extract_discontinued_names(doc.discharge_lines)
    discontinued_included: list[str] = []
    for pred_med in pred_meds:
        pred_name = pred_med.get("drugName", "")
        normalized_pred = normalize_drug_name(pred_name)
        if not normalized_pred:
            continue
        if any(
            name_similarity(normalized_pred, discontinued_name) >= 0.85
            for discontinued_name in discontinued_names
        ):
            discontinued_included.append(pred_name)

    matched_count = len(matches)
    gt_count = len(gt_meds)
    pred_count = len(pred_meds)
    precision = matched_count / pred_count if pred_count else 0.0
    recall = matched_count / gt_count if gt_count else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    field_total = sum(field_total_counts.values())
    field_correct = sum(field_correct_counts.values())
    field_accuracy = field_correct / field_total if field_total else 0.0

    dose_units_present = sum(1 for med in pred_meds if dose_has_unit(med.get("dose")))

    return DocEvaluation(
        doc_id=doc.doc_id,
        prediction_path=str(prediction.path),
        patient_id=prediction.patient_id,
        matched_medications=matched_count,
        gt_medications=gt_count,
        predicted_medications=pred_count,
        medication_precision=precision,
        medication_recall=recall,
        medication_f1=f1,
        field_correct_counts=field_correct_counts,
        field_total_counts=field_total_counts,
        field_accuracy=field_accuracy,
        missing_medications=missing_medications,
        extra_medications=extra_medications,
        discontinued_included=discontinued_included,
        dose_units_present=dose_units_present,
        field_mismatches=field_mismatches,
    )


def load_dataset(dataset_path: Path) -> dict[str, DatasetDocument]:
    payload = json.loads(dataset_path.read_text(encoding="utf-8"))
    documents = payload.get("documents")
    if not isinstance(documents, list):
        raise ValueError("Dataset is missing 'documents' list.")

    by_id: dict[str, DatasetDocument] = {}
    for doc in documents:
        if not isinstance(doc, dict):
            continue
        doc_id = str(doc.get("id", "")).strip()
        gt_regimen = doc.get("groundTruthRegimen", {})
        gt_meds = gt_regimen.get("medications", []) if isinstance(gt_regimen, dict) else []
        lines = doc.get("dischargeSummaryLines", [])
        if doc_id and isinstance(gt_meds, list):
            by_id[doc_id] = DatasetDocument(
                doc_id=doc_id,
                medications=gt_meds,
                discharge_lines=lines if isinstance(lines, list) else [],
            )
    return by_id


def collect_prediction_files(predictions_dir: Path, prediction_files: list[Path]) -> list[Path]:
    collected: set[Path] = set()
    if predictions_dir.exists():
        for path in predictions_dir.rglob("*.json"):
            collected.add(path.resolve())
    for path in prediction_files:
        resolved = path.expanduser().resolve()
        if resolved.exists():
            collected.add(resolved)
    return sorted(collected, key=lambda path: path.as_posix())


def resolve_doc_id(payload: dict[str, Any], path: Path, dataset_ids: set[str]) -> str | None:
    patient_id = str(payload.get("patientId", "")).strip()
    for doc_id in dataset_ids:
        if patient_id == doc_id:
            return doc_id
        if patient_id.startswith(f"{doc_id}-") or patient_id.startswith(f"{doc_id}_"):
            return doc_id

    path_text = path.as_posix().lower()
    for doc_id in dataset_ids:
        if doc_id.lower() in path_text:
            return doc_id
    return None


def load_prediction_records(prediction_paths: list[Path], dataset_ids: set[str]) -> tuple[list[PredictionRecord], list[str]]:
    records: list[PredictionRecord] = []
    skipped_files: list[str] = []
    for path in prediction_paths:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            skipped_files.append(f"{path}: invalid JSON")
            continue

        if not isinstance(payload, dict):
            skipped_files.append(f"{path}: root JSON is not an object")
            continue
        if "medications" not in payload or not isinstance(payload.get("medications"), list):
            skipped_files.append(f"{path}: missing medications list")
            continue

        patient_id = str(payload.get("patientId", "")).strip()
        extraction_confidence = payload.get("extractionConfidence")
        confidence_value: float | None
        try:
            confidence_value = float(extraction_confidence) if extraction_confidence is not None else None
        except (TypeError, ValueError):
            confidence_value = None

        records.append(
            PredictionRecord(
                path=path,
                payload=payload,
                doc_id=resolve_doc_id(payload, path, dataset_ids),
                patient_id=patient_id,
                extraction_confidence=confidence_value,
                modified_time=path.stat().st_mtime,
            )
        )

    return records, skipped_files


def select_predictions(records: list[PredictionRecord], use_all_runs: bool) -> tuple[list[PredictionRecord], list[str]]:
    unmapped = [str(record.path) for record in records if record.doc_id is None]
    mapped_records = [record for record in records if record.doc_id is not None]
    if use_all_runs:
        return mapped_records, unmapped

    by_doc: dict[str, list[PredictionRecord]] = {}
    for record in mapped_records:
        if record.doc_id is None:
            continue
        by_doc.setdefault(record.doc_id, []).append(record)

    selected: list[PredictionRecord] = []
    for doc_id in sorted(by_doc):
        latest = max(by_doc[doc_id], key=lambda record: record.modified_time)
        selected.append(latest)
    return selected, unmapped


def aggregate_results(
    dataset_docs: dict[str, DatasetDocument],
    evaluations: list[DocEvaluation],
    missing_docs: list[str],
    skipped_files: list[str],
    unmapped_predictions: list[str],
) -> dict[str, Any]:
    field_correct_totals = {field: 0 for field in SCORING_FIELDS}
    field_total_totals = {field: 0 for field in SCORING_FIELDS}
    matched_total = 0
    gt_total = 0
    pred_total = 0
    dose_units_present_total = 0
    discontinued_inclusion_count = 0

    for evaluation in evaluations:
        matched_total += evaluation.matched_medications
        gt_total += evaluation.gt_medications
        pred_total += evaluation.predicted_medications
        dose_units_present_total += evaluation.dose_units_present
        discontinued_inclusion_count += len(evaluation.discontinued_included)
        for field in SCORING_FIELDS:
            field_correct_totals[field] += evaluation.field_correct_counts[field]
            field_total_totals[field] += evaluation.field_total_counts[field]

    field_accuracy_by_field = {
        field: (
            field_correct_totals[field] / field_total_totals[field]
            if field_total_totals[field]
            else 0.0
        )
        for field in SCORING_FIELDS
    }
    total_field_correct = sum(field_correct_totals.values())
    total_field_count = sum(field_total_totals.values())
    overall_field_accuracy = (total_field_correct / total_field_count) if total_field_count else 0.0

    medication_precision = matched_total / pred_total if pred_total else 0.0
    medication_recall = matched_total / gt_total if gt_total else 0.0
    medication_f1 = (
        2 * medication_precision * medication_recall / (medication_precision + medication_recall)
        if (medication_precision + medication_recall)
        else 0.0
    )

    dose_unit_presence_rate = dose_units_present_total / pred_total if pred_total else 0.0
    discontinued_inclusion_rate = discontinued_inclusion_count / pred_total if pred_total else 0.0

    return {
        "coverage": {
            "datasetDocuments": len(dataset_docs),
            "documentsEvaluated": len(evaluations),
            "documentsMissingPrediction": len(missing_docs),
            "missingDocumentIds": missing_docs,
            "skippedPredictionFiles": skipped_files,
            "unmappedPredictionFiles": unmapped_predictions,
        },
        "overallMetrics": {
            "fieldAccuracy": overall_field_accuracy,
            "fieldAccuracyByField": field_accuracy_by_field,
            "medicationPrecision": medication_precision,
            "medicationRecall": medication_recall,
            "medicationF1": medication_f1,
            "doseUnitPresenceRate": dose_unit_presence_rate,
            "discontinuedInclusionRate": discontinued_inclusion_rate,
            "discontinuedInclusionCount": discontinued_inclusion_count,
            "totalPredictedMedications": pred_total,
            "totalGroundTruthMedications": gt_total,
            "matchedMedications": matched_total,
        },
    }


def round_metrics(payload: Any) -> Any:
    if isinstance(payload, float):
        return round(payload, 4)
    if isinstance(payload, dict):
        return {key: round_metrics(value) for key, value in payload.items()}
    if isinstance(payload, list):
        return [round_metrics(item) for item in payload]
    return payload


def build_markdown_report(summary: dict[str, Any], evaluations: list[DocEvaluation]) -> str:
    coverage = summary["coverage"]
    metrics = summary["overallMetrics"]
    lines: list[str] = []
    lines.append("# Regimen Extraction Evaluation")
    lines.append("")
    lines.append("## Coverage")
    lines.append(
        f"- Dataset documents: {coverage['datasetDocuments']}"
    )
    lines.append(
        f"- Documents evaluated: {coverage['documentsEvaluated']}"
    )
    lines.append(
        f"- Missing predictions: {coverage['documentsMissingPrediction']}"
    )
    if coverage["missingDocumentIds"]:
        lines.append(f"- Missing document IDs: {', '.join(coverage['missingDocumentIds'])}")
    if coverage["unmappedPredictionFiles"]:
        lines.append(f"- Unmapped prediction files: {len(coverage['unmappedPredictionFiles'])}")
    if coverage["skippedPredictionFiles"]:
        lines.append(f"- Skipped prediction files: {len(coverage['skippedPredictionFiles'])}")

    lines.append("")
    lines.append("## Overall Metrics")
    lines.append(f"- Field accuracy: {metrics['fieldAccuracy']:.2%}")
    lines.append(f"- Medication precision: {metrics['medicationPrecision']:.2%}")
    lines.append(f"- Medication recall: {metrics['medicationRecall']:.2%}")
    lines.append(f"- Medication F1: {metrics['medicationF1']:.2%}")
    lines.append(f"- Dose-unit presence rate: {metrics['doseUnitPresenceRate']:.2%}")
    lines.append(f"- Discontinued inclusion rate: {metrics['discontinuedInclusionRate']:.2%}")
    lines.append("")
    lines.append("### Field Accuracy Breakdown")
    for field, value in metrics["fieldAccuracyByField"].items():
        lines.append(f"- {field}: {value:.2%}")

    lines.append("")
    lines.append("## Per-Document Errors")
    if not evaluations:
        lines.append("- No evaluations were generated.")
    else:
        worst_docs = sorted(evaluations, key=lambda item: item.field_accuracy)
        for evaluation in worst_docs:
            lines.append(f"- {evaluation.doc_id}: field accuracy {evaluation.field_accuracy:.2%}")
            lines.append(f"  prediction: `{evaluation.prediction_path}`")
            if evaluation.missing_medications:
                lines.append(
                    f"  missing medications: {', '.join(evaluation.missing_medications)}"
                )
            if evaluation.extra_medications:
                lines.append(f"  extra medications: {', '.join(evaluation.extra_medications)}")
            if evaluation.discontinued_included:
                lines.append(
                    "  discontinued included: "
                    + ", ".join(evaluation.discontinued_included)
                )
            if evaluation.field_mismatches:
                lines.append("  sample mismatches:")
                for mismatch in evaluation.field_mismatches[:5]:
                    lines.append(f"    - {mismatch}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    dataset_path = args.dataset.expanduser().resolve()
    predictions_dir = args.predictions_dir.expanduser().resolve()
    prediction_files = [path.expanduser().resolve() for path in args.prediction_file]
    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {dataset_path}")

    dataset_docs = load_dataset(dataset_path)
    dataset_ids = set(dataset_docs.keys())
    if not dataset_docs:
        raise ValueError("Dataset did not contain any valid documents.")

    prediction_paths = collect_prediction_files(predictions_dir, prediction_files)
    records, skipped_files = load_prediction_records(prediction_paths, dataset_ids)
    selected_records, unmapped_predictions = select_predictions(records, args.use_all_runs)

    predictions_by_doc: dict[str, PredictionRecord] = {}
    for record in selected_records:
        if record.doc_id is None:
            continue
        # In --use-all-runs mode, latest record wins here for missing-doc lookup,
        # but each record is still evaluated separately below.
        predictions_by_doc[record.doc_id] = max(
            record,
            predictions_by_doc.get(record.doc_id, record),
            key=lambda item: item.modified_time,
        )

    missing_docs = sorted(doc_id for doc_id in dataset_ids if doc_id not in predictions_by_doc)
    evaluations: list[DocEvaluation] = []
    for record in selected_records:
        if record.doc_id is None:
            continue
        doc = dataset_docs[record.doc_id]
        evaluations.append(evaluate_document(doc, record))

    summary = aggregate_results(dataset_docs, evaluations, missing_docs, skipped_files, unmapped_predictions)
    summary_payload = {
        "datasetPath": str(dataset_path),
        "predictionsDir": str(predictions_dir),
        "predictionFilesScanned": [str(path) for path in prediction_paths],
        **summary,
        "documents": [evaluation.to_dict() for evaluation in evaluations],
    }
    rounded_summary = round_metrics(summary_payload)

    summary_json_path = output_dir / args.summary_json
    report_md_path = output_dir / args.report_md
    summary_json_path.write_text(json.dumps(rounded_summary, indent=2) + "\n", encoding="utf-8")
    report_md_path.write_text(build_markdown_report(rounded_summary, evaluations), encoding="utf-8")

    metrics = rounded_summary["overallMetrics"]
    coverage = rounded_summary["coverage"]
    print(f"Saved evaluation summary: {summary_json_path}")
    print(f"Saved evaluation report:  {report_md_path}")
    print(f"Field accuracy: {metrics['fieldAccuracy']:.2%}")
    print(f"Medication precision/recall: {metrics['medicationPrecision']:.2%} / {metrics['medicationRecall']:.2%}")
    print(f"Dose-unit presence rate: {metrics['doseUnitPresenceRate']:.2%}")
    print(
        "Coverage: "
        f"{coverage['documentsEvaluated']}/{coverage['datasetDocuments']} docs evaluated "
        f"({coverage['documentsMissingPrediction']} missing)"
    )

    if args.fail_on_missing_docs and coverage["documentsMissingPrediction"] > 0:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
