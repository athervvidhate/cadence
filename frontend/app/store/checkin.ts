// Zustand store for a single voice check-in session — reset after each daily log post
import { create } from "zustand";

export interface SymptomsPayload {
  shortnessOfBreath: "none" | "exertion" | "rest";
  swelling: "none" | "mild" | "moderate" | "severe";
  chestPain: "none" | "mild" | "severe";
  fatigue: "none" | "mild" | "moderate" | "severe";
  rawTranscript: string;
}

interface CheckInStore {
  isActive: boolean;
  currentTurn: number;
  transcript: string[];
  pendingSymptoms: Partial<SymptomsPayload>;

  startCheckIn: () => void;
  endCheckIn: () => void;
  advanceTurn: () => void;
  appendTranscript: (line: string) => void;
  setPendingSymptom: <K extends keyof SymptomsPayload>(
    key: K,
    value: SymptomsPayload[K]
  ) => void;
  reset: () => void;
}

const initialState = {
  isActive: false,
  currentTurn: 0,
  transcript: [] as string[],
  pendingSymptoms: {} as Partial<SymptomsPayload>,
};

export const useCheckInStore = create<CheckInStore>((set) => ({
  ...initialState,

  startCheckIn: () => set({ isActive: true, currentTurn: 0 }),

  endCheckIn: () => set({ isActive: false }),

  advanceTurn: () => set((s) => ({ currentTurn: s.currentTurn + 1 })),

  appendTranscript: (line) =>
    set((s) => ({ transcript: [...s.transcript, line] })),

  setPendingSymptom: (key, value) =>
    set((s) => ({ pendingSymptoms: { ...s.pendingSymptoms, [key]: value } })),

  reset: () => set(initialState),
}));
