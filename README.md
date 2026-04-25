# Cadence / DischargeCoach Voice API

Node/Express backend for DischargeCoach voice synthesis, voice cloning, dialogue template rendering, and GridFS audio caching.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env`:

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3000
```

Start the API:

```bash
npx tsx server.ts
```

The server runs at:

```text
http://localhost:3000
```

## Test Raw Text-To-Speech

This streams an MP3 generated from raw text. The first request may call ElevenLabs; repeated identical requests should use the MongoDB GridFS cache.

```bash
curl -L "http://localhost:3000/api/audio?voiceId=YOUR_VOICE_ID&text=Take%20your%20medication%20this%20morning&language=en" \
  --output test.mp3
```

Play on macOS:

```bash
afplay test.mp3
```

## Test Template-To-Speech

This renders a dialogue template, synthesizes the rendered text, and streams an MP3.

```bash
curl -X POST "http://localhost:3000/api/audio/template" \
  -H "Content-Type: application/json" \
  -d '{"voiceId":"YOUR_VOICE_ID","templateId":"greeting_morning","language":"en","vars":{"patient_name":"Dad","day_number":"3"}}' \
  --output template-test.mp3
```

Play on macOS:

```bash
afplay template-test.mp3
```

Use `curl -f` while testing if you want curl to fail instead of saving JSON errors as `.mp3` files:

```bash
curl -f -X POST "http://localhost:3000/api/audio/template" \
  -H "Content-Type: application/json" \
  -d '{"voiceId":"YOUR_VOICE_ID","templateId":"greeting_morning","language":"en","vars":{"patient_name":"Dad","day_number":"3"}}' \
  --output template-test.mp3
```

## Test Voice Cloning

Create a test patient:

```bash
npx tsx -e 'import "dotenv/config"; import mongoose from "mongoose"; import Patient from "./models/Patient"; (async () => { await mongoose.connect(process.env.MONGODB_URI!); const p = await Patient.create({ name: "Test Patient" }); console.log(p._id.toString()); await mongoose.disconnect(); })().catch((err) => { console.error(err); process.exit(1); });'
```

Clone a voice for that patient:

```bash
curl -X POST "http://localhost:3000/api/voice/clone" \
  -F "patientId=PASTE_PATIENT_ID_HERE" \
  -F "audio=@/path/to/sample.mp3"
```

Response:

```json
{
  "voiceId": "elevenlabs_voice_id"
}
```

Then test the cloned voice:

```bash
curl -L "http://localhost:3000/api/audio?voiceId=PASTE_VOICE_ID_HERE&text=Hi%20Dad%2C%20this%20is%20your%20check-in%20for%20today.&language=en" \
  --output cloned-voice-test.mp3
```

```bash
afplay cloned-voice-test.mp3
```

## Available Template IDs

English templates live in `templates/en/`.

```text
greeting_morning
greeting_evening
prompt_weight
response_weight_logged
prompt_breathing
prompt_swelling
prompt_chest
prompt_meds_morning
prompt_meds_evening
encouragement_doing_well
alert_yellow
alert_red
alert_urgent
missed_dose_nudge
signoff
```

## Notes

- Keep `.env` local. Do not commit API keys or MongoDB credentials.
- The frontend should call this backend, not ElevenLabs directly.
- MongoDB Atlas must allow your current IP address, or use `0.0.0.0/0` for local demo testing.
- Use consented voice samples only.