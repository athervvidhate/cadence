# DischargeCoach API Contracts

## Express Gateway

### `POST /api/patients`
- Creates patient + caregiver profile.
- Response: `{ "patientId": "...", "createdAt": "..." }`

### `POST /api/patients/:id/voice`
- Multipart form upload (`audio`) and stores generated `voiceId`.
- Response: `{ "voiceId": "...", "previewUrl": "..." }`

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

### `POST /api/voice/synthesize`
- Request: `{ patientId, text, language }`
- Returns synthesized clip metadata.

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
