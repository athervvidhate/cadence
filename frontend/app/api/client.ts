// HTTP client — reads EXPO_PUBLIC_API_URL; returns mock data when the var is absent
import type { CaregiverProfile } from "../store/patient";
import type { SymptomsPayload } from "../store/checkin";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

const IS_STUB = !process.env.EXPO_PUBLIC_API_URL;

// ─── Shared types ────────────────────────────────────────────────────────────

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
}

export interface Interaction {
  drugs: [string, string];
  severity: "low" | "moderate" | "high";
  description: string;
}

export interface Discrepancy {
  medicationName: string;
  paperValue: string;
  bottleValue: string;
}

export interface MedTaken {
  medicationName: string;
  taken: boolean;
  skippedReason?: string;
}

export interface Alert {
  alertId: string;
  type: string;
  message: string;
}

// ─── POST /api/patients ───────────────────────────────────────────────────────

export interface CreatePatientRequest {
  patientName: string;
  preferredName: string;
  ageYears: number;
  language: "en" | "es";
  baselineWeightLbs: number;
  caregiver: CaregiverProfile;
}

export interface CreatePatientResponse {
  patientId: string;
  createdAt: string;
}

export async function createPatient(
  data: CreatePatientRequest
): Promise<CreatePatientResponse> {
  if (IS_STUB) {
    return { patientId: "demo-patient-001", createdAt: new Date().toISOString() };
  }
  const res = await fetch(`${BASE_URL}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`createPatient failed: ${res.status}`);
  return res.json() as Promise<CreatePatientResponse>;
}

// ─── POST /api/patients/:id/voice ─────────────────────────────────────────────

export interface UploadVoiceResponse {
  voiceId: string;
  previewUrl: string;
}

export async function uploadVoice(
  patientId: string,
  audioUri: string
): Promise<UploadVoiceResponse> {
  if (IS_STUB) {
    return { voiceId: "demo-voice-001", previewUrl: "" };
  }
  const form = new FormData();
  form.append("audio", { uri: audioUri, name: "voice.m4a", type: "audio/m4a" } as unknown as Blob);
  const res = await fetch(`${BASE_URL}/api/patients/${patientId}/voice`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`uploadVoice failed: ${res.status}`);
  return res.json() as Promise<UploadVoiceResponse>;
}

// ─── POST /api/regimens/extract ───────────────────────────────────────────────

export interface ExtractRegimenRequest {
  patientId: string;
  pageUris: string[];
  bottleUris: string[];
}

export interface ExtractRegimenResponse {
  regimenId: string;
  extractionPath: "zetic" | "gemma_fallback";
  confidence: number;
  medications: Medication[];
  interactions: Interaction[];
  discrepancies: Discrepancy[];
  needsReview: boolean;
}

export async function extractRegimen(
  data: ExtractRegimenRequest
): Promise<ExtractRegimenResponse> {
  if (IS_STUB) {
    return {
      regimenId: "demo-regimen-001",
      extractionPath: "zetic",
      confidence: 0.92,
      medications: [
        { name: "Lisinopril", dose: "10mg", frequency: "Once daily" },
        { name: "Furosemide", dose: "40mg", frequency: "Twice daily" },
        { name: "Carvedilol", dose: "6.25mg", frequency: "Twice daily" },
      ],
      interactions: [
        {
          drugs: ["Lisinopril", "Furosemide"],
          severity: "moderate",
          description: "May increase risk of low blood pressure",
        },
      ],
      discrepancies: [],
      needsReview: false,
    };
  }
  const form = new FormData();
  form.append("patientId", data.patientId);
  data.pageUris.forEach((uri, i) =>
    form.append(`pages[${i}]`, { uri, name: `page-${i}.jpg`, type: "image/jpeg" } as unknown as Blob)
  );
  data.bottleUris.forEach((uri, i) =>
    form.append(`bottles[${i}]`, { uri, name: `bottle-${i}.jpg`, type: "image/jpeg" } as unknown as Blob)
  );
  const res = await fetch(`${BASE_URL}/api/regimens/extract`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`extractRegimen failed: ${res.status}`);
  return res.json() as Promise<ExtractRegimenResponse>;
}

// ─── POST /api/daily-logs ─────────────────────────────────────────────────────

export interface CreateDailyLogRequest {
  patientId: string;
  dayNumber: number;
  weightLbs: number;
  medsTaken: MedTaken[];
  symptoms: SymptomsPayload;
}

export interface CreateDailyLogResponse {
  dailyLogId: string;
  flagLevel: "green" | "yellow" | "red" | "urgent";
  flagReasons: string[];
  alertsCreated: Alert[];
}

export async function createDailyLog(
  data: CreateDailyLogRequest
): Promise<CreateDailyLogResponse> {
  if (IS_STUB) {
    return {
      dailyLogId: "demo-log-001",
      flagLevel: "red",
      flagReasons: ["Weight gain of 4 lbs in 2 days", "Shortness of breath at rest"],
      alertsCreated: [],
    };
  }
  const res = await fetch(`${BASE_URL}/api/daily-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`createDailyLog failed: ${res.status}`);
  return res.json() as Promise<CreateDailyLogResponse>;
}

// ─── POST /api/voice/synthesize ───────────────────────────────────────────────

export interface SynthesizeVoiceRequest {
  patientId: string;
  text: string;
  language: "en" | "es";
}

export interface SynthesizeVoiceResponse {
  audioUrl: string;
  durationMs: number;
  cached: boolean;
}

export async function synthesizeVoice(
  data: SynthesizeVoiceRequest
): Promise<SynthesizeVoiceResponse> {
  if (IS_STUB) {
    return { audioUrl: "", durationMs: 3000, cached: false };
  }
  const res = await fetch(`${BASE_URL}/api/voice/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`synthesizeVoice failed: ${res.status}`);
  return res.json() as Promise<SynthesizeVoiceResponse>;
}

// ─── GET /api/patients/:id/dashboard ─────────────────────────────────────────

export async function getDashboard(patientId: string): Promise<unknown> {
  if (IS_STUB) {
    return { patientId, logs: [], alerts: [] };
  }
  const res = await fetch(`${BASE_URL}/api/patients/${patientId}/dashboard`);
  if (!res.ok) throw new Error(`getDashboard failed: ${res.status}`);
  return res.json();
}

// ─── POST /api/care-plans/generate ───────────────────────────────────────────

export interface GenerateCarePlanRequest {
  patientId: string;
  regimenId: string;
  startDate: string; // YYYY-MM-DD
}

export interface GenerateCarePlanResponse {
  carePlanId: string;
}

export async function generateCarePlan(
  data: GenerateCarePlanRequest
): Promise<GenerateCarePlanResponse> {
  if (IS_STUB) {
    return { carePlanId: "demo-plan-001" };
  }
  const res = await fetch(`${BASE_URL}/api/care-plans/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`generateCarePlan failed: ${res.status}`);
  return res.json() as Promise<GenerateCarePlanResponse>;
}
