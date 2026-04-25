# Cadence ML Pipeline (Role 2)

## Included assets

- `data/chf_synthetic_discharge_summaries_v1.json`
  - 10 synthetic CHF discharge summaries
  - language mix: 8 English, 2 Spanish
  - medication complexity: 5 to 12 meds
  - ground truth in `regimens.medications` shape
- `extract_regimen_gemma.py`
  - multimodal extraction script using Gemma via Google AI Studio
  - input: one or more discharge-summary images
  - output: schema-aligned regimen JSON envelope
- `extract_regimen_zetic.py`
  - same contract as Gemma extraction, but runtime delegated to on-device Melange
  - expects a local runner command that wraps ZETIC inference
- `red_flag_engine.py`
  - deterministic red/yellow/red+urgent classifier from rolling 7-day logs
  - uses AHA-aligned weight thresholds (`>2 lb/24h`, `>5 lb/7d`)
- `symptom_keyword_extractor.py`
  - hard-coded keyword lookup from transcript -> `daily_logs.symptoms`
- `tests/`
  - 20 unit tests for red-flag engine (outcomes, boundaries, missing data, single-day history)
  - keyword extractor tests

## Setup (Python 3.11)

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r ml_pipeline/requirements.txt
export GOOGLE_API_KEY="YOUR_AI_STUDIO_KEY"
```

## Run extraction

```bash
python ml_pipeline/extract_regimen_gemma.py \
  --image "/path/to/discharge_page_1.jpg" \
  --image "/path/to/discharge_page_2.jpg" \
  --patient-id "demo-patient-001" \
  --pretty \
  --output "regimen_demo.json"
```

Each extraction run is written to a unique folder under `ml_pipeline/out/extractions/`
to prevent overwriting previous runs.

### Test Gemma without images (using synthetic text)

```bash
export GOOGLE_API_KEY="YOUR_AI_STUDIO_KEY"

python ml_pipeline/extract_regimen_gemma.py \
  --synthetic-doc-id "chf_en_001" \
  --dataset-path "ml_pipeline/data/chf_synthetic_discharge_summaries_v1.json" \
  --patient-id "test-patient-001" \
  --pretty \
  --output "regimen_from_synthetic_text.json"
```

## Run on-device contract wrapper (ZETIC)

```bash
export ZETIC_RUNNER_CMD="python /absolute/path/to/your_melange_runner.py"

python ml_pipeline/extract_regimen_zetic.py \
  --image "/path/to/discharge_page_1.jpg" \
  --image "/path/to/discharge_page_2.jpg" \
  --patient-id "demo-patient-001" \
  --pretty \
  --output "ml_pipeline/out/regimen_zetic.json"
```

## Run deterministic red-flag engine

```python
from ml_pipeline.red_flag_engine import evaluate_red_flags

result = evaluate_red_flags(rolling_7_day_logs)
print(result["flagLevel"], result["flagReasons"])
```

## Run symptom keyword extractor

```bash
python ml_pipeline/symptom_keyword_extractor.py \
  --transcript "I weighed 187 and I am a little short of breath walking to the kitchen." \
  --pretty
```

## Run tests

```bash
python -m unittest discover -s ml_pipeline/tests -p "test_*.py"
```

## Notes

- Default model is `gemma-3-27b-it` (override with `--model` or `GEMMA_MODEL`).
- The script enforces explicit dose units and schema-required fields.
- If model output fails validation, it retries with deterministic correction feedback.
- Red-flag thresholds are deterministic and explicitly aligned to AHA guidance.
