import { useCallback, useState } from "react";

export type HookError = Error | null;

export interface MutationState<TData> {
  isLoading: boolean;
  data: TData | null;
  error: HookError;
  reset: () => void;
}

export interface MutationHook<TPayload, TData> extends MutationState<TData> {
  mutate: (payload: TPayload) => Promise<TData>;
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error("Unknown API error");
}

export function useApiMutation<TPayload, TData>(
  fn: (payload: TPayload) => Promise<TData>
): MutationHook<TPayload, TData> {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<HookError>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setData(null);
    setError(null);
  }, []);

  const mutate = useCallback(
    async (payload: TPayload): Promise<TData> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fn(payload);
        setData(response);
        return response;
      } catch (err) {
        const next = toError(err);
        setError(next);
        throw next;
      } finally {
        setIsLoading(false);
      }
    },
    [fn]
  );

  return { isLoading, data, error, mutate, reset };
}
