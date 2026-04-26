#!/usr/bin/env python3
"""Run robustness matrix for Gemma regimen extraction on synthetic docs."""

from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = REPO_ROOT / "ml_pipeline/data/chf_synthetic_discharge_summaries_v1.json"
IMAGES_ROOT = REPO_ROOT / "ml_pipeline/ex_images"
OUTPUT_ROOT = REPO_ROOT / "ml_pipeline/out"
EXTRACTIONS_ROOT = OUTPUT_ROOT / "extractions"
MANIFEST_PATH = OUTPUT_ROOT / "robustness_manifest.csv"
REPORT_PATH = OUTPUT_ROOT / "robustness_report.md"

VARIANTS = ("clean", "angled_phone", "noisy_shadow")
MANIFEST_COLUMNS = [
    "doc_id",
    "variant",
    "image_path",
    "status",
    "run_folder",
    "regimen_json_path",
    "raw_output_path",
    "error_message",
]


@dataclass
class RunRecord:
    doc_id: str
    variant: str
    image_path: str
    status: str
    run_folder: str
    regimen_json_path: str
    raw_output_path: str
    error_message: str

    def to_csv_row(self) -> dict[str, str]:
        return {
            "doc_id": self.doc_id,
            "variant": self.variant,
            "image_path": self.image_path,
            "status": self.status,
            "run_folder": self.run_folder,
            "regimen_json_path": self.regimen_json_path,
            "raw_output_path": self.raw_output_path,
            "error_message": self.error_message,
        }


def relpath_str(path: Path | None) -> str:
    if path is None:
        return ""
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except Exception:
        return str(path)


def load_documents() -> list[dict[str, object]]:
    payload = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    docs = payload.get("documents", [])
    if not isinstance(docs, list):
        raise ValueError("Dataset 'documents' must be a list.")
    return docs


def load_font(size: int) -> ImageFont.ImageFont:
    for candidate in ("DejaVuSans.ttf", "Arial.ttf", "Helvetica.ttc"):
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def wrap_line(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    if not text.strip():
        return [""]

    words = text.split()
    lines: list[str] = []
    current = words[0]

    for word in words[1:]:
        trial = f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word

    lines.append(current)
    return lines


def render_clean_image(lines: list[str], out_path: Path) -> None:
    width = 1800
    margin = 90
    font = load_font(34)
    line_height = 48

    scratch = Image.new("RGB", (width, 10), color=(255, 255, 255))
    scratch_draw = ImageDraw.Draw(scratch)

    wrapped_lines: list[str] = []
    max_text_width = width - (2 * margin)
    for line in lines:
        wrapped_lines.extend(wrap_line(scratch_draw, str(line), font, max_text_width))

    height = max(1800, margin * 2 + line_height * len(wrapped_lines) + 60)
    image = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(image)

    y = margin
    for line in wrapped_lines:
        draw.text((margin, y), line, fill=(15, 15, 15), font=font)
        y += line_height

    image = ImageOps.expand(image, border=10, fill=(230, 230, 230))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(out_path, format="JPEG", quality=95, optimize=True)


def render_angled_phone_image(clean_path: Path, out_path: Path) -> None:
    clean = Image.open(clean_path).convert("RGB")
    skewed = clean.transform(
        (int(clean.width * 1.05), int(clean.height * 1.03)),
        Image.Transform.AFFINE,
        data=(1.0, -0.06, clean.width * 0.03, 0.02, 1.0, 0),
        resample=Image.Resampling.BICUBIC,
        fillcolor=(245, 245, 245),
    )
    skewed = ImageEnhance.Contrast(skewed).enhance(1.08)
    skewed = ImageEnhance.Brightness(skewed).enhance(0.95)

    shadow = Image.new("RGBA", (skewed.width + 50, skewed.height + 50), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rectangle((25, 25, skewed.width + 25, skewed.height + 25), fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))

    canvas = Image.new("RGBA", (skewed.width + 320, skewed.height + 320), (28, 28, 28, 255))
    canvas.alpha_composite(shadow, dest=(130, 140))
    canvas.alpha_composite(skewed.convert("RGBA"), dest=(140, 120))
    tilted = canvas.rotate(-5.3, expand=True, resample=Image.Resampling.BICUBIC, fillcolor=(24, 24, 24, 255))
    tilted.convert("RGB").save(out_path, format="JPEG", quality=88, subsampling=0)


def render_noisy_shadow_image(clean_path: Path, out_path: Path) -> None:
    base = Image.open(clean_path).convert("RGB")
    width, height = base.size

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse(
        (-int(width * 0.35), int(height * 0.18), int(width * 0.85), int(height * 1.45)),
        fill=(0, 0, 0, 135),
    )
    shadow_draw.rectangle((0, int(height * 0.7), width, height), fill=(0, 0, 0, 45))
    shadow = shadow.filter(ImageFilter.GaussianBlur(80))

    shaded = base.convert("RGBA")
    shaded.alpha_composite(shadow)
    shaded_rgb = shaded.convert("RGB")

    noise_gray = Image.effect_noise(shaded_rgb.size, 20).convert("L")
    noise_rgb = Image.merge("RGB", (noise_gray, noise_gray, noise_gray))
    noisy = Image.blend(shaded_rgb, noise_rgb, alpha=0.12)
    noisy = noisy.filter(ImageFilter.GaussianBlur(0.5))
    noisy = ImageEnhance.Contrast(noisy).enhance(1.08)
    noisy = ImageEnhance.Brightness(noisy).enhance(0.9)
    noisy.save(out_path, format="JPEG", quality=82, subsampling=1)


def ensure_images(doc_id: str, summary_lines: list[str]) -> dict[str, tuple[Path | None, str]]:
    doc_dir = IMAGES_ROOT / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)

    generated: dict[str, tuple[Path | None, str]] = {}
    clean_path = doc_dir / "clean.jpeg"
    angled_path = doc_dir / "angled_phone.jpeg"
    noisy_path = doc_dir / "noisy_shadow.jpeg"

    try:
        render_clean_image(summary_lines, clean_path)
        generated["clean"] = (clean_path, "")
    except Exception as exc:
        generated["clean"] = (None, f"clean image generation error: {exc}")

    if generated["clean"][0] is None:
        generated["angled_phone"] = (None, "clean image unavailable for angled_phone generation")
        generated["noisy_shadow"] = (None, "clean image unavailable for noisy_shadow generation")
        return generated

    try:
        render_angled_phone_image(clean_path, angled_path)
        generated["angled_phone"] = (angled_path, "")
    except Exception as exc:
        generated["angled_phone"] = (None, f"angled_phone generation error: {exc}")

    try:
        render_noisy_shadow_image(clean_path, noisy_path)
        generated["noisy_shadow"] = (noisy_path, "")
    except Exception as exc:
        generated["noisy_shadow"] = (None, f"noisy_shadow generation error: {exc}")

    return generated


def parse_run_folder(stdout: str) -> Path | None:
    for line in stdout.splitlines():
        if line.startswith("Run folder:"):
            raw_path = line.split("Run folder:", 1)[1].strip()
            if raw_path:
                return Path(raw_path)
    return None


def list_matching_run_dirs(prefix: str) -> list[Path]:
    if not EXTRACTIONS_ROOT.exists():
        return []
    dirs = [entry for entry in EXTRACTIONS_ROOT.iterdir() if entry.is_dir() and entry.name.startswith(prefix)]
    return sorted(dirs, key=lambda path: path.stat().st_mtime)


def find_new_run_dir(prefix: str, before_names: set[str]) -> Path | None:
    for candidate in reversed(list_matching_run_dirs(prefix)):
        if candidate.name not in before_names:
            return candidate
    return None


def shorten_error(message: str, limit: int = 600) -> str:
    if not message:
        return ""
    message = re.sub(r"\x1b\[[0-9;]*[mK]", "", message).strip()
    if len(message) <= limit:
        return message
    return message[: limit - 3].rstrip() + "..."


def extract_error_message(stdout: str, stderr: str, returncode: int) -> str:
    stderr = stderr.strip()
    stdout = stdout.strip()
    text = stderr or stdout or f"Extractor exited with return code {returncode}"
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return f"Extractor exited with return code {returncode}"
    if lines[-1].lower().startswith(
        (
            "runtimeerror:",
            "valueerror:",
            "environmenterror:",
            "filenotfounderror:",
            "jsondecodeerror:",
            "permissionerror:",
        )
    ):
        return lines[-1]
    return lines[-1] if len(lines) < 3 else " | ".join(lines[-3:])


def classify_failure(error_message: str) -> str:
    text = error_message.lower()
    if any(
        token in text
        for token in (
            "api key",
            "google_api_key",
            "quota",
            "rate limit",
            "429",
            "503",
            "deadline exceeded",
            "timeout",
            "permission denied",
            "unauthorized",
            "service unavailable",
        )
    ):
        return "API error"
    if "not valid json" in text or ("json" in text and "parse" in text):
        return "parsing failure"
    if any(
        token in text
        for token in (
            "schema-valid",
            "validation failed",
            "must include",
            "must not be empty",
            "must contain explicit dose unit",
            "invalid time format",
        )
    ):
        return "validation failure"
    if "image not found" in text:
        return "image error"
    return "other failure"


def canonicalize_error(error_message: str) -> str:
    first_line = error_message.splitlines()[0].strip() if error_message else "unknown"
    first_line = re.sub(r"/Users/[^\s]+", "<path>", first_line)
    first_line = re.sub(r"\b\d{4,}\b", "<num>", first_line)
    return first_line[:220]


def run_single_extraction(doc_id: str, variant: str, image_path: Path) -> tuple[str, Path | None, Path | None, str]:
    prefix = f"{variant}_1p_"
    before_names = {path.name for path in list_matching_run_dirs(prefix)}

    cmd = [
        sys.executable,
        str(REPO_ROOT / "ml_pipeline/extract_regimen_gemma.py"),
        "--image",
        str(image_path),
        "--patient-id",
        f"{doc_id}-{variant}",
        "--output",
        "regimen.json",
        "--raw-output",
        "raw_model_response.txt",
        "--output-root",
        str(EXTRACTIONS_ROOT),
        "--pretty",
    ]
    result = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True)

    run_folder = parse_run_folder(result.stdout)
    if run_folder is None:
        run_folder = find_new_run_dir(prefix, before_names)

    regimen_path = run_folder / "regimen.json" if run_folder else None
    raw_output_path = run_folder / "raw_model_response.txt" if run_folder else None

    if result.returncode == 0:
        return "success", run_folder, regimen_path, ""

    error_message = extract_error_message(result.stdout, result.stderr, result.returncode)
    return "failed", run_folder, raw_output_path, shorten_error(error_message)


def write_manifest(records: list[RunRecord]) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST_PATH.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=MANIFEST_COLUMNS)
        writer.writeheader()
        for record in records:
            writer.writerow(record.to_csv_row())


def build_failure_sections(records: list[RunRecord]) -> tuple[dict[str, list[RunRecord]], list[tuple[str, list[RunRecord]]]]:
    failed_records = [record for record in records if record.status == "failed"]
    grouped_by_reason: dict[str, list[RunRecord]] = defaultdict(list)
    for record in failed_records:
        grouped_by_reason[classify_failure(record.error_message)].append(record)

    pattern_groups: dict[str, list[RunRecord]] = defaultdict(list)
    for record in failed_records:
        reason = classify_failure(record.error_message)
        signature = canonicalize_error(record.error_message)
        pattern_groups[f"{reason} :: {signature}"].append(record)

    top_patterns = sorted(pattern_groups.items(), key=lambda item: len(item[1]), reverse=True)[:5]
    return grouped_by_reason, top_patterns


def variant_stats(records: list[RunRecord]) -> dict[str, Counter]:
    stats: dict[str, Counter] = {}
    for variant in VARIANTS:
        stats[variant] = Counter(record.status for record in records if record.variant == variant)
    return stats


def sensitivity_notes(stats: dict[str, Counter]) -> list[str]:
    notes: list[str] = []
    rates: dict[str, float] = {}

    for variant in VARIANTS:
        success = stats[variant].get("success", 0)
        failed = stats[variant].get("failed", 0)
        available = success + failed
        rates[variant] = (success / available) if available else 0.0

    if rates:
        best = max(rates, key=rates.get)
        worst = min(rates, key=rates.get)
        notes.append(
            f"- Highest reliability among available images: `{best}` "
            f"({rates[best] * 100:.1f}% success on non-missing images)."
        )
        notes.append(
            f"- Most sensitive condition: `{worst}` "
            f"({rates[worst] * 100:.1f}% success on non-missing images)."
        )

    for variant in VARIANTS:
        success = stats[variant].get("success", 0)
        failed = stats[variant].get("failed", 0)
        missing = stats[variant].get("missing_image", 0)
        notes.append(
            f"- `{variant}`: success={success}, failed={failed}, missing={missing}."
        )
    return notes


def write_report(records: list[RunRecord]) -> None:
    total = len(records)
    success_count = sum(1 for record in records if record.status == "success")
    failed_count = sum(1 for record in records if record.status == "failed")
    missing_count = sum(1 for record in records if record.status == "missing_image")

    grouped_by_reason, top_patterns = build_failure_sections(records)
    stats = variant_stats(records)
    notes = sensitivity_notes(stats)

    lines: list[str] = []
    lines.append("# Regimen Extraction Robustness Report")
    lines.append("")
    lines.append("## Run Summary")
    lines.append(f"- total attempted: {total}")
    lines.append(f"- success count: {success_count}")
    lines.append(f"- failed count: {failed_count}")
    lines.append(f"- missing images: {missing_count}")
    lines.append("")
    lines.append("## Failures Grouped by Reason")

    if not grouped_by_reason:
        lines.append("- No extraction failures.")
    else:
        for reason, reason_records in sorted(grouped_by_reason.items(), key=lambda item: len(item[1]), reverse=True):
            lines.append(f"- **{reason}** ({len(reason_records)})")
            for example in reason_records[:3]:
                lines.append(
                    f"  - `{example.doc_id}-{example.variant}`: {example.error_message}"
                )

    lines.append("")
    lines.append("## Image-Type Sensitivity Notes")
    lines.extend(notes)

    lines.append("")
    lines.append("## Top 5 Failure Patterns")
    if not top_patterns:
        lines.append("- No failure patterns (all available runs succeeded).")
    else:
        for index, (pattern, pattern_records) in enumerate(top_patterns, start=1):
            example = pattern_records[0]
            lines.append(
                f"{index}. {pattern} (count={len(pattern_records)}) - "
                f"example: `{example.doc_id}-{example.variant}` -> {example.error_message}"
            )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    EXTRACTIONS_ROOT.mkdir(parents=True, exist_ok=True)

    documents = load_documents()
    records: list[RunRecord] = []

    for doc in documents:
        doc_id = str(doc.get("id", "")).strip()
        summary_lines = doc.get("dischargeSummaryLines", [])
        if not doc_id:
            continue
        if not isinstance(summary_lines, list):
            summary_lines = [str(summary_lines)]

        image_results = ensure_images(doc_id, [str(line) for line in summary_lines])

        for variant in VARIANTS:
            expected_path = IMAGES_ROOT / doc_id / f"{variant}.jpeg"
            generated_path, generation_error = image_results.get(variant, (None, "image generation not attempted"))

            if generated_path is None or not expected_path.exists():
                records.append(
                    RunRecord(
                        doc_id=doc_id,
                        variant=variant,
                        image_path=relpath_str(expected_path),
                        status="missing_image",
                        run_folder="",
                        regimen_json_path="",
                        raw_output_path="",
                        error_message=shorten_error(generation_error or "missing image"),
                    )
                )
                continue

            status, run_folder, output_path, error_message = run_single_extraction(
                doc_id=doc_id,
                variant=variant,
                image_path=expected_path,
            )
            regimen_path = output_path if status == "success" else (run_folder / "regimen.json" if run_folder else None)
            raw_path = run_folder / "raw_model_response.txt" if run_folder else None

            records.append(
                RunRecord(
                    doc_id=doc_id,
                    variant=variant,
                    image_path=relpath_str(expected_path),
                    status=status,
                    run_folder=relpath_str(run_folder),
                    regimen_json_path=relpath_str(regimen_path if regimen_path and regimen_path.exists() else None),
                    raw_output_path=relpath_str(raw_path if raw_path and raw_path.exists() else None),
                    error_message=error_message,
                )
            )

    write_manifest(records)
    write_report(records)

    total = len(records)
    success_count = sum(1 for record in records if record.status == "success")
    failed_count = sum(1 for record in records if record.status == "failed")
    missing_count = sum(1 for record in records if record.status == "missing_image")

    print(f"Wrote manifest: {relpath_str(MANIFEST_PATH)}")
    print(f"Wrote report: {relpath_str(REPORT_PATH)}")
    print(
        f"Counts -> attempted={total}, success={success_count}, failed={failed_count}, missing_image={missing_count}"
    )


if __name__ == "__main__":
    main()
