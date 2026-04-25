import {
  createDailyLog,
  type CreateDailyLogRequest,
  type CreateDailyLogResponse,
} from "../api/client";
import { useApiMutation, type MutationHook } from "./useApiMutation";

export function useCreateDailyLog(): MutationHook<CreateDailyLogRequest, CreateDailyLogResponse> {
  return useApiMutation(createDailyLog);
}
