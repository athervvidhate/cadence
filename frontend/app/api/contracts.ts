export type PatientLanguage = "en" | "es";

export type AlertLevel = "green" | "yellow" | "red" | "urgent";

export type ExtractionPath = "zetic" | "gemma_fallback";

export type InteractionSeverity = "contraindicated" | "major" | "moderate";

export interface BackendCaregiver {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface CreatePatientRequestContract {
  patientName: string;
  preferredName: string;
  ageYears: number;
  language: PatientLanguage;
  baselineWeightLbs: number;
  caregiver: BackendCaregiver;
}

export interface CreatePatientResponseContract {
  patientId: string;
  createdAt: string;
}

export interface UploadVoiceResponseContract {
  voiceId: string;
  previewUrl: string;
}

export interface RegimenMedicationContract {
  drugName: string;
  rxNormCode: string;
  dose: string;
  frequency: string;
  schedule: string[];
  instructions: string;
  duration: string;
  indication: string;
  sourceConfidence: number;
}

export interface RegimenInteractionContract {
  drugs: string[];
  severity: InteractionSeverity;
  note: string;
}

export interface RegimenDiscrepancyContract {
  field: string;
  paperSays: string;
  bottleSays: string;
  recommendation: string;
}

export interface ExtractRegimenResponseContract {
  regimenId: string;
  extractionPath: ExtractionPath;
  confidence: number;
  medications: RegimenMedicationContract[];
  interactions: RegimenInteractionContract[];
  discrepancies: RegimenDiscrepancyContract[];
  needsReview: boolean;
}

export interface GenerateCarePlanRequestContract {
  patientId: string;
  regimenId: string;
  startDate: string;
}

export interface GenerateCarePlanResponseContract {
  carePlanId: string;
  summary: {
    totalDays: number;
    dailyCheckIns: number;
    scheduledFollowUps: number;
  };
}

export interface DailyLogMedTakenContract {
  drugName: string;
  dose?: string;
  scheduled?: string;
  taken: boolean;
  actualTime?: string;
}

export interface DailyLogSymptomsContract {
  shortnessOfBreath: "none" | "exertion" | "rest";
  swelling: "none" | "mild" | "moderate" | "severe";
  chestPain: "none" | "mild" | "moderate" | "severe";
  fatigue: "none" | "mild" | "moderate" | "severe";
  rawTranscript: string;
}

export interface CreateDailyLogRequestContract {
  patientId: string;
  dayNumber: number;
  weightLbs: number;
  medsTaken: DailyLogMedTakenContract[];
  symptoms: DailyLogSymptomsContract;
}

export interface AlertActionContract {
  type: string;
  to?: string;
  specialty?: string;
  status: string;
  timestamp: string;
}

export interface AlertCreatedContract {
  alertId: string;
  level: Exclude<AlertLevel, "green">;
  actionsTaken: AlertActionContract[];
}

export interface CreateDailyLogResponseContract {
  dailyLogId: string;
  flagLevel: AlertLevel;
  flagReasons: string[];
  alertsCreated: AlertCreatedContract[];
}

export interface SynthesizeVoiceRequestContract {
  patientId: string;
  text: string;
}

export interface SynthesizeVoiceResponseContract {
  audioUrl: string;
  durationMs: number;
  cached: boolean;
}

export interface DashboardWeightPointContract {
  date: string;
  weightLbs: number;
}

export interface DashboardResponseContract {
  patient: {
    _id: string;
    patientName: string;
    preferredName: string;
    ageYears: number;
    language: PatientLanguage;
    baselineWeightLbs: number;
    diagnosis: string;
  };
  currentDay: number;
  todayStatus: AlertLevel;
  weightTrend: DashboardWeightPointContract[];
  adherence7d: number;
  todaySymptoms: DailyLogSymptomsContract | null;
  alertHistory: Array<Record<string, unknown>>;
  upcomingAppointments: string[];
  regimen: {
    medications: RegimenMedicationContract[];
    interactions: RegimenInteractionContract[];
  };
}
