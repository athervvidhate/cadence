import {
  generateCarePlan,
  type GenerateCarePlanRequest,
  type GenerateCarePlanResponse,
} from "../api/client";
import { useApiMutation, type MutationHook } from "./useApiMutation";

export function useGenerateCarePlan(): MutationHook<
  GenerateCarePlanRequest,
  GenerateCarePlanResponse
> {
  return useApiMutation(generateCarePlan);
}
