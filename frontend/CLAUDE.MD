# DischargeCoach — Frontend CLAUDE.md
 
## What you're building
 
DischargeCoach is a React Native + Expo mobile app for CHF (Congestive Heart Failure)
patients and their caregivers. It handles the 30 days after hospital discharge — the
window when 1 in 4 CHF patients get readmitted.
 
**Two users:**
- **Caregiver** (daughter/son/spouse, 35–65) — installs the app, photographs paperwork,
  records their voice, monitors the dashboard.
- **Patient** (elderly, ~75+) — interacts only via voice. Never taps a button if we do
  our job. Vision often impaired, fingers arthritic.
---
 
## Stack (locked — do not change)
 
- **React Native + Expo** (SDK 51+)
- **Zustand** for state management (not Redux, not Context)
- **Expo Camera** or `react-native-vision-camera` for photo capture
- **Expo AV** for audio playback
- **Expo Speech** or platform-native ASR for speech-to-text
- **React Navigation** (stack navigator — no tab bar)
- **TypeScript** throughout
---
 
## Project structure
 
```
/frontend
  /app
    /screens
      Onboarding/
        PatientProfileScreen.tsx
        VoiceRecordScreen.tsx
      Capture/
        DischargeCaptureScreen.tsx
        BottleCaptureScreen.tsx
        RegimenReviewScreen.tsx
      CheckIn/
        CheckInScreen.tsx
      Dashboard/        ← caregiver web view (separate)
    /components
    /store            ← Zustand slices
    /api              ← HTTP client, all API calls
    /hooks
    /utils
  /assets
  app.json
  CLAUDE.md           ← you are here
```
 
---
 
## Navigation flow (linear — no tabs)
 
```
PatientProfileScreen
  → VoiceRecordScreen
    → DischargeCaptureScreen
      → BottleCaptureScreen
        → RegimenReviewScreen
          → (home) CheckInScreen   ← daily entry point after onboarding
```
 
No back navigation on the demo path. No settings screen. No account management.
No tab bar with empty tabs.
 
---
 
## API contracts (locked at Hour 2 — do not invent endpoints)
 
Base URL: stored in `EXPO_PUBLIC_API_URL` env var. Default: `http://localhost:3001`
 
### POST /api/patients
```ts
// Request
{
  patientName: string
  preferredName: string       // used in voice prompts ("Dad")
  ageYears: number
  language: "en" | "es"
  baselineWeightLbs: number
  caregiver: {
    name: string
    relationship: string
    phone: string             // E.164 format
    email: string
  }
}
// Response 201
{ patientId: string, createdAt: string }
```
 
### POST /api/patients/:id/voice
```ts
// Request: multipart/form-data
// Field: audio — 30s wav or mp3 file
// Response 200
{ voiceId: string, previewUrl: string }
```
 
### POST /api/regimens/extract
```ts
// Request: multipart/form-data
// Fields: patientId, pages[0..N] (discharge paper images), bottles[0..N] (bottle images)
// Response 200
{
  regimenId: string
  extractionPath: "zetic" | "gemma_fallback"
  confidence: number
  medications: Medication[]
  interactions: Interaction[]
  discrepancies: Discrepancy[]
  needsReview: boolean        // true if confidence < 0.70
}
```
 
### POST /api/daily-logs
```ts
// Request
{
  patientId: string
  dayNumber: number
  weightLbs: number
  medsTaken: MedTaken[]
  symptoms: {
    shortnessOfBreath: "none" | "exertion" | "rest"
    swelling: "none" | "mild" | "moderate" | "severe"
    chestPain: "none" | "mild" | "severe"
    fatigue: "none" | "mild" | "moderate" | "severe"
    rawTranscript: string
  }
}
// Response 200
{
  dailyLogId: string
  flagLevel: "green" | "yellow" | "red" | "urgent"
  flagReasons: string[]
  alertsCreated: Alert[]
}
```
 
### POST /api/voice/synthesize
```ts
// Request
{ patientId: string, text: string, language: "en" | "es" }
// Response 200
{ audioUrl: string, durationMs: number, cached: boolean }
```
 
### GET /api/patients/:id/dashboard
Returns full dashboard payload — see backend schema docs.
 
---
 
## Zustand store shape
 
```ts
// store/patient.ts
interface PatientStore {
  patientId: string | null
  patientName: string
  preferredName: string
  baselineWeightLbs: number
  language: "en" | "es"
  caregiver: CaregiverProfile | null
  voiceId: string | null
  regimenId: string | null
  carePlanId: string | null
  currentDay: number
  demoMode: boolean
}
 
// store/checkin.ts
interface CheckInStore {
  isActive: boolean
  currentTurn: number
  transcript: string[]
  pendingSymptoms: Partial<SymptomsPayload>
}
```
 
---
 
## Key screen specs
 
### PatientProfileScreen
- Fields: patient name, preferred name ("what do they like to be called?"),
  age, baseline weight (lbs), language toggle (EN/ES)
- Caregiver section: name, relationship, phone, email
- Single "Continue" CTA
- No validation dialogs — inline errors only
### VoiceRecordScreen
- Display a 30-second script for the caregiver to read aloud
- Big record button — start/stop
- Show waveform or simple timer during recording
- On stop: POST to `/api/patients/:id/voice`, play back `previewUrl`
- "That sounds good" → continue. "Re-record" → retry.
- **This screen wins or loses the demo. Polish it.**
### DischargeCaptureScreen
- Multi-page capture mode (1–6 pages)
- Thumbnail strip at bottom — tap to retake a page
- "Done" sends to `/api/regimens/extract`
- Show loading state ("Reading your discharge papers…") until response
- If `needsReview: true` → surface a manual review prompt before continuing
### BottleCaptureScreen
- Single-bottle capture, one at a time
- "Add another bottle" or "Done"
- Bottles captured alongside discharge pages in the same `/api/regimens/extract` call
### RegimenReviewScreen
- List extracted medications (name, dose, frequency)
- Highlight any `interactions` (severity badge)
- Highlight any `discrepancies` (what paper said vs. what bottle said)
- "Looks right, start my plan" CTA
### CheckInScreen
- This is the patient-facing screen — it's a voice interface
- Full-screen. Minimal UI.
- Shows: day number, patient name, status indicator (green/yellow/red dot)
- Plays cloned voice clip on load
- Listens via ASR after clip finishes
- Loops: synthesize next prompt → play → listen → repeat
- 4–6 turns, then POST to `/api/daily-logs`
- Show result (flag level) briefly, then quiet
---
 
## Hard rules
 
1. **No tab bar.** Single stack navigator.
2. **No settings screen** — not in scope.
3. **No account management** — hardcoded demo user is fine.
4. **Compress images before upload** — 1024px wide JPEG max before POSTing.
5. **One loading state per async action** — never leave the user on a blank screen.
6. **Audio must cache** — don't re-fetch a voice clip you already played.
7. **CheckInScreen works offline for playback** — audio URL downloaded and cached locally.
8. **Demo mode toggle** — hidden triple-tap on version number in a settings-like area.
   When `demoMode: true`, the check-in flow uses pre-scripted symptom data.
---
 
## UX principles for this audience
 
- Patient screens: giant text, high contrast, no small tap targets
- Caregiver screens: clean and informative, not clinical
- Never use medical jargon in UI copy ("SOB" → "shortness of breath")
- Error states must suggest an action, not just display a code
- Loading states must say what's happening ("Extracting your medications…")
---
 
## Demo script path (must not break)
 
This exact sequence runs on stage. Every screen on this path must be crash-free at hour 22:
 
1. Open app fresh
2. PatientProfileScreen → fill in Robert Chen / Sarah / 76 / 184 lbs
3. VoiceRecordScreen → record, get cloned voice, play preview
4. DischargeCaptureScreen → photograph printed discharge paper (4 pages)
5. BottleCaptureScreen → photograph 3 bottles
6. RegimenReviewScreen → confirm regimen, see drug interaction flag
7. CheckInScreen → voice check-in (time-warp mode, day 4)
8. RED flag fires → dashboard updates
---
 
## Environment variables
 
```
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_DEMO_MODE=false
```
 
---
 
## Checkpoints
 
- **Hour 4**: Expo running on a phone via QR. Camera screen captures a photo.
- **Hour 8**: Onboarding flow complete. POSTs to `/api/patients` stub, stores ID.
- **Hour 14**: Discharge + bottle capture end-to-end. Posts to `/api/regimens/extract`.
- **Hour 18**: CheckInScreen plays cloned voice, captures answers, posts to `/api/daily-logs`.
- **Hour 22**: Full demo script runs without crashes.
---
 
## What NOT to build (scope enforcement)
 
- No wearable / Apple Health integration
- No push notification setup beyond basic Expo notifications
- No in-app settings or profile editing after onboarding
- No multi-caregiver support (P2 stretch, not your problem)
- No native iOS build via Xcode — Expo Go only for the demo
- No tab bar with placeholder screens
- No animated splash screens that delay the demo