import {
  extractRegimen,
  type ExtractRegimenRequest,
  type ExtractRegimenResponse,
} from "../api/client";
import { useApiMutation, type MutationHook } from "./useApiMutation";

export function useExtractRegimen(): MutationHook<ExtractRegimenRequest, ExtractRegimenResponse> {
  return useApiMutation(extractRegimen);
}
