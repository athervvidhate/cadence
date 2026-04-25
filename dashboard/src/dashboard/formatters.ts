import type { ApiStatusLevel, DashboardResponse, StatusLevel } from './types';

export function displayStatus(status: ApiStatusLevel): StatusLevel {
  return status === 'urgent' ? 'red' : status;
}

export function displayPatientName(data: DashboardResponse | null): string {
  return data?.patient.patientName ?? 'Loading patient';
}

export function displayPreferredName(data: DashboardResponse | null): string {
  return data?.patient.preferredName ?? 'Patient';
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatWeight(value?: number): string {
  return typeof value === 'number' ? `${value} lb` : 'No reading';
}
