import { API_BASE_URL } from './constants';
import type { DashboardResponse } from './types';

export async function getPatientDashboard(patientId: string): Promise<DashboardResponse> {
  const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/dashboard`);

  if (!response.ok) {
    const fallbackMessage = `Failed to load dashboard (${response.status})`;
    let message = fallbackMessage;

    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? fallbackMessage;
    } catch {
      message = fallbackMessage;
    }

    throw new Error(message);
  }

  return response.json() as Promise<DashboardResponse>;
}
