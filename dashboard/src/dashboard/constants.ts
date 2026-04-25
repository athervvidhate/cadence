import type { StatusLevel } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
export const PATIENT_ID = import.meta.env.VITE_DEMO_PATIENT_ID ?? 'replace-with-patient-id';

export const STATUS_META: Record<
  StatusLevel,
  { label: string; headline: (preferredName: string) => string; tone: StatusLevel; detail: string }
> = {
  green: {
    label: 'Stable',
    headline: (preferredName) => `${preferredName} is looking steady.`,
    tone: 'green',
    detail: 'Weight, breathing, and meds are all tracking on baseline.',
  },
  yellow: {
    label: 'Watch',
    headline: (preferredName) => `${preferredName} is worth watching.`,
    tone: 'yellow',
    detail: 'Mild trend change with a symptom pattern worth watching.',
  },
  red: {
    label: 'Action needed',
    headline: (preferredName) => `${preferredName} needs attention.`,
    tone: 'red',
    detail: 'Pattern matches early CHF decompensation and needs intervention.',
  },
};
