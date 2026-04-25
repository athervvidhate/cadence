# Product Requirements Document Mockups

_Started 2026-04-25 17:07 UTC_

---

## User

Based on this PRD create a mockup for each screen, I want high fidelity and this to look pristine and user friendly

## Assistant

I'll start by reading the PRD to understand what we're building, then ask a few targeted questions before designing.

_[tool: list_files]_

_[tool: run_script]_

Let me continue reading the PRD to understand all screens needed.

_[tool: run_script]_

I have enough understanding of the product. Let me identify the screens needed and ask a couple of quick design questions before building.

**Screens identified from PRD:**

**Mobile (Caregiver onboarding):**
1. Welcome / intro
2. Patient profile setup
3. Discharge paperwork capture (multi-photo)
4. Medication bottle scan
5. Extracted regimen review (with drug interaction + discrepancy flags)
6. Voice cloning record
7. Voice clone confirmation
8. Care plan generated / scheduled

**Mobile (Patient daily):**
9. Incoming check-in notification / answer screen
10. Voice check-in active (listening)
11. Daily check-in complete

**Caregiver web dashboard:**
12. Dashboard (green/yellow/red status, weight trend, adherence, alerts, regimen)
13. Alert detail / red flag fired
14. Time-warp demo control

Given the scope and the "pristine, user friendly" ask, I'll move fast with strong defaults rather than block on questions. Let me set the project and start.

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

Now let me design the system. Since this is a healthcare product for elderly patients + their caregivers, I'll commit to:

**Aesthetic system (declared):**
- **Type:** Inter (UI) + Fraunces alternative — actually I'll use **Geist** for body and **Instrument Serif** for editorial moments to feel calm/medical-trustworthy without being sterile. Actually, given the system prompt says avoid Inter — I'll use **"Söhne"-style alternative: Geist Sans + Instrument Serif** for warmth.
- **Palette:** soft warm off-white background (#F7F5F0), deep ink (#1A1F1B), a calm clinical green primary (oklch 0.55 0.08 155), soft amber (yellow flag), and clinical red. Avoids generic "tech blue" — feels human.
- **Density:** Patient-facing screens are *huge* type and minimal (vision-impaired elderly users); caregiver-facing screens are denser dashboards.
- **No emoji, no gratuitous gradients, no AI slop icons.** Use simple outlined SVG icons.

Let me build this. I'll create the components in modular files.

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

Now let me build the screens. I'll split into a few component files.

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

Now let me look at the design canvas API briefly and assemble the final HTML.

_[tool: grep]_

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

_[tool: grep]_

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

Now let me build the main HTML file that ties everything together with the design canvas.

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

I've delivered the mockups for DischargeCoach — 14 screens in total, presented on a pannable design canvas you can drag, reorder, and open fullscreen.

**Aesthetic system:** warm off-white background, deep ink, clinical green primary, amber/red flags via oklch. Geist Sans + Instrument Serif (italic for emotional moments) + Geist Mono for clinical metadata. No emoji, no gratuitous gradients.

**What's there:**
- **Caregiver onboarding (8):** Welcome → Patient profile → Camera capture of discharge paper (with detected corner brackets) → Pill-bottle scan → Regimen review (with Metoprolol dose discrepancy callout + interaction check) → Voice record (live waveform) → Voice clone confirmation → Plan ready
- **Patient check-in (3):** Incoming call from Sarah → Active conversation with live waveform & turn-by-turn dots → Complete with soft yellow flag (huge type, calm dark UI for elderly users)
- **Caregiver web dashboard (3 states):** Green / Yellow / Red — same layout, weight-trend chart with AHA threshold bands, today's timeline, alert history, regimen
- **Alert detail modal:** Day-4 red flag with auto-actions (SMS, summary drafted, appointment offered) + on-device transcript
- **Time-warp demo control:** Hidden dev panel for the 60-second pitch playback

A verifier is checking it in the background.

