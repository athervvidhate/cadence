// HTTP client — mirrors backend endpoint contracts and maps to UI-friendly shapes
import type { CaregiverProfile } from "../store/patient";
import type { SymptomsPayload } from "../store/checkin";
import type {
  AlertCreatedContract,
  CreateDailyLogRequestContract,
  CreateDailyLogResponseContract,
  CreatePatientRequestContract,
  CreatePatientResponseContract,
  DashboardResponseContract,
  ExtractRegimenResponseContract,
  GenerateCarePlanRequestContract,
  GenerateCarePlanResponseContract,
  RegimenDiscrepancyContract,
  RegimenInteractionContract,
  RegimenMedicationContract,
  SynthesizeVoiceRequestContract,
  SynthesizeVoiceResponseContract,
  UploadVoiceResponseContract,
} from "./contracts";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
const IS_STUB = !process.env.EXPO_PUBLIC_API_URL;

export type * from "./contracts";

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
  dose?: string;
  scheduled?: string;
  actualTime?: string;
}

export interface Alert {
  alertId: string;
  type: string;
  message: string;
}

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

export interface UploadVoiceResponse {
  voiceId: string;
  previewUrl: string;
}

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

export interface GenerateCarePlanRequest {
  patientId: string;
  regimenId: string;
  startDate: string;
}

export interface GenerateCarePlanResponse {
  carePlanId: string;
}

function mapMedication(medication: RegimenMedicationContract): Medication {
  return {
    name: medication.drugName,
    dose: medication.dose,
    frequency: medication.frequency,
  };
}

function mapInteraction(interaction: RegimenInteractionContract): Interaction {
  const severityMap = {
    contraindicated: "high",
    major: "high",
    moderate: "moderate",
  } as const;
  const first = interaction.drugs[0] ?? "Unknown A";
  const second = interaction.drugs[1] ?? "Unknown B";

  return {
    drugs: [first, second],
    severity: severityMap[interaction.severity] ?? "low",
    description: interaction.note,
  };
}

function mapDiscrepancy(discrepancy: RegimenDiscrepancyContract): Discrepancy {
  return {
    medicationName: discrepancy.field,
    paperValue: discrepancy.paperSays,
    bottleValue: discrepancy.bottleSays,
  };
}

function mapAlert(alert: AlertCreatedContract): Alert {
  return {
    alertId: alert.alertId,
    type: alert.level,
    message: `Escalation: ${alert.level}`,
  };
}

export async function createPatient(data: CreatePatientRequest): Promise<CreatePatientResponse> {
  if (IS_STUB) {
    return { patientId: "demo-patient-001", createdAt: new Date().toISOString() };
  }

  const payload: CreatePatientRequestContract = data;
  const res = await fetch(`${BASE_URL}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`createPatient failed: ${res.status}`);
  const body = (await res.json()) as CreatePatientResponseContract;
  return body;
}

export async function uploadVoice(patientId: string, audioUri: string): Promise<UploadVoiceResponse> {
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
  const body = (await res.json()) as UploadVoiceResponseContract;
  return body;
}

export async function extractRegimen(data: ExtractRegimenRequest): Promise<ExtractRegimenResponse> {
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
  data.pageUris.forEach((uri, i) => {
    form.append("pages", { uri, name: `page-${i}.jpg`, type: "image/jpeg" } as unknown as Blob);
  });
  data.bottleUris.forEach((uri, i) => {
    form.append("bottles", { uri, name: `bottle-${i}.jpg`, type: "image/jpeg" } as unknown as Blob);
  });

  const res = await fetch(`${BASE_URL}/api/regimens/extract`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`extractRegimen failed: ${res.status}`);

  const body = (await res.json()) as ExtractRegimenResponseContract;
  return {
    regimenId: body.regimenId,
    extractionPath: body.extractionPath,
    confidence: body.confidence,
    medications: body.medications.map(mapMedication),
    interactions: body.interactions.map(mapInteraction),
    discrepancies: body.discrepancies.map(mapDiscrepancy),
    needsReview: body.needsReview,
  };
}

export async function createDailyLog(data: CreateDailyLogRequest): Promise<CreateDailyLogResponse> {
  if (IS_STUB) {
    return {
      dailyLogId: "demo-log-001",
      flagLevel: "red",
      flagReasons: ["Weight gain of 4 lbs in 2 days", "Shortness of breath at rest"],
      alertsCreated: [],
    };
  }

  const payload: CreateDailyLogRequestContract = {
    patientId: data.patientId,
    dayNumber: data.dayNumber,
    weightLbs: data.weightLbs,
    medsTaken: data.medsTaken.map((medication) => ({
      drugName: medication.medicationName,
      dose: medication.dose,
      scheduled: medication.scheduled,
      taken: medication.taken,
      actualTime: medication.actualTime,
    })),
    symptoms: data.symptoms,
  };

  const res = await fetch(`${BASE_URL}/api/daily-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`createDailyLog failed: ${res.status}`);
  const body = (await res.json()) as CreateDailyLogResponseContract;

  return {
    dailyLogId: body.dailyLogId,
    flagLevel: body.flagLevel,
    flagReasons: body.flagReasons,
    alertsCreated: body.alertsCreated.map(mapAlert),
  };
}

export async function synthesizeVoice(data: SynthesizeVoiceRequest): Promise<SynthesizeVoiceResponse> {
  if (IS_STUB) {
    return { audioUrl: "", durationMs: 3000, cached: false };
  }

  const payload: SynthesizeVoiceRequestContract = {
    patientId: data.patientId,
    text: data.text,
  };

  const res = await fetch(`${BASE_URL}/api/voice/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`synthesizeVoice failed: ${res.status}`);
  const body = (await res.json()) as SynthesizeVoiceResponseContract;
  return body;
}

export async function getDashboard(patientId: string): Promise<DashboardResponseContract | { patientId: string; logs: unknown[]; alerts: unknown[] }> {
  if (IS_STUB) {
    return { patientId, logs: [], alerts: [] };
  }
  const res = await fetch(`${BASE_URL}/api/patients/${patientId}/dashboard`);
  if (!res.ok) throw new Error(`getDashboard failed: ${res.status}`);
  return (await res.json()) as DashboardResponseContract;
}

export async function generateCarePlan(
  data: GenerateCarePlanRequest
): Promise<GenerateCarePlanResponse> {
  if (IS_STUB) {
    return { carePlanId: "demo-plan-001" };
  }
  const payload: GenerateCarePlanRequestContract = data;
  const res = await fetch(`${BASE_URL}/api/care-plans/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`generateCarePlan failed: ${res.status}`);
  const body = (await res.json()) as GenerateCarePlanResponseContract;
  return { carePlanId: body.carePlanId };
}
