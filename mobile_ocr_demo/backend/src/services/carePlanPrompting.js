import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptsDir = path.resolve(__dirname, "../../prompts");

const systemPromptPath = path.join(promptsDir, "care-plan-system-prompt.txt");
const userTemplatePath = path.join(promptsDir, "care-plan-user-template.txt");

function readPromptFile(filePath, fallback = "") {
  if (!fs.existsSync(filePath)) return fallback;
  return fs.readFileSync(filePath, "utf-8");
}

export const carePlanSystemPrompt = readPromptFile(systemPromptPath);
const userTemplate = readPromptFile(
  userTemplatePath,
  [
    "Return compact JSON: schemaVersion compact-v1, language, generationNote, scripts { morning, evening, enhanced }.",
    "Do not output 30 day rows; use __DAY__ and __DATE__ in script lines if needed.",
    "",
    "PATIENT_PROFILE:",
    "{{patient_profile_json}}",
    "",
    "REGIMEN:",
    "{{regimen_json}}",
    "",
    "START_DATE: {{start_date_iso}}",
  ].join("\n")
);

export function buildCarePlanUserPrompt({ patientProfile, regimen, startDateIso }) {
  return userTemplate
    .replace("{{patient_profile_json}}", JSON.stringify(patientProfile ?? {}, null, 2))
    .replace("{{regimen_json}}", JSON.stringify(regimen ?? {}, null, 2))
    .replace("{{start_date_iso}}", String(startDateIso || ""));
}

function tryParseJson(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, value: null };
  }
}

function stripBom(s) {
  return String(s || "").replace(/^\uFEFF/, "");
}

/** First complete `{ ... }` segment; respects JSON strings so `}` inside values does not end early. */
function extractFirstJsonObjectText(text) {
  const s = String(text);
  const start = s.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i += 1) {
    const c = s[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
        continue;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") {
      depth += 1;
      continue;
    }
    if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

function parseJsonObjectValue(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return parsed;
}

function coerceToObject(parsed) {
  const asObj = parseJsonObjectValue(parsed);
  if (asObj) return asObj;
  if (typeof parsed === "string") {
    const t = stripBom(parsed).trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      const again = tryParseJson(t);
      if (again.ok) {
        return coerceToObject(again.value);
      }
    }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    return coerceToObject(parsed[0]);
  }
  return null;
}

export function extractJsonObjectFromText(text) {
  const normalized = stripBom(text).trim();
  if (!normalized) {
    throw new Error("Model response did not contain valid JSON (empty).");
  }

  const tryOnce = (chunk) => {
    const t = stripBom(String(chunk || "")).trim();
    if (!t) return null;
    const p = tryParseJson(t);
    if (!p.ok) return null;
    return coerceToObject(p.value);
  };

  const direct = tryOnce(normalized);
  if (direct) return direct;

  const fenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    const fromFence = tryOnce(fenceMatch[1]);
    if (fromFence) return fromFence;
  }

  const balanced = extractFirstJsonObjectText(normalized);
  if (balanced) {
    const fromBalanced = tryOnce(balanced);
    if (fromBalanced) return fromBalanced;
  }

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const fromSlice = tryOnce(normalized.slice(firstBrace, lastBrace + 1));
    if (fromSlice) return fromSlice;
  }

  const preview = normalized.length > 220 ? `${normalized.slice(0, 220)}...` : normalized;
  throw new Error(
    `Model response did not contain valid JSON. After trimming/BOM-stripping, the payload did not parse (snippet: ${preview})`
  );
}
