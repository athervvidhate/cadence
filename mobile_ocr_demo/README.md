# Cadence Mobile OCR Demo (Expo + React Native)

This demo implements the pipeline you described:

1. Capture/select discharge paper or medication label image
2. Run on-device OCR (Apple Vision on iOS, via `expo-text-extractor`)
3. Run Zetic PII anonymization on-device (iOS native bridge)
4. Send anonymized text to an LLM endpoint
5. Send LLM output to ElevenLabs TTS endpoint and play returned audio

## OCR Quality Mode (Accurate)

This project applies a persistent `patch-package` patch so Apple Vision OCR runs with:

- `recognitionLevel = .accurate`
- `usesLanguageCorrection = true`

Patch file:

- `patches/expo-text-extractor+2.0.0.patch`

If you reinstall deps, this patch re-applies via `postinstall`.

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

Fill `.env` values with your model key + endpoints.

Minimum env for iOS on-device anonymization:

```bash
EXPO_PUBLIC_ZETIC_PERSONAL_KEY=your_melange_personal_key
EXPO_PUBLIC_ZETIC_MODEL_ID=Steve/text-anonymizer-v1
EXPO_PUBLIC_ZETIC_MODEL_VERSION=1
```

### Quick Local Pipeline Backend

A ready-to-run backend is included at `mobile_ocr_demo/backend`.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Then set app env URLs (use your Mac LAN IP, not localhost):

```bash
EXPO_PUBLIC_ZETIC_ANONYMIZE_URL=http://192.168.1.50:8787/zetic/anonymize
EXPO_PUBLIC_LLM_PIPELINE_URL=http://192.168.1.50:8787/llm/medication-summary
EXPO_PUBLIC_ELEVENLABS_TTS_URL=http://192.168.1.50:8787/tts/elevenlabs
```

`EXPO_PUBLIC_ZETIC_ANONYMIZE_URL` is optional now. It is used only when on-device Zetic is unavailable.

## Expected Endpoint Contracts

- On-device Zetic (preferred):
  - Uses `EXPO_PUBLIC_ZETIC_PERSONAL_KEY` + `EXPO_PUBLIC_ZETIC_MODEL_ID`
  - Runs `Steve/text-anonymizer-v1` locally on iOS via native bridge

- Optional backend fallback `EXPO_PUBLIC_ZETIC_ANONYMIZE_URL`:
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
cd ios && pod install && cd ..
npx expo run:ios
```

### If you still want to test quickly with Expo Go

```bash
npx expo start
```

You can still test mocked anonymization/LLM behavior without OCR.

## Notes

- If `EXPO_PUBLIC_ZETIC_PERSONAL_KEY` is set and iOS native module is present, anonymization runs on-device.
- If on-device Zetic is unavailable, app falls back to `EXPO_PUBLIC_ZETIC_ANONYMIZE_URL`, then to mock anonymization.
- TTS is disabled unless `EXPO_PUBLIC_ELEVENLABS_TTS_URL` is provided.
- For real ElevenLabs output in local backend, set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `backend/.env`.
