import { createPatient, type CreatePatientRequest, type CreatePatientResponse } from "../api/client";
import { useApiMutation, type MutationHook } from "./useApiMutation";

export function useCreatePatient(): MutationHook<CreatePatientRequest, CreatePatientResponse> {
  return useApiMutation(createPatient);
}
