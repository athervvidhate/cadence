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

export interface FollowUp {
  type: string;
  daysFromDischarge: number;
  doctorName?: string;
  time?: string;
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
  followUps: FollowUp[];
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
      discrepancies: [
        {
          medicationName: "Metoprolol",
          paperValue: "25 mg",
          bottleValue: "50 mg",
        },
      ],
      needsReview: true,
      followUps: [
        { type: "Cardiology", daysFromDischarge: 7, doctorName: "Dr. Patel", time: "9:30 AM" },
        { type: "Primary care", daysFromDischarge: 14, doctorName: "Dr. Hashimoto", time: "11:00 AM" },
      ],
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
  // Backend streams audio — build a GET URL that expo-av can load directly
  const params = new URLSearchParams({
    patientId: data.patientId,
    text: data.text,
    language: data.language,
  });
  const audioUrl = `${BASE_URL}/api/voice/stream?${params.toString()}`;
  return { audioUrl, durationMs: 0, cached: false };
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

// ─── POST /api/patients/:id/messages ─────────────────────────────────────────

export interface SendVoiceMessageResponse {
  messageId: string;
  notificationStatus: "sent" | "mocked" | "failed";
}

export async function sendVoiceMessage(
  patientId: string,
  audioUri: string
): Promise<SendVoiceMessageResponse> {
  if (IS_STUB) {
    return { messageId: "demo-msg-001", notificationStatus: "mocked" };
  }
  const form = new FormData();
  form.append("audio", {
    uri: audioUri,
    name: "message.m4a",
    type: "audio/m4a",
  } as unknown as Blob);
  const res = await fetch(`${BASE_URL}/api/patients/${patientId}/messages`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`sendVoiceMessage failed: ${res.status}`);
  return res.json() as Promise<SendVoiceMessageResponse>;
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
