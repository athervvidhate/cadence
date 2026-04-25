import { uploadVoice, type UploadVoiceResponse } from "../api/client";
import { useApiMutation, type MutationHook } from "./useApiMutation";

export interface UploadVoicePayload {
  patientId: string;
  audioUri: string;
}

export function useUploadVoice(): MutationHook<UploadVoicePayload, UploadVoiceResponse> {
  return useApiMutation(({ patientId, audioUri }) => uploadVoice(patientId, audioUri));
}
