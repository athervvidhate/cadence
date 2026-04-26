// Zustand store for the active patient session — persists across all screens
import { create } from "zustand";

export interface CaregiverProfile {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface PatientStore {
  patientId: string | null;
  patientName: string;
  preferredName: string;
  baselineWeightLbs: number;
  language: "en" | "es";
  caregiver: CaregiverProfile | null;
  voiceId: string | null;
  regimenId: string | null;
  carePlanId: string | null;
  currentDay: number;
  demoMode: boolean;

  setPatientId: (id: string) => void;
  setPatientProfile: (data: {
    patientName: string;
    preferredName: string;
    baselineWeightLbs: number;
    language: "en" | "es";
    caregiver: CaregiverProfile;
  }) => void;
  setVoiceId: (id: string) => void;
  setRegimenId: (id: string) => void;
  setCarePlanId: (id: string) => void;
  setCurrentDay: (day: number) => void;
  toggleDemoMode: () => void;
  reset: () => void;
}

const initialState = {
  patientId: null,
  patientName: "",
  preferredName: "",
  baselineWeightLbs: 0,
  language: "en" as const,
  caregiver: null,
  voiceId: null,
  regimenId: null,
  carePlanId: null,
  currentDay: 1,
  demoMode: false,
};

export const usePatientStore = create<PatientStore>((set) => ({
  ...initialState,

  setPatientId: (id) => set({ patientId: id }),

  setPatientProfile: (data) => set(data),

  setVoiceId: (id) => set({ voiceId: id }),

  setRegimenId: (id) => set({ regimenId: id }),

  setCarePlanId: (id) => set({ carePlanId: id }),

  setCurrentDay: (day) => set({ currentDay: day }),

  toggleDemoMode: () => set((s) => ({ demoMode: !s.demoMode })),

  reset: () => set(initialState),
}));
