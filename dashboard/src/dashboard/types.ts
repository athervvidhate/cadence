export type StatusLevel = 'green' | 'yellow' | 'red';
export type ApiStatusLevel = StatusLevel | 'urgent';

export type NavPage =
  | 'overview'
  | 'trends'
  | 'medications'
  | 'alerts'
  | 'appointments'
  | 'documents';

export type DashboardPatient = {
  _id: string;
  patientName: string;
  preferredName: string;
  ageYears: number;
  language: 'en' | 'es';
  diagnosis: string;
  baselineWeightLbs: number;
  dischargeDate: string;
  caregiver: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
    voiceId?: string | null;
    voiceCloneStatus?: 'not_started' | 'ready' | 'failed';
    voiceClonedAt?: string | null;
  };
};

export type DashboardWeightPoint = {
  date: string;
  weightLbs?: number;
};

export type DashboardAlert = {
  _id: string;
  createdAt: string;
  level: ApiStatusLevel;
  summary: string;
  flagReasons?: string[];
  actionsTaken?: Array<{
    type?: string;
    to?: string;
    status?: string;
    timestamp?: string;
  }>;
  resolvedAt?: string | null;
  resolution?: string | null;
};

export type DashboardMedication = {
  drugName: string;
  dose: string;
  frequency: string;
  schedule?: string[];
  instructions?: string;
  indication?: string;
  sourceConfidence?: number;
};

export type DashboardResponse = {
  patient: DashboardPatient;
  currentDay: number;
  todayStatus: ApiStatusLevel;
  weightTrend: DashboardWeightPoint[];
  adherence7d: number;
  todaySymptoms: {
    shortnessOfBreath?: string;
    swelling?: string;
    chestPain?: string;
    fatigue?: string;
    rawTranscript?: string;
  } | null;
  alertHistory: DashboardAlert[];
  upcomingAppointments: Array<{
    title?: string;
    date?: string;
    type?: string;
  }>;
  regimen: {
    medications: DashboardMedication[];
    interactions: Array<{
      drugs: string[];
      severity: string;
      note: string;
    }>;
  };
};
