import { createContext, useContext } from 'react';
import type { DashboardResponse } from './types';

export type DashboardDataState = {
  data: DashboardResponse | null;
  error: Error | null;
  isLoading: boolean;
};

export const DashboardDataContext = createContext<DashboardDataState>({
  data: null,
  error: null,
  isLoading: true,
});

export function useDashboardData(): DashboardDataState {
  return useContext(DashboardDataContext);
}
