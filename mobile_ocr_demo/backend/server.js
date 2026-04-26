import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCarePlanCacheKey,
  buildCarePlanFromLlmCompact,
  isLegacyFull30DayPlan,
} from "./src/services/carePlanGenerator.js";
import {
  summarizeValidationErrors,
  validateCarePlan,
} from "./src/services/carePlanValidation.js";
import {
  buildCarePlanUserPrompt,
  carePlanSystemPrompt,
  extractJsonObjectFromText,
} from "./src/services/carePlanPrompting.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

const port = Number(process.env.PORT || 8787);

const zeticUpstreamUrl = process.env.ZETIC_UPSTREAM_URL || "";
const zeticApiKey = process.env.ZETIC_API_KEY || "";
const llmUpstreamUrl = process.env.LLM_UPSTREAM_URL || "";
const llmApiKey = process.env.LLM_API_KEY || "";
const gemmaApiKey = process.env.GEMMA_API_KEY || "";
const gemmaModel = process.env.GEMMA_MODEL || "gemma-3-27b-it";
const gemmaBaseUrl =
  process.env.GEMMA_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
/** Regimen LLM calls; large Gemma models often exceed 30s from the phone + longer OCR text. */
const gemmaTimeoutMs = Number(process.env.GEMMA_TIMEOUT_MS || 120000);
const carePlanGemmaModel = process.env.CARE_PLAN_GEMMA_MODEL || gemmaModel;
const carePlanTimeoutMs = Number(process.env.CARE_PLAN_TIMEOUT_MS || 120000);
const carePlanMaxOutputTokens = Number(process.env.CARE_PLAN_MAX_OUTPUT_TOKENS || 4096);
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || "";
const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || "";
const elevenLabsModelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const elevenLabsOutputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPromptPath = path.join(__dirname, "prompts", "regimen-system-prompt.txt");
const regimenSystemPrompt = fs.existsSync(defaultPromptPath)
  ? fs.readFileSync(defaultPromptPath, "utf-8")
  : [
      "You are a clinical discharge medication regimen assistant.",
      "Use only the anonymized OCR text provided.",
      "If input is not a medical discharge/medication document, say so clearly and request a clearer medical document.",
      "If it is medical, produce a practical regimen summary with schedule, hold parameters, and follow-up reminders.",
      "Do not invent values not grounded in the source.",
    ].join("\n");

const carePlanCache = new Map();

function shorten(text, max = 320) {
  const compact = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 3)}...`;
}

function sanitizeError(error) {
  if (!error) return "Unknown error";
  if (error instanceof Error) return shorten(error.message, 420);
  return shorten(String(error), 420);
}

function redactSensitiveUrl(url) {
  const raw = String(url || "");
  return raw.replace(/([?&]key=)[^&]+/gi, "$1REDACTED");
}

function joinModelTextParts(parts, { separator = "\n" } = {}) {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => part && part.thought !== true)
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join(separator)
    .trim();
}

async function jsonOrText(response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function postJson(url, body, { apiKey = "", headers = {}, timeoutMs = 25000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const safeUrl = redactSensitiveUrl(url);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await jsonOrText(response);
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} from ${safeUrl}: ${
          typeof payload === "string" ? payload : JSON.stringify(payload)
        }`
      );
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms calling ${safeUrl}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function localAnonymize(text) {
  let output = text;
  output = output.replace(/(Patient:\s*)([A-Za-z ,.'-]+)/gi, "$1[REDACTED_NAME]");
  output = output.replace(/(MRN:\s*)([A-Za-z0-9-]+)/gi, "$1[REDACTED_MRN]");
  output = output.replace(/(Historia:\s*)([A-Za-z0-9-]+)/gi, "$1[REDACTED_HISTORIA]");
  output = output.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[REDACTED_DATE]");
  output = output.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, "[REDACTED_DATE]");
  output = output.replace(/\b\S+@\S+\.\S+\b/g, "[REDACTED_EMAIL]");
  output = output.replace(/\b(?:\+?\d[\d -]{7,}\d)\b/g, "[REDACTED_PHONE]");
  return output;
}

async function runZeticAnonymize(text) {
  if (!zeticUpstreamUrl) {
    return { anonymizedText: localAnonymize(text), source: "local-mock" };
  }

  const payload = await postJson(
    zeticUpstreamUrl,
    {
      text,
      mode: "anonymize_pii",
      source: "apple_vision_ocr",
    },
    { apiKey: zeticApiKey }
  );

  const anonymizedText =
    payload?.anonymizedText ??
    payload?.anonymized_text ??
    payload?.outputText ??
    payload?.output ??
    payload?.text;

  if (!anonymizedText || typeof anonymizedText !== "string") {
    throw new Error("Zetic upstream response missing anonymized text field.");
  }
  return { anonymizedText, source: "zetic-upstream" };
}

function localMedicationSummary(anonymizedText) {
  const lines = anonymizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const medicationLines = lines
    .filter((line) =>
      /\b(mg|mcg|meq|tablet|capsule|po|bid|tid|daily|qhs|once|twice)\b/i.test(line)
    )
    .slice(0, 10);

  if (!medicationLines.length) {
    return "No medication lines were confidently detected. Please retry OCR with a clearer image.";
  }

  return [
    "Medication regimen summary:",
    ...medicationLines.map((line, index) => `${index + 1}. ${line}`),
    "",
    "Clinical reminder: verify this list with provider-approved instructions.",
  ].join("\n");
}

function buildRegimenUserPrompt(anonymizedText) {
  return [
    "Create a patient-friendly medication regimen from the anonymized OCR text below.",
    "",
    "Output format (plain text only):",
    "1) Document assessment: one line saying whether this appears to be a discharge/medication document.",
    "2) Medication regimen: bullet list of medications with dose, timing/frequency, and hold instructions when present.",
    "3) Daily schedule: time-ordered checklist.",
    "4) Safety notes: high-risk reminders and when to seek urgent care.",
    "5) Missing/uncertain items: bullet list of ambiguities or missing data.",
    "",
    "If the text is not clearly medical/discharge related, output only:",
    "\"This does not appear to be a discharge medication document. Please retry with a clearer discharge or medication image.\"",
    "",
    "Anonymized OCR text:",
    anonymizedText,
  ].join("\n");
}

async function runGemmaRegimenSummary(anonymizedText) {
  const endpoint = `${gemmaBaseUrl}/models/${encodeURIComponent(gemmaModel)}:generateContent?key=${encodeURIComponent(gemmaApiKey)}`;

  const payload = await postJson(
    endpoint,
    {
      system_instruction: {
        parts: [{ text: regimenSystemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildRegimenUserPrompt(anonymizedText) }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 1024,
      },
    },
    {
      timeoutMs: gemmaTimeoutMs,
    }
  );

  const text = joinModelTextParts(payload?.candidates?.[0]?.content?.parts);

  if (!text) {
    throw new Error("Gemma response did not include output text.");
  }
  return text;
}

async function runLlmSummary(anonymizedText) {
  if (!llmUpstreamUrl) {
    if (gemmaApiKey) {
      const responseText = await runGemmaRegimenSummary(anonymizedText);
      return { responseText, source: "gemma-direct" };
    }
    throw new Error(
      "No LLM configured. Set LLM_UPSTREAM_URL or GEMMA_API_KEY to enable regimen generation."
    );
  }

  const payload = await postJson(
    llmUpstreamUrl,
    {
      anonymizedText,
      task: "discharge-medication-assistant",
    },
    { apiKey: llmApiKey }
  );

  const responseText =
    payload?.responseText ?? payload?.summary ?? payload?.output ?? payload?.text;
  if (!responseText || typeof responseText !== "string") {
    throw new Error("LLM upstream response missing response text field.");
  }
  return { responseText, source: "llm-upstream" };
}

function stableHash(value) {
  const raw = typeof value === "string" ? value : JSON.stringify(value || {});
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 20);
}

function normalizeStartDateIso(startDateInput) {
  const raw = String(startDateInput || "").trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeCarePlanInput(payload) {
  const patientProfile = payload?.patientProfile ?? payload?.patient_profile ?? {};
  const regimen = payload?.regimen ?? payload?.regimen_json ?? {};
  const startDateIso = normalizeStartDateIso(payload?.startDate ?? payload?.start_date);
  const language = String(patientProfile?.language || "en").trim().toLowerCase() === "es" ? "es" : "en";
  const regimenId = String(payload?.regimenId ?? payload?.regimen_id ?? regimen?.id ?? "").trim();
  const forceRegenerate = Boolean(payload?.forceRegenerate ?? payload?.force_regenerate);
  return {
    patientProfile,
    regimen,
    startDateIso,
    language,
    regimenId,
    forceRegenerate,
  };
}

function extractGemmaText(payload) {
  return joinModelTextParts(payload?.candidates?.[0]?.content?.parts);
}

function extractGemmaTextJsonResponse(payload) {
  // When responseMimeType is application/json, parts are safest joined with
  // no separator: a "\n" between parts can be inserted *inside* a JSON string
  // if the API splits mid-value.
  return joinModelTextParts(payload?.candidates?.[0]?.content?.parts, { separator: "" });
}

function readCarePlanCandidateIssues(payload) {
  const block = payload?.promptFeedback?.blockReason;
  if (block) {
    return `Prompt blocked (${String(block)}).`;
  }
  const c = payload?.candidates?.[0];
  if (!c) {
    return "No candidate in model response.";
  }
  const reason = String(c.finishReason || c.finish_reason || "")
    .toUpperCase()
    .replace(/^FINISH_REASON_/, "");
  const terminalFailure = new Set([
    "MAX_TOKENS",
    "SAFETY",
    "RECITATION",
    "BLOCKLIST",
    "PROHIBITED_CONTENT",
  ]);
  if (reason && terminalFailure.has(reason)) {
    return `Model finishReason was ${String(c.finishReason || c.finish_reason)}.`;
  }
  return "";
}

async function runGemmaCarePlan({ patientProfile, regimen, startDateIso }) {
  const endpoint = `${gemmaBaseUrl}/models/${encodeURIComponent(
    carePlanGemmaModel
  )}:generateContent?key=${encodeURIComponent(gemmaApiKey)}`;

  const payload = await postJson(
    endpoint,
    {
      system_instruction: {
        parts: [{ text: carePlanSystemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildCarePlanUserPrompt({
                patientProfile,
                regimen,
                startDateIso,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: carePlanMaxOutputTokens,
        responseMimeType: "application/json",
      },
    },
    { timeoutMs: carePlanTimeoutMs }
  );

  const candidateNote = readCarePlanCandidateIssues(payload);
  if (candidateNote) {
    throw new Error(`Gemma care-plan call failed: ${candidateNote}`);
  }

  const rawText = extractGemmaTextJsonResponse(payload);
  if (!rawText) {
    throw new Error("Gemma care-plan response was empty.");
  }
  return extractJsonObjectFromText(rawText);
}

async function generateCarePlan(payload) {
  const {
    patientProfile,
    regimen,
    startDateIso,
    language,
    regimenId,
    forceRegenerate,
  } = normalizeCarePlanInput(payload);

  if (!startDateIso) {
    throw new Error("Invalid START_DATE. Expected ISO date (YYYY-MM-DD).");
  }

  const baseKey = buildCarePlanCacheKey({
    regimenId,
    regimen: regimenId ? undefined : { hash: stableHash(regimen) },
    startDateIso,
    language,
  });
  const cacheKey = baseKey;

  if (!forceRegenerate && carePlanCache.has(cacheKey)) {
    return {
      ...carePlanCache.get(cacheKey),
      cached: true,
      cacheKey,
    };
  }

  if (!gemmaApiKey) {
    throw new Error("GEMMA_API_KEY is missing. Care plan generation requires a live LLM call.");
  }

  const rawPlan = await runGemmaCarePlan({ patientProfile, regimen, startDateIso });
  const llmPlan = isLegacyFull30DayPlan(rawPlan)
    ? rawPlan
    : buildCarePlanFromLlmCompact({
        patientProfile,
        regimen,
        startDateIso,
        compact: rawPlan,
      });
  const validation = validateCarePlan(llmPlan, { language, startDateIso });
  if (!validation.valid) {
    throw new Error(`Care plan JSON failed validation: ${summarizeValidationErrors(validation.errors)}`);
  }

  const result = {
    plan: {
      ...llmPlan,
      generationNote:
        typeof llmPlan.generationNote === "string" || llmPlan.generationNote === null
          ? llmPlan.generationNote
          : null,
    },
    source: "gemma-care-plan",
    cacheKey,
    cached: false,
    validationErrors: [],
  };
  carePlanCache.set(cacheKey, { ...result, cached: false });
  return result;
}

async function runElevenLabs(text) {
  if (!elevenLabsApiKey || !elevenLabsVoiceId) {
    return { audioBase64: "", mimeType: "audio/mpeg", source: "disabled" };
  }

  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      elevenLabsVoiceId
    )}?output_format=${encodeURIComponent(elevenLabsOutputFormat)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": elevenLabsApiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: elevenLabsModelId,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
      },
    }),
  });

  const responseBuffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(
      `ElevenLabs failed (${response.status}): ${responseBuffer.toString("utf-8").slice(0, 300)}`
    );
  }

  return {
    audioBase64: responseBuffer.toString("base64"),
    mimeType: "audio/mpeg",
    source: "elevenlabs",
  };
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    services: {
      zetic: Boolean(zeticUpstreamUrl),
      llm: Boolean(llmUpstreamUrl || gemmaApiKey),
      gemma: Boolean(gemmaApiKey),
      carePlanGemma: Boolean(gemmaApiKey),
      elevenlabs: Boolean(elevenLabsApiKey && elevenLabsVoiceId),
    },
    cache: {
      carePlans: carePlanCache.size,
    },
  });
});

app.post("/zetic/anonymize", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Request body must include non-empty text." });
    }
    const result = await runZeticAnonymize(text);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: sanitizeError(error) });
  }
});

app.post("/llm/medication-summary", async (req, res) => {
  try {
    const anonymizedText = String(req.body?.anonymizedText || "").trim();
    if (!anonymizedText) {
      return res
        .status(400)
        .json({ error: "Request body must include non-empty anonymizedText." });
    }
    const result = await runLlmSummary(anonymizedText);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: sanitizeError(error) });
  }
});

app.post("/care-plan/generate", async (req, res) => {
  try {
    const result = await generateCarePlan(req.body || {});
    return res.json({
      ...result.plan,
      source: result.source,
      cacheKey: result.cacheKey,
      cached: result.cached,
      validationErrors: result.validationErrors,
    });
  } catch (error) {
    return res.status(500).json({ error: sanitizeError(error) });
  }
});

app.post("/tts/elevenlabs", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Request body must include non-empty text." });
    }
    const result = await runElevenLabs(text);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: sanitizeError(error) });
  }
});

app.post("/pipeline/run", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Request body must include non-empty text." });
    }

    const anonymized = await runZeticAnonymize(text);
    const llm = await runLlmSummary(anonymized.anonymizedText);
    const tts = await runElevenLabs(llm.responseText);

    return res.json({
      anonymizedText: anonymized.anonymizedText,
      llmText: llm.responseText,
      audioBase64: tts.audioBase64,
      mimeType: tts.mimeType,
      sources: {
        anonymize: anonymized.source,
        llm: llm.source,
        tts: tts.source,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: sanitizeError(error) });
  }
});

app.listen(port, () => {
  console.log(`Cadence demo backend listening on http://0.0.0.0:${port}`);
});
