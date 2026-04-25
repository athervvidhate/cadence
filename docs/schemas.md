# DischargeCoach MongoDB Schemas

## `patients`
- Patient identity + baseline:
  - `patientName`, `preferredName`, `ageYears`, `language`, `diagnosis`, `baselineWeightLbs`, `dischargeDate`.
- Embedded caregiver:
  - `name`, `relationship`, `phone`, `email`, `voiceId`, `voiceCloneStatus`, `voiceClonedAt`, `notificationPrefs`.
- Demo controls:
  - `demoMode`.

## `regimens`
- Extraction metadata:
  - `patientId`, `extractedAt`, `extractionPath`, `extractionConfidence`.
- Arrays:
  - `medications[]` with drug, dose, schedule, indication, confidence.
  - `interactions[]` with severity + note.
  - `discrepancies[]`.
  - `followUps[]`.

## `care_plans`
- Header:
  - `patientId`, `regimenId`, `startDate`, `endDate`.
- `days[]`:
  - `dayNumber`, `date`, `checkIns[]`, `appointments[]`.

## `daily_logs`
- Header:
  - `patientId`, `date`, `dayNumber`.
- Metrics:
  - `weightLbs`, `weightDeltaFromYesterday`, `weightDeltaFromBaseline`.
- Signals:
  - `medsTaken[]`, `symptoms`.
- Decisions:
  - `flagLevel`, `flagReasons`, `createdAt`.

## `alerts`
- Header:
  - `patientId`, `dailyLogId`, `createdAt`, `level`, `summary`.
- Resolution trail:
  - `actionsTaken[]`, `resolvedAt`, `resolution`.

## Indexes
- `daily_logs`: `{ patientId: 1, date: 1 }`
- `alerts`: `{ patientId: 1, createdAt: -1 }`
- `care_plans`: `{ patientId: 1, startDate: 1 }`
