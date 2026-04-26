import type { StatusLevel } from './types';

export const PATIENT_ID = import.meta.env.VITE_DEMO_PATIENT_ID || 'robert-chen';

export const STATUS_META: Record<
  StatusLevel,
  { label: string; headline: string; tone: StatusLevel; detail: string }
> = {
  green: {
    label: 'Stable',
    headline: 'Dad is looking steady.',
    tone: 'green',
    detail: 'Weight, breathing, and meds are all tracking on baseline.',
  },
  yellow: {
    label: 'Watch',
    headline: 'Dad is worth watching.',
    tone: 'yellow',
    detail: 'Mild trend change with a symptom pattern worth watching.',
  },
  red: {
    label: 'Action needed',
    headline: 'Dad is a red flag.',
    tone: 'red',
    detail: 'Pattern matches early CHF decompensation and needs intervention.',
  },
};

export const CHART_DATA = [
  { day: 'D1', weight: 184 },
  { day: 'D2', weight: 184 },
  { day: 'D3', weight: 185 },
  { day: 'D4', weight: 187 },
  { day: 'D5', weight: 184 },
  { day: 'D6', weight: 183 },
  { day: 'D7', weight: 182 },
];
