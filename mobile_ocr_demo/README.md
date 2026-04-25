# Cadence Mobile OCR Demo (Expo + React Native)

This demo implements the pipeline you described:

1. Capture/select discharge paper or medication label image
2. Run on-device OCR (Apple Vision on iOS, via `expo-text-extractor`)
3. Send OCR text to Zetic PII anonymization endpoint
4. Send anonymized text to an LLM endpoint
5. Send LLM output to ElevenLabs TTS endpoint and play returned audio

## Important Note About Expo Go

Because OCR uses a native module (`expo-text-extractor`), this part requires an
**Expo development build** (or EAS dev client), not plain Expo Go.

UI can still load in Expo Go, but OCR will show as unavailable.

## Setup

```bash
cd mobile_ocr_demo
npm install
cp .env.example .env
```

Fill `.env` values with your backend endpoints.

## Expected Endpoint Contracts

- `EXPO_PUBLIC_ZETIC_ANONYMIZE_URL`:
  - Request: `POST { text, mode, source }`
  - Response: `{ anonymizedText }` (or `anonymized_text` / `outputText`)

- `EXPO_PUBLIC_LLM_PIPELINE_URL`:
  - Request: `POST { anonymizedText, task }`
  - Response: `{ responseText }` (or `summary` / `output` / `text`)

- `EXPO_PUBLIC_ELEVENLABS_TTS_URL`:
  - Request: `POST { text }`
  - Response: either:
    - `{ audioUrl }`
    - `{ audioBase64, mimeType }`

## Run

### Development build (recommended for OCR)

```bash
npx expo prebuild
npx expo run:ios
```

### If you still want to test quickly with Expo Go

```bash
npx expo start
```

You can still test mocked anonymization/LLM behavior without OCR.

## Notes

- If endpoints are not set, app falls back to mock anonymization + mock LLM.
- TTS is disabled unless `EXPO_PUBLIC_ELEVENLABS_TTS_URL` is provided.
