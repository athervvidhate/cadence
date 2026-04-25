# Synthetic Image Generator (Standalone)

This folder is intentionally separate from `ml_pipeline`.

It generates synthetic discharge-sheet photos from the prompt matrix and writes them to
local image paths (for example under `ml_pipeline/ex_images/...`), using a dedicated API key.

## Setup

```bash
python3 -m venv .venv-synth
source .venv-synth/bin/activate
pip install -r synthetic_image_generator/requirements.txt
```

## Dedicated API Key

Use a separate key for image generation:

```bash
export SYNTHETIC_IMAGES_GOOGLE_API_KEY="YOUR_SEPARATE_GEMINI_KEY"
```

## Run

List models available to your current key first:

```bash
python synthetic_image_generator/generate_synthetic_images.py --list-models
```

Dry run:

```bash
python synthetic_image_generator/generate_synthetic_images.py --dry-run
```

Generate all targets:

```bash
python synthetic_image_generator/generate_synthetic_images.py \
  --model "gemini-2.5-flash-image-preview" \
  --matrix "ml_pipeline/ex_images_hard_prompts/prompt_matrix.yaml" \
  --overwrite
```

Useful filters:

- `--doc-id chf_en_001`
- `--variant noisy_shadow`
- `--limit 5`
- `--api-key-env SOME_OTHER_KEY_NAME`
- `--api-version v1beta`
