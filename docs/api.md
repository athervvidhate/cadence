# DischargeCoach API Contracts

## Express Gateway

### `POST /api/patients`
- Creates patient + caregiver profile.
- Response: `{ "patientId": "...", "createdAt": "..." }`

### `POST /api/patients/:id/voice`
- Multipart form upload (`audio`) to clone caregiver voice with ElevenLabs and store generated `voiceId`.
- Response: `{ "voiceId": "...", "patientId": "..." }`

### `POST /api/regimens/extract`
- Multipart form upload:
  - `patientId`
  - `pages[]` discharge images
  - `bottles[]` medication bottle images
- Dispatches to Regimen agent.
- Response: `{ regimenId, extractionPath, confidence, medications, interactions, discrepancies, needsReview }`

### `POST /api/care-plans/generate`
- Request: `{ patientId, regimenId, startDate }`
- Dispatches to Care Plan agent + deterministic generator.
- Response: `{ carePlanId, summary: { totalDays, dailyCheckIns, scheduledFollowUps } }`

### `POST /api/daily-logs`
- Request: `{ patientId, dayNumber, weightLbs, medsTaken, symptoms }`
- Persists daily log and dispatches to Escalation agent.
- Response: `{ dailyLogId, flagLevel, flagReasons, alertsCreated }`

### `GET /api/patients/:id/dashboard`
- Dashboard aggregate endpoint.
- Response includes patient profile, trend metrics, alert history, regimen snapshot.

### `GET /api/audio`
- Query params: `voiceId`, `text`, `language`.
- Streams `audio/mpeg` from GridFS cache or ElevenLabs.

### `POST /api/audio/template`
- Request: `{ patientId?, voiceId?, templateId, language, vars }`
- Requires either `patientId` or `voiceId`.
- Renders a dialogue template, then streams `audio/mpeg` from GridFS cache or ElevenLabs.

### `POST /api/voice/clone`
- Multipart form upload:
  - `patientId`
  - `audio`
- Clones caregiver voice with ElevenLabs and saves it on the patient caregiver profile.
- Response: `{ "voiceId": "...", "patientId": "..." }`

### `POST /api/voice/synthesize`
- Request: `{ patientId?, voiceId?, text, language }`
- Requires either `patientId` or `voiceId`.
- Streams `audio/mpeg` from GridFS cache or ElevenLabs.

## Agent Chat Protocol Over Shim

### Regimen Agent
- Endpoint: `POST /agents/regimen/extract_regimen`
- Request: `{ type: "extract_regimen", patientId, imageUrls[] }`
- Response: `{ type: "regimen_extracted", regimenId, medications, confidence }`

### Care Plan Agent
- Endpoint: `POST /agents/care-plan/build_plan`
- Request: `{ type: "build_plan", patientId, regimenId, startDate }`
- Response: `{ type: "plan_built", carePlanId, totalDays }`

### Escalation Agent
- Endpoint: `POST /agents/escalation/evaluate_log`
- Request: `{ type: "evaluate_log", patientId, dailyLogId, dailyLog }`
- Response: `{ type: "evaluation_complete", flagLevel, flagReasons, actionsTaken }`
