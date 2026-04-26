# Care Plan Agent - 30-Day Regimen Prompt (v0.1)

This specification drives the Care Plan Agent flow for Cadence.

It consumes:
- anonymized regimen JSON from ZETIC pipeline output
- caregiver onboarding profile (anonymized)

It returns:
- deterministic 30-day care plan JSON aligned to `care_plans` schema assumptions.

## Scope

- Personalize medication reminders and daily check-in scripts.
- Do not generate red-flag thresholds (handled by rule engine).
- Do not invent clinical advice.

## Core requirements

1. Schedule each medication dose at `regimen.medications[].schedule`.
2. Schedule two daily voice check-ins:
   - morning 08:00 -> `weight`, `breathing`, `morning_meds`
   - evening 20:00 -> `symptom_review`, `evening_meds`
3. Mark days 3, 7, 14, 21, 28 as enhanced check-in days.
4. Add follow-up reminders from `regimen.followUps[]` and standard day 7/14/30 reminders if missing.
5. Personalize script text with `preferredName` and language (`en` / `es`).
6. Reminder text under 18 words, plain language, but must include exact drug name + dose.

## Hard constraints

- Never invent meds/doses/frequencies/interactions.
- Never emit PII.
- Never recommend dose changes or substitutions.
- Never skip a day; `days` must be exactly 30 entries.
- If `language === "es"`, script fields are Spanish (JSON keys stay English).
- Output must be JSON only.
- If regimen malformed/empty: return `days: []` and diagnostic `generationNote`.

## Output contract

Top-level:
- `totalDays: 30`
- `language: "en" | "es"`
- `generationNote: string | null`
- `days: Day[]`

Each day:
- `dayNumber` (1..30 contiguous)
- `date` (ISO, derived from `startDate`)
- `isEnhancedCheckIn`
- `appointments[]` (`{ type, label }`)
- `checkIns[]` (morning + evening objects with script fields)
- `medicationReminders[]` (cross product meds x schedule for that day)

Enhanced day additions:
- morning tasks include `enhanced_questionnaire`
- morning script includes:
  - `weighWeekAsk`
  - `appetiteAsk`

## Validation and fallback policy

- Validate schema shape and 30-day continuity.
- Validate canonical task codes.
- Reject responses with PII patterns (email/phone/SSN-like).
- On violation or model failure, use deterministic fallback generator.

## Caching policy

Cache by `(regimenId, startDate, language)` for demo use.
Regenerate only when regimen changes or forced.
