# Mobile Demo Backend (Optional)

This backend gives the React Native demo concrete endpoints for:

- `/zetic/anonymize`
- `/llm/medication-summary`
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
- Optionally add `ZETIC_UPSTREAM_URL` and `LLM_UPSTREAM_URL`.
  - If unset, local mock anonymization + mock medication summary are used.

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
