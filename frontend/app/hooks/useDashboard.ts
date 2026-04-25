import { useCallback, useState } from "react";
import { getDashboard } from "../api/client";
import type { DashboardResponseContract } from "../api/contracts";
import type { HookError } from "./useApiMutation";

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error("Unknown API error");
}

export function useDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DashboardResponseContract | null>(null);
  const [error, setError] = useState<HookError>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setData(null);
    setError(null);
  }, []);

  const fetchDashboard = useCallback(async (patientId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDashboard(patientId);
      if ("patient" in response) {
        setData(response);
      } else {
        setData(null);
      }
      return response;
    } catch (err) {
      const next = toError(err);
      setError(next);
      throw next;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, data, error, fetchDashboard, reset };
}
