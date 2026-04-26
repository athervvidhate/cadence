# Cadence — Mobile Frontend

React Native + Expo mobile app for the Cadence CHF post-discharge companion. Handles the caregiver onboarding flow and the patient-facing daily voice check-in.

## Stack

| | |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navigation | React Navigation (stack, no tab bar) |
| State | Zustand |
| Camera | Expo Camera + Expo Image Manipulator |
| Audio | Expo AV |
| Language | TypeScript throughout |

## Running locally

```bash
cd frontend
npm install
npm start          # starts Expo dev server + prints QR code
```

Scan the QR code with **Expo Go** (iOS App Store / Google Play) to run on your phone. Press `i` for iOS Simulator or `a` for Android emulator.

The app runs in **stub mode** by default — no backend required. All API calls return realistic mock data so the full flow is demoable without any server.

To point at a real backend, create a `.env` file:

```
EXPO_PUBLIC_API_URL=http://<your-backend-ip>:3001
```

## Screen flow

```
Welcome
  └── PatientProfile        (caregiver fills in patient + their own details)
        └── DischargeCapture  (multi-page camera capture of discharge paperwork)
              └── BottleCapture  (per-bottle medication scan)
                    └── RegimenReview  (extracted meds, interactions, follow-ups)
                          └── VoiceRecord  (30s voice recording → ElevenLabs clone)
                                └── PlanReady  (30-day plan summary, demo mode toggle)
                                      └── CheckIn  (patient-facing daily check-in)
```

If a patient session already exists in Zustand state, the app skips directly to `CheckIn` on launch.

## Screen descriptions

### Welcome
Intro screen with the three-feature value proposition (snap paperwork, record voice, stays on device). Entry point into onboarding.

### PatientProfile _(Step 1 of 5)_
Caregiver fills in:
- Patient: full name, preferred name (used in voice prompts), age, baseline weight at discharge, preferred language (EN / ES)
- Caregiver: name, relationship, phone (E.164), email

On submit, POSTs to `POST /api/patients` and stores the returned `patientId` in Zustand.

### DischargeCapture _(Step 2 of 5)_
Full-screen camera view. Caregiver photographs up to 6 pages of the hospital discharge summary. Each photo is compressed to 1024px JPEG before being stored locally. A thumbnail strip at the bottom lets them retake any page. Images are held in Zustand until `RegimenReview` triggers the extraction.

### BottleCapture _(Step 2 of 5, continued)_
Same camera UI, single-bottle mode. Camera → preview → confirm → repeat. Each confirmed bottle URI is added to Zustand. All captured page and bottle images are uploaded together in the single `POST /api/regimens/extract` call made by `RegimenReview`.

### RegimenReview _(Step 3 of 5)_
Triggers `POST /api/regimens/extract` on mount with all staged discharge page and bottle images. Displays:
- Extracted medication list (name, dose, frequency)
- **Discrepancy callout** — if the pharmacy dispensed a different dose than the discharge paper specified (the demo shows Metoprolol 25 mg on paper vs. 50 mg on the bottle)
- Drug interaction warnings with severity badges
- Follow-up appointment dates calculated from `daysFromDischarge`

Also calls `POST /api/care-plans/generate` when the caregiver confirms, then navigates to `VoiceRecord`.

### VoiceRecord _(Step 4 of 5)_
Caregiver reads a 30-second script aloud. The recording is uploaded to `POST /api/patients/:id/voice`, which triggers ElevenLabs voice cloning. On success, the cloned voice plays back a sample sentence for confirmation. Includes a privacy note ("Your audio is encrypted and only used to clone your voice").

### PlanReady
Celebration screen confirming the 30-day plan is active. Shows a summary card:
- First check-in time
- First medications due
- First follow-up appointment
- Alert routing (SMS to caregiver on any yellow/red flag)

**Demo mode toggle:** triple-tap the version number at the bottom to enable demo mode. A toast confirms the state. When demo mode is on, the `CheckIn` screen auto-advances through all turns using pre-scripted responses and fires a red flag on day 4.

### CheckIn _(patient-facing)_
Dark-mode screen designed for elderly patients — large type, minimal UI. Three phases:

**Incoming** — Call-style UI. Shows the caregiver's name, a pulsing Answer button, and a concentric-ring avatar. Patient taps Answer to start.

**Active** — Conversation view. The caregiver's synthesized voice prompt appears as a large serif bubble. The patient's live response (or demo transcript) appears in a listening bubble on the right with a live waveform. Progress dots at the bottom track check-in topics: Weight → Breathing → Swelling → Meds. Each turn: synthesize audio (`POST /api/voice/synthesize`) → play → listen → advance.

**Complete** — Flag result screen. Adapts message to the flag level:
- Green: "You're doing great! See you tonight."
- Yellow: weight/symptom summary, caregiver notified
- Red: "I'm gonna call [caregiver] to check on you."

A 2×2 stats grid shows weight (with delta), breathing, meds taken, and swelling. Tapping "Okay, talk soon" resets back to the Incoming phase.

## State management

Two Zustand stores:

**`store/patient.ts`** — persistent session state: `patientId`, `preferredName`, `baselineWeightLbs`, `language`, `caregiver`, `voiceId`, `regimenId`, `carePlanId`, `currentDay`, `demoMode`.

**`store/capture.ts`** — ephemeral capture state: `dischargePages[]`, `medicationBottles[]`, `extractionResult`. Holds image URIs locally until extraction completes; not persisted across app restarts.

## API client

`app/api/client.ts` wraps all backend calls. If `EXPO_PUBLIC_API_URL` is not set, every function returns hardcoded stub data so the app is fully demoable offline. Stub data includes the Metoprolol discrepancy, a moderate drug interaction, and two follow-up appointments to exercise all UI states.

## Project structure

```
frontend/
  App.tsx                         root — NavigationContainer + GestureHandler
  app/
    navigation/index.tsx          stack navigator, all route types
    theme.ts                      color tokens, typography, border radii
    api/client.ts                 HTTP client + offline stubs
    store/
      patient.ts                  caregiver/patient session store
      capture.ts                  image staging store
      checkin.ts                  active check-in session store
    screens/
      Onboarding/
        WelcomeScreen.tsx
        PatientProfileScreen.tsx
        VoiceRecordScreen.tsx
        PlanReadyScreen.tsx       ← new
      Capture/
        DischargeCaptureScreen.tsx
        BottleCaptureScreen.tsx
        RegimenReviewScreen.tsx
      CheckIn/
        CheckInScreen.tsx         ← redesigned (3-phase patient UI)
  assets/
```

## Design tokens (`theme.ts`)

| Token | Value | Usage |
|---|---|---|
| `C.bg` | `#F6F3EC` | Caregiver screen backgrounds |
| `C.ink` | `#1A1F1B` | Primary text |
| `C.accent` | `#4A8369` | Clinical green — active states, progress |
| `C.warn` | `#C9A040` | Yellow flag |
| `C.danger` | `#BF3B2B` | Red flag, record button |
| `C.patientBg` | `#0E120F` | Patient check-in background |
| `C.patientText` | `#F2EEE3` | Patient check-in text |
| `FONT.serif` | Georgia | Display headings |
| `FONT.mono` | Menlo / monospace | Eyebrow labels, tags, timestamps |
