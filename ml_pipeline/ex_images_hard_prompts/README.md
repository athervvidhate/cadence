# Hard Prompt Pack for `ex_images`

This folder contains a harder prompt set for remaking every image currently under `ml_pipeline/ex_images`.
The goal is to stress-test Gemma regimen extraction with realistic "elderly phone photo" capture issues instead of easy synthetic scans.

## Included File

- `prompt_matrix.yaml`
  - baseline prompt constraints
  - harder variant profiles
  - full discharge text blocks for all 10 docs
  - explicit target mapping for all 30 images (`10 docs x 3 variants`)

## Usage

For each item in `targets`:

1. Start with `base_prompt`.
2. Add the matching `variant_profiles.<variant>`.
3. Add the matching `documents.<doc_id>.discharge_text`.
4. Render one image for that target path.

### Generate All Images via Gemini

```bash
export SYNTHETIC_IMAGES_GOOGLE_API_KEY="YOUR_SEPARATE_GEMINI_KEY"

python synthetic_image_generator/generate_synthetic_images.py \
  --model "gemini-2.5-flash-image-preview" \
  --matrix "ml_pipeline/ex_images_hard_prompts/prompt_matrix.yaml" \
  --overwrite
```

## Hardening Characteristics

- slight blur, mild defocus, and hand-shake artifacts
- off-axis framing and far-away capture distance
- uneven indoor lighting, glare, and soft shadows
- realistic background clutter and JPEG/noise artifacts

Keep medication text semantically exact for each document block: no changed doses, schedules, or added medications.
