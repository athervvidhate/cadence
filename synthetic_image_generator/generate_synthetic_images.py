#!/usr/bin/env python3
"""Generate synthetic discharge-sheet photos from YAML prompt matrix.

This utility is intentionally separate from `ml_pipeline` runtime code.

Example:
  export SYNTHETIC_IMAGES_GOOGLE_API_KEY="YOUR_SEPARATE_KEY"
  python synthetic_image_generator/generate_synthetic_images.py \
    --model "gemini-2.5-flash-image-preview" \
    --matrix "ml_pipeline/ex_images_hard_prompts/prompt_matrix.yaml" \
    --overwrite
"""

from __future__ import annotations

import argparse
import base64
import difflib
import io
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import yaml
except ModuleNotFoundError as exc:
    raise SystemExit("PyYAML is required. Install with: pip install PyYAML") from exc

try:
    from google import genai
    from google.genai import types
except ModuleNotFoundError as exc:
    raise SystemExit("google-genai is required. Install with: pip install google-genai") from exc

try:
    from PIL import Image
except ModuleNotFoundError:
    Image = None


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MATRIX_PATH = REPO_ROOT / "ml_pipeline/ex_images_hard_prompts/prompt_matrix.yaml"
DEFAULT_MODEL = os.getenv("SYNTH_IMAGE_MODEL", "gemini-2.5-flash-image-preview")
DEFAULT_API_KEY_ENV = "SYNTHETIC_IMAGES_GOOGLE_API_KEY"


@dataclass(frozen=True)
class Target:
    image_path: Path
    doc_id: str
    variant: str


class QuotaExceededError(RuntimeError):
    def __init__(
        self,
        message: str,
        retry_after_seconds: float | None = None,
        hard_limit: bool = False,
    ) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds
        self.hard_limit = hard_limit

    def __str__(self) -> str:
        base = super().__str__()
        if self.retry_after_seconds is not None:
            return f"{base} (retry_after={self.retry_after_seconds:.1f}s)"
        return base


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Loop through prompt_matrix YAML and generate synthetic images to local disk "
            "using a Gemini image-capable model."
        )
    )
    parser.add_argument(
        "--matrix",
        type=Path,
        default=DEFAULT_MATRIX_PATH,
        help="Path to prompt matrix YAML.",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help="Gemini image model (for example: gemini-2.5-flash-image-preview).",
    )
    parser.add_argument(
        "--api-key-env",
        default=DEFAULT_API_KEY_ENV,
        help="Environment variable name containing dedicated image-generation API key.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=REPO_ROOT,
        help=(
            "Base path used for relative image_path entries in YAML. "
            "Defaults to repository root."
        ),
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing files. Without this flag, existing images are skipped.",
    )
    parser.add_argument(
        "--doc-id",
        action="append",
        default=[],
        help="Filter to one or more doc IDs (repeat flag).",
    )
    parser.add_argument(
        "--variant",
        action="append",
        default=[],
        help="Filter to one or more variants (repeat flag).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional max number of targets to process after filtering.",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=2,
        help="Retries per image generation after first attempt.",
    )
    parser.add_argument(
        "--retry-sleep-seconds",
        type=float,
        default=2.0,
        help="Base sleep time before retry; multiplied by attempt number.",
    )
    parser.add_argument(
        "--inter-request-sleep-seconds",
        type=float,
        default=0.25,
        help="Short delay between successful requests.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be generated without calling the API.",
    )
    parser.add_argument(
        "--list-models",
        action="store_true",
        help="List available model names for this key and exit.",
    )
    parser.add_argument(
        "--api-version",
        default="v1beta",
        help="Gemini API version for SDK requests (for example: v1beta, v1alpha).",
    )
    return parser.parse_args()


def load_matrix(path: Path) -> dict[str, Any]:
    matrix_path = path.expanduser().resolve()
    if not matrix_path.exists():
        raise FileNotFoundError(f"Prompt matrix not found: {matrix_path}")

    payload = yaml.safe_load(matrix_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Prompt matrix YAML must parse to a mapping/object.")

    for key in ("base_prompt", "variant_profiles", "documents", "targets"):
        if key not in payload:
            raise ValueError(f"Prompt matrix missing required key: {key}")
    return payload


def build_targets(payload: dict[str, Any]) -> list[Target]:
    raw_targets = payload.get("targets")
    if not isinstance(raw_targets, list):
        raise ValueError("'targets' must be a list in prompt matrix.")

    targets: list[Target] = []
    for raw in raw_targets:
        if not isinstance(raw, dict):
            raise ValueError(f"Invalid target entry (expected object): {raw!r}")
        image_path = Path(str(raw.get("image_path", "")).strip())
        doc_id = str(raw.get("doc_id", "")).strip()
        variant = str(raw.get("variant", "")).strip()
        if not image_path or not doc_id or not variant:
            raise ValueError(f"Invalid target entry (missing fields): {raw!r}")
        targets.append(Target(image_path=image_path, doc_id=doc_id, variant=variant))
    return targets


def filter_targets(targets: list[Target], args: argparse.Namespace) -> list[Target]:
    doc_filter = {value.strip() for value in args.doc_id if value.strip()}
    variant_filter = {value.strip() for value in args.variant if value.strip()}

    filtered = [
        target
        for target in targets
        if (not doc_filter or target.doc_id in doc_filter)
        and (not variant_filter or target.variant in variant_filter)
    ]
    if args.limit and args.limit > 0:
        filtered = filtered[: args.limit]
    return filtered


def resolve_output_path(target_path: Path, output_root: Path) -> Path:
    if target_path.is_absolute():
        return target_path
    return output_root.expanduser().resolve() / target_path


def build_prompt(payload: dict[str, Any], target: Target) -> str:
    base_prompt = str(payload["base_prompt"]).strip()
    variant_profiles = payload["variant_profiles"]
    documents = payload["documents"]

    if not isinstance(variant_profiles, dict):
        raise ValueError("'variant_profiles' must be a mapping.")
    if not isinstance(documents, dict):
        raise ValueError("'documents' must be a mapping.")
    if target.variant not in variant_profiles:
        raise ValueError(f"Variant profile missing: {target.variant}")
    if target.doc_id not in documents:
        raise ValueError(f"Document block missing: {target.doc_id}")

    doc_payload = documents[target.doc_id]
    if not isinstance(doc_payload, dict):
        raise ValueError(f"Document entry for {target.doc_id} must be an object.")
    discharge_text = str(doc_payload.get("discharge_text", "")).strip()
    if not discharge_text:
        raise ValueError(f"Document {target.doc_id} missing discharge_text.")

    variant_prompt = str(variant_profiles[target.variant]).strip()

    return (
        f"{base_prompt}\n\n"
        f"Variant-specific capture conditions:\n{variant_prompt}\n\n"
        "Render exactly this discharge sheet text:\n"
        f"{discharge_text}\n\n"
        "Output a single image only. Keep all medication data exactly as written."
    )


def _decode_inline_data(data: Any) -> bytes:
    if isinstance(data, bytes):
        return data
    if isinstance(data, str):
        try:
            return base64.b64decode(data)
        except Exception:
            return data.encode("utf-8")
    raise TypeError(f"Unsupported inline image data type: {type(data)!r}")


def _iter_response_parts(response: Any) -> list[Any]:
    direct_parts = getattr(response, "parts", None)
    if direct_parts:
        return list(direct_parts)

    all_parts: list[Any] = []
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        all_parts.extend(parts)
    return all_parts


def _extract_image_from_part(part: Any) -> tuple[bytes, str] | None:
    inline_data = getattr(part, "inline_data", None)
    if inline_data is not None:
        data = getattr(inline_data, "data", None)
        if data:
            mime_type = getattr(inline_data, "mime_type", None) or "image/png"
            return _decode_inline_data(data), mime_type

    # SDK helper path used in official examples.
    as_image = getattr(part, "as_image", None)
    if callable(as_image):
        try:
            image_obj = as_image()
        except Exception:
            image_obj = None
        if image_obj is not None:
            buffer = io.BytesIO()
            image_obj.save(buffer, format="PNG")
            return buffer.getvalue(), "image/png"
    return None


def _extract_image_from_content_response(response: Any) -> tuple[bytes, str] | None:
    for part in _iter_response_parts(response):
        extracted = _extract_image_from_part(part)
        if extracted:
            return extracted
    return None


def _extract_image_from_images_response(response: Any) -> tuple[bytes, str] | None:
    generated_images = getattr(response, "generated_images", None) or []
    for generated in generated_images:
        image_obj = getattr(generated, "image", None)
        if image_obj is None:
            continue

        image_bytes = getattr(image_obj, "image_bytes", None)
        mime_type = getattr(image_obj, "mime_type", None) or "image/png"
        if image_bytes:
            return image_bytes, mime_type

        if hasattr(image_obj, "save"):
            buffer = io.BytesIO()
            image_obj.save(buffer, format="PNG")
            return buffer.getvalue(), "image/png"
    return None


def generate_image_bytes(
    client: genai.Client,
    model: str,
    prompt: str,
) -> tuple[bytes, str, str]:
    modality_configs: list[tuple[str, Any | None]] = [
        ("default", None),
        ("IMAGE", types.GenerateContentConfig(response_modalities=["IMAGE"])),
        ("TEXT_IMAGE", types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"])),
    ]
    modality_enum = getattr(types, "Modality", None)
    if modality_enum is not None and hasattr(modality_enum, "IMAGE"):
        modality_configs.append(
            (
                "enum_IMAGE",
                types.GenerateContentConfig(response_modalities=[modality_enum.IMAGE]),
            )
        )
    if (
        modality_enum is not None
        and hasattr(modality_enum, "TEXT")
        and hasattr(modality_enum, "IMAGE")
    ):
        modality_configs.append(
            (
                "enum_TEXT_IMAGE",
                types.GenerateContentConfig(
                    response_modalities=[modality_enum.TEXT, modality_enum.IMAGE]
                ),
            )
        )

    errors: list[str] = []
    for config_name, config in modality_configs:
        try:
            request_kwargs: dict[str, Any] = {
                "model": model,
                "contents": [prompt],
            }
            if config is not None:
                request_kwargs["config"] = config
            response = client.models.generate_content(**request_kwargs)
            extracted = _extract_image_from_content_response(response)
            if extracted:
                data, mime_type = extracted
                return data, mime_type, f"generate_content({config_name})"

            text_fragments: list[str] = []
            for part in _iter_response_parts(response):
                text = getattr(part, "text", None)
                if text:
                    text_fragments.append(str(text).strip())
            if text_fragments:
                excerpt = " ".join(text_fragments)[:220]
                errors.append(
                    f"generate_content({config_name}) returned no image parts; "
                    f"text excerpt: {excerpt!r}"
                )
            else:
                errors.append(
                    f"generate_content({config_name}) returned no image parts."
                )
        except Exception as exc:
            err_text = str(exc)
            if is_quota_exceeded_error(err_text):
                raise QuotaExceededError(
                    message=build_quota_message(err_text),
                    retry_after_seconds=extract_retry_after_seconds(err_text),
                    hard_limit=is_hard_quota_block(err_text),
                ) from exc
            errors.append(f"generate_content({config_name}) error: {exc}")
            continue

    model_name = normalize_model_name(model).lower()
    if model_name.startswith("imagen-"):
        generate_images = getattr(client.models, "generate_images", None)
        generate_images_config = getattr(types, "GenerateImagesConfig", None)
        if generate_images is None or generate_images_config is None:
            raise RuntimeError(
                "No image bytes returned via generate_content, and generate_images API "
                "is unavailable in this google-genai version."
            )

        response = generate_images(
            model=model,
            prompt=prompt,
            config=generate_images_config(number_of_images=1),
        )
        extracted = _extract_image_from_images_response(response)
        if extracted:
            data, mime_type = extracted
            return data, mime_type, "generate_images"
        errors.append("generate_images returned no image bytes.")

    details = " | ".join(errors[:4]) if errors else "No additional details."
    raise RuntimeError(
        "Could not extract image bytes from generate_content response. "
        f"Details: {details}"
    )


def normalize_model_name(model_name: str) -> str:
    value = model_name.strip()
    if value.startswith("models/"):
        return value.split("/", 1)[1]
    return value


def list_available_models(client: genai.Client) -> list[tuple[str, list[str]]]:
    infos: list[tuple[str, list[str]]] = []
    seen: set[str] = set()
    for model in client.models.list():
        raw_name = str(getattr(model, "name", "")).strip()
        if not raw_name:
            continue
        name = normalize_model_name(raw_name)
        if name in seen:
            continue
        seen.add(name)

        methods_raw = getattr(model, "supported_generation_methods", None) or []
        methods = [str(method) for method in methods_raw]
        infos.append((name, methods))
    infos.sort(key=lambda item: item[0])
    return infos


def print_available_models(infos: list[tuple[str, list[str]]]) -> None:
    if not infos:
        print("No models returned by ListModels.")
        return

    image_candidates = [name for name, _ in infos if "image" in name.lower()]
    if image_candidates:
        print("Image-related models:")
        for name in image_candidates:
            print(f"- {name}")
        print("")

    print("All available models:")
    for name, methods in infos:
        methods_text = ", ".join(methods) if methods else "methods unknown"
        print(f"- {name} [{methods_text}]")


def validate_requested_model(
    requested_model: str,
    available_model_infos: list[tuple[str, list[str]]],
) -> str:
    requested = normalize_model_name(requested_model)
    method_map = {name: methods for name, methods in available_model_infos}
    available_names = list(method_map.keys())
    available_set = set(available_names)
    if requested in available_set:
        methods = method_map.get(requested, [])
        if methods and not any("generatecontent" in method.lower() for method in methods):
            raise ValueError(
                f"Model '{requested}' exists but does not advertise generateContent support. "
                f"Supported methods: {', '.join(methods)}"
            )
        return requested

    image_candidates = [name for name in available_names if "image" in name.lower()]
    base_pool = image_candidates if image_candidates else available_names
    suggestions = difflib.get_close_matches(requested, base_pool, n=5, cutoff=0.35)
    if not suggestions and image_candidates:
        suggestions = image_candidates[:5]
    suggestion_text = ", ".join(suggestions) if suggestions else "none found"

    raise ValueError(
        f"Requested model '{requested_model}' is not available for this API key/version. "
        f"Suggestions: {suggestion_text}. Run with --list-models to inspect full list."
    )


def is_model_not_found_error(message: str) -> bool:
    text = message.lower()
    return "not_found" in text or ("model" in text and "not found" in text)


def is_quota_exceeded_error(message: str) -> bool:
    text = message.lower()
    return (
        "resource_exhausted" in text
        or "quota exceeded" in text
        or "status': 'resource_exhausted'" in text
        or "status\": \"resource_exhausted\"" in text
    )


def is_hard_quota_block(message: str) -> bool:
    text = message.lower()
    return "perday" in text and "limit: 0" in text


def extract_retry_after_seconds(message: str) -> float | None:
    patterns = [
        r"retry in ([0-9]+(?:\.[0-9]+)?)s",
        r"retrydelay':\s*'([0-9]+)s'",
        r"retrydelay\":\s*\"([0-9]+)s\"",
    ]
    text = message.lower()
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                continue
    return None


def build_quota_message(message: str) -> str:
    text = message.replace("\n", " ").strip()
    key_tokens = [
        "generate_content_free_tier_requests",
        "generate_content_free_tier_input_token_count",
        "generate requests per day",
        "generate requests per minute",
    ]
    snippets: list[str] = []
    lower = text.lower()
    for token in key_tokens:
        idx = lower.find(token)
        if idx >= 0:
            start = max(0, idx - 35)
            end = min(len(text), idx + len(token) + 70)
            snippets.append(text[start:end].strip(" :,-"))
    snippets = snippets[:2]
    detail = f" Details: {' | '.join(snippets)}." if snippets else ""
    return "Gemini quota exceeded for this model/key." + detail


def shorten_error(message: str, limit: int = 380) -> str:
    clean = " ".join(message.split())
    if len(clean) <= limit:
        return clean
    return clean[: limit - 3].rstrip() + "..."


def create_client(api_key: str, api_version: str) -> genai.Client:
    try:
        http_options = types.HttpOptions(api_version=api_version)
        return genai.Client(api_key=api_key, http_options=http_options)
    except Exception:
        # Backwards compatibility with older SDKs that do not expose HttpOptions.
        return genai.Client(api_key=api_key)


def coerce_image_bytes_to_target(
    image_bytes: bytes,
    source_mime: str,
    target_path: Path,
) -> tuple[bytes, str]:
    suffix = target_path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        target_mime = "image/jpeg"
        target_format = "JPEG"
    elif suffix == ".png":
        target_mime = "image/png"
        target_format = "PNG"
    else:
        return image_bytes, source_mime

    if source_mime.lower() == target_mime:
        return image_bytes, source_mime

    if Image is None:
        raise RuntimeError(
            "Model returned image bytes with a different mime type than the target file "
            f"extension ({source_mime} -> {target_path.suffix}). Install Pillow to convert."
        )

    with Image.open(io.BytesIO(image_bytes)) as image:
        if target_format == "JPEG" and image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        buffer = io.BytesIO()
        save_kwargs: dict[str, Any] = {}
        if target_format == "JPEG":
            save_kwargs = {"quality": 95, "optimize": True}
        image.save(buffer, format=target_format, **save_kwargs)
        return buffer.getvalue(), target_mime


def main() -> None:
    args = parse_args()
    api_key = os.getenv(args.api_key_env, "").strip()
    if (not args.dry_run or args.list_models) and not api_key:
        raise EnvironmentError(
            f"Missing API key. Set dedicated key via environment variable: {args.api_key_env}"
        )

    payload = load_matrix(args.matrix)
    all_targets = build_targets(payload)
    selected_targets = filter_targets(all_targets, args)
    if not selected_targets:
        raise ValueError("No targets selected after applying filters.")

    output_root = args.output_root.expanduser().resolve()
    print(f"Matrix: {args.matrix.expanduser().resolve()}")
    print(f"Model: {args.model}")
    print(f"Targets selected: {len(selected_targets)} / {len(all_targets)}")
    print(f"Output root: {output_root}")
    print(f"API key env: {args.api_key_env}")
    print(f"API version: {args.api_version}")

    if args.list_models:
        client = create_client(api_key=api_key, api_version=args.api_version)
        infos = list_available_models(client)
        print_available_models(infos)
        return

    if args.dry_run:
        for index, target in enumerate(selected_targets, start=1):
            out_path = resolve_output_path(target.image_path, output_root)
            print(
                f"[dry-run {index}/{len(selected_targets)}] "
                f"{target.doc_id} {target.variant} -> {out_path}"
            )
        return

    client = create_client(api_key=api_key, api_version=args.api_version)
    selected_model = normalize_model_name(args.model)
    try:
        available_model_infos = list_available_models(client)
    except Exception as exc:
        available_model_infos = []
        print(f"Warning: could not preflight model list; proceeding without validation: {exc}")

    if available_model_infos:
        selected_model = validate_requested_model(selected_model, available_model_infos)
        if selected_model != args.model:
            print(f"Using normalized model name: {selected_model}")

    success_count = 0
    skipped_count = 0
    failed: list[tuple[Target, str]] = []

    for index, target in enumerate(selected_targets, start=1):
        out_path = resolve_output_path(target.image_path, output_root)
        if out_path.exists() and not args.overwrite:
            skipped_count += 1
            print(f"[{index}/{len(selected_targets)}] skip exists: {out_path}")
            continue

        prompt = build_prompt(payload, target)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        last_error = ""
        wrote = False
        for attempt in range(args.max_retries + 1):
            try:
                image_bytes, source_mime, method = generate_image_bytes(
                    client=client,
                    model=selected_model,
                    prompt=prompt,
                )
                image_bytes, output_mime = coerce_image_bytes_to_target(
                    image_bytes=image_bytes,
                    source_mime=source_mime,
                    target_path=out_path,
                )
                out_path.write_bytes(image_bytes)
                success_count += 1
                wrote = True
                print(
                    f"[{index}/{len(selected_targets)}] wrote {out_path} "
                    f"(variant={target.variant}, mime={output_mime}, via={method})"
                )
                if args.inter_request_sleep_seconds > 0:
                    time.sleep(args.inter_request_sleep_seconds)
                break
            except Exception as exc:
                last_error = shorten_error(str(exc))
                if is_model_not_found_error(last_error):
                    raise RuntimeError(
                        f"Model '{selected_model}' is unavailable for this key/version. "
                        "Run with --list-models and choose one of the returned image-capable models."
                    ) from exc
                if isinstance(exc, QuotaExceededError):
                    if exc.hard_limit:
                        print(
                            f"[{index}/{len(selected_targets)}] quota hard-limit for "
                            f"{target.doc_id}-{target.variant}: {last_error}"
                        )
                        break
                    if attempt < args.max_retries:
                        retry_after = exc.retry_after_seconds or 0.0
                        sleep_for = max(args.retry_sleep_seconds * (attempt + 1), retry_after)
                        print(
                            f"[{index}/{len(selected_targets)}] quota retry {attempt + 1}/{args.max_retries} "
                            f"for {target.doc_id}-{target.variant} in {sleep_for:.1f}s: {last_error}"
                        )
                        time.sleep(max(0.0, sleep_for))
                        continue
                if attempt < args.max_retries:
                    sleep_for = args.retry_sleep_seconds * (attempt + 1)
                    print(
                        f"[{index}/{len(selected_targets)}] retry {attempt + 1}/{args.max_retries} "
                        f"for {target.doc_id}-{target.variant}: {last_error}"
                    )
                    time.sleep(max(0.0, sleep_for))

        if not wrote:
            failed.append((target, last_error or "unknown error"))
            print(
                f"[{index}/{len(selected_targets)}] failed "
                f"{target.doc_id}-{target.variant}: {last_error}"
            )

    print("")
    print("Generation summary:")
    print(f"- success: {success_count}")
    print(f"- skipped (exists): {skipped_count}")
    print(f"- failed: {len(failed)}")
    if failed:
        for target, error in failed:
            print(f"  - {target.doc_id}/{target.variant} -> {target.image_path}: {error}")
        raise RuntimeError("One or more images failed to generate.")


if __name__ == "__main__":
    main()
