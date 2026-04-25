import {
  synthesizeVoice,
  type SynthesizeVoiceRequest,
  type SynthesizeVoiceResponse,
} from "../api/client";
import { useApiMutation, type MutationHook } from "./useApiMutation";

export function useSynthesizeVoice(): MutationHook<
  SynthesizeVoiceRequest,
  SynthesizeVoiceResponse
> {
  return useApiMutation(synthesizeVoice);
}
