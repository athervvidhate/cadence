import { Platform } from "react-native";

// ─── Color tokens (translated from design's oklch values) ─────────────────────
export const C = {
  // Backgrounds
  bg: "#F6F3EC",
  bgElev: "#FBF9F4",
  surface: "#FFFFFF",
  // Ink
  ink: "#1A1F1B",
  ink2: "#3B413C",
  ink3: "#6B716C",
  ink4: "#9CA29D",
  // Borders
  hairline: "#E4DFD3",
  hairline2: "#EFEAE0",
  // Accent — clinical green oklch(0.52 0.09 155)
  accent: "#4A8369",
  accentSoft: "#E8F3EE",
  accentInk: "#2A5840",
  // Warn — amber oklch(0.78 0.13 75)
  warn: "#C9A040",
  warnSoft: "#F7EDD6",
  warnInk: "#785A1A",
  // Danger — clinical red oklch(0.58 0.18 25)
  danger: "#BF3B2B",
  dangerSoft: "#F4E8E5",
  dangerInk: "#882B1F",
  // Patient (dark) screen
  patientBg: "#0E120F",
  patientText: "#F2EEE3",
  patientDim: "rgba(242,238,227,0.55)",
  patientDimmer: "rgba(242,238,227,0.25)",
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONT = {
  serif: "Georgia",
  mono: Platform.select({ ios: "Menlo-Regular", android: "monospace", default: "monospace" }),
} as const;

// ─── Border radii ─────────────────────────────────────────────────────────────
export const R = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 22,
  pill: 999,
} as const;
