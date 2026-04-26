# Mobile Demo Backend (Optional)

This backend gives the React Native demo concrete endpoints for:

- `/zetic/anonymize`
- `/llm/medication-summary`
- `/care-plan/generate`
- `/tts/elevenlabs`
- `/pipeline/run` (all-in-one)

It is designed for quick local testing while you wire real upstream services.

## Setup

```bash
cd mobile_ocr_demo/backend
npm install
cp .env.example .env
```

Fill `.env`:

- Add `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` for real TTS.
- Optionally add `ZETIC_UPSTREAM_URL`.
- For LLM, you have two options:
  - `LLM_UPSTREAM_URL` for your own hosted endpoint, or
  - `GEMMA_API_KEY` for direct Gemma calls from this backend.
- If both are unset, `/llm/medication-summary` returns an explicit config error.

## Gemma Regimen Mode

If `GEMMA_API_KEY` is set and `LLM_UPSTREAM_URL` is empty, `/llm/medication-summary`
calls Gemma directly and returns a regimen-oriented summary.

Configure:

```bash
GEMMA_API_KEY=your_api_key
GEMMA_MODEL=gemma-3-27b-it
GEMMA_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

System prompt file:

- `prompts/regimen-system-prompt.txt`

## Care Plan Agent Mode (30-day plan JSON)

`/care-plan/generate` implements the 30-day Care Plan Agent behavior with:

- strict JSON schema validation (`days.length === 30`, contiguous day numbers, canonical tasks)
- PII checks (email/phone/SSN patterns) before accepting model output
- no silent fallback: Gemma must return valid JSON or the endpoint errors
- in-memory caching per `(regimenId, startDate, language)` for demo speed

Prompt files:

- `prompts/care-plan-system-prompt.txt`
- `prompts/care-plan-user-template.txt`

Request shape:

```json
{
  "patientProfile": {
    "preferredName": "Dad",
    "language": "en"
  },
  "regimen": {
    "medications": [],
    "followUps": []
  },
  "startDate": "2026-04-26",
  "regimenId": "regimen_123",
  "forceRegenerate": false
}
```

Response:

- JSON care plan object (`totalDays`, `language`, `generationNote`, `days`)
- metadata fields: `source`, `cacheKey`, `cached`, `validationErrors`

Timeout controls:

- `CARE_PLAN_TIMEOUT_MS` (default `120000`)
- `CARE_PLAN_MAX_OUTPUT_TOKENS` (default `8192`)

## Run

```bash
npm run dev
```

Server default: `http://localhost:8787`

## Connect Mobile App

In `mobile_ocr_demo/.env`, use your Mac's LAN IP (not localhost) so iPhone can reach it:

```bash
EXPO_PUBLIC_ZETIC_ANONYMIZE_URL=http://192.168.1.50:8787/zetic/anonymize
EXPO_PUBLIC_LLM_PIPELINE_URL=http://192.168.1.50:8787/llm/medication-summary
EXPO_PUBLIC_ELEVENLABS_TTS_URL=http://192.168.1.50:8787/tts/elevenlabs
```

## Health Check

```bash
curl http://localhost:8787/health
```
