// Zustand store for locally staged capture URIs — no uploads happen until RegimenReviewScreen
import { create } from "zustand";
import type { ExtractRegimenResponse } from "../api/client";

// Re-export with domain name so screens don't need to know the API type name
export type ExtractionResult = ExtractRegimenResponse;

interface CaptureStore {
  dischargePages: string[];      // local file URIs, in capture order
  medicationBottles: string[];   // local file URIs, in capture order
  regimenId: string | null;
  extractionResult: ExtractionResult | null;

  addDischargePage: (uri: string) => void;
  replaceDischargePage: (index: number, uri: string) => void;
  addMedicationBottle: (uri: string) => void;
  replaceMedicationBottle: (index: number, uri: string) => void;
  setRegimenId: (id: string) => void;
  setExtractionResult: (result: ExtractionResult) => void;
  reset: () => void;
}

const initialState = {
  dischargePages: [] as string[],
  medicationBottles: [] as string[],
  regimenId: null,
  extractionResult: null,
};

export const useCaptureStore = create<CaptureStore>((set) => ({
  ...initialState,

  addDischargePage: (uri) =>
    set((s) => ({ dischargePages: [...s.dischargePages, uri] })),

  replaceDischargePage: (index, uri) =>
    set((s) => ({
      dischargePages: s.dischargePages.map((p, i) => (i === index ? uri : p)),
    })),

  addMedicationBottle: (uri) =>
    set((s) => ({ medicationBottles: [...s.medicationBottles, uri] })),

  replaceMedicationBottle: (index, uri) =>
    set((s) => ({
      medicationBottles: s.medicationBottles.map((b, i) =>
        i === index ? uri : b
      ),
    })),

  setRegimenId: (id) => set({ regimenId: id }),

  setExtractionResult: (result) => set({ extractionResult: result }),

  reset: () => set(initialState),
}));
