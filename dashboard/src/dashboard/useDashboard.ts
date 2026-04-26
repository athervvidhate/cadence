import { useEffect, useState } from 'react';
import { PATIENT_ID } from './constants';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface AlertAction { type: string; to: string; specialty?: string; status: string; }
export interface AlertRecord {
  _id: string;
  level: 'yellow' | 'red' | 'urgent';
  summary: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  actionsTaken: AlertAction[];
}
export interface Medication {
  drugName: string;
  dose: string;
  frequency: string;
  schedule: string[];
  instructions: string;
  duration: string;
  indication: string;
}
export interface Interaction {
  drugs: string[];
  severity: 'moderate' | 'major' | 'contraindicated';
  note: string;
}
export interface Appointment {
  type: string;
  daysFromDischarge: number;
  date: string;
}

export interface DashboardData {
  patient: { patientName: string; preferredName: string; baselineWeightLbs: number; dischargeDate: string; caregiver: { name: string } };
  currentDay: number;
  todayStatus: 'green' | 'yellow' | 'red';
  weightTrend: { date: string; weightLbs: number }[];
  adherence7d: number;
  todaySymptoms: Record<string, string> | null;
  alertHistory: AlertRecord[];
  upcomingAppointments: Appointment[];
  regimen: { medications: Medication[]; interactions: Interaction[] };
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/patients/${PATIENT_ID}/dashboard`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
