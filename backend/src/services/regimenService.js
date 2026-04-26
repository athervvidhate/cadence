const axios = require("axios");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const Regimen = require("../models/Regimen");
const { findInteractions } = require("./drugInteractionService");

// ── Gemma multimodal extraction ───────────────────────────────────────────────

const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-3-27b-it";
const GEMMA_BASE_URL =
  process.env.GEMMA_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const GEMMA_TIMEOUT_MS = Number(process.env.GEMMA_TIMEOUT_MS || 120000);
const ENABLE_LOCAL_OCR_PIPELINE = process.env.ENABLE_LOCAL_OCR_PIPELINE !== "false";
const REQUIRE_LOCAL_OCR_PIPELINE = process.env.REQUIRE_LOCAL_OCR_PIPELINE === "true";
const APPLE_VISION_OCR_TIMEOUT_MS = Number(process.env.APPLE_VISION_OCR_TIMEOUT_MS || 60000);
const ZETIC_ANONYMIZER_TIMEOUT_MS = Number(process.env.ZETIC_ANONYMIZER_TIMEOUT_MS || 30000);
const APPLE_VISION_OCR_SWIFT = process.env.APPLE_VISION_OCR_SWIFT
  || path.resolve(__dirname, "../../../ml_pipeline/apple_vision_ocr.swift");
const ZETIC_ANONYMIZER_CMD = (process.env.ZETIC_ANONYMIZER_CMD || "").trim();
const ZETIC_MODEL_ID = process.env.ZETIC_MODEL_ID || "Steve/text-anonymizer-v1";
const ZETIC_MODEL_VERSION = Number(process.env.ZETIC_MODEL_VERSION || 0) || null;
const ZETIC_PERSONAL_KEY = process.env.ZETIC_PERSONAL_KEY || process.env.EXPO_PUBLIC_ZETIC_PERSONAL_KEY || "";

const EXTRACTION_SYSTEM_PROMPT = `You are a clinical medication extraction engine for CHF discharge paperwork.

Extract ACTIVE discharge medications from the attached image(s) and output ONLY valid JSON.

Rules:
1) Include only active discharge medications. Exclude discontinued or held-home meds.
2) Preserve dose exactly with units (mg, mcg, mEq, units, mL, etc).
3) Normalize schedule to 24-hour HH:MM array. PRN meds use [].
4) Map frequencies to plain text: once daily, twice daily, three times daily, as needed, every other day.
5) Keep instructions concise and clinically relevant.
6) Use "ongoing" for duration unless a stop date is stated.
7) Indication should be short (e.g., "diuretic for fluid overload").
8) sourceConfidence must be a number in [0,1].
9) Do not include markdown, commentary, or code fences.

Also extract follow-up appointments with fields: type (string), daysFromDischarge (number), doctorName (string, optional), time (string, optional).

Output JSON shape:
{
  "extractionConfidence": <number 0..1>,
  "medications": [
    {
      "drugName": "string",
      "rxNormCode": "string",
      "dose": "string with unit",
      "frequency": "string",
      "schedule": ["HH:MM"],
      "instructions": "string",
      "duration": "string",
      "indication": "string",
      "sourceConfidence": 0.0
    }
  ],
  "followUps": [
    { "type": "string", "daysFromDischarge": 7, "doctorName": "string", "time": "string" }
  ]
}`;

function cleanJsonText(raw) {
  let text = (raw || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

function normalizeGemmaShape(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemma output is empty or invalid JSON object");
  }
  return {
    extractionConfidence: Number(payload.extractionConfidence || 0.85),
    medications: Array.isArray(payload.medications) ? payload.medications : [],
    discrepancies: Array.isArray(payload.discrepancies) ? payload.discrepancies : [],
    followUps: Array.isArray(payload.followUps) ? payload.followUps : [],
  };
}

function buildGemmaEndpoint() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return `${GEMMA_BASE_URL}/models/${encodeURIComponent(GEMMA_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function parseGemmaTextResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text || "")
    .join("")
    .trim();

  if (!text) throw new Error("Gemma returned empty response");
  return JSON.parse(cleanJsonText(text));
}

async function callGemmaMultimodal(imageBuffers) {
  const endpoint = buildGemmaEndpoint();
  if (!endpoint) return null;

  const imageParts = imageBuffers.map(({ buffer, mimetype }) => ({
    inlineData: {
      mimeType: mimetype,
      data: buffer.toString("base64"),
    },
  }));

  const payload = {
    system_instruction: { parts: [{ text: EXTRACTION_SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          ...imageParts,
          {
            text: "Extract the medication regimen from these discharge papers and return structured JSON as specified.",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 2048,
    },
  };

  const response = await axios.post(endpoint, payload, {
    timeout: GEMMA_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
  });

  return parseGemmaTextResponse(response.data);
}

async function callGemmaTextOnly(textContext) {
  const endpoint = buildGemmaEndpoint();
  if (!endpoint) return null;
  const payload = {
    system_instruction: { parts: [{ text: EXTRACTION_SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "This source text was produced by Apple Vision OCR and passed through local anonymization.",
              "Extract the medication regimen and return JSON exactly in the required schema.",
              "",
              textContext,
            ].join("\n"),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 2048,
    },
  };

  const response = await axios.post(endpoint, payload, {
    timeout: GEMMA_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
  });
  return parseGemmaTextResponse(response.data);
}

async function runProcess(command, args, { stdin = "", timeoutMs = 30000, shell = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Command failed (${code}): ${command}\n${stderr.trim()}`));
        return;
      }
      resolve({ stdout, stderr });
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

function imageExtensionFromMime(mimetype) {
  if (mimetype === "image/png") return ".png";
  if (mimetype === "image/heic") return ".heic";
  if (mimetype === "image/heif") return ".heif";
  if (mimetype === "image/webp") return ".webp";
  return ".jpg";
}

async function writeImagesToTemp(imageBuffers) {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cadence-ocr-"));
  const imagePaths = [];
  for (let i = 0; i < imageBuffers.length; i += 1) {
    const mimetype = imageBuffers[i]?.mimetype || "image/jpeg";
    const ext = imageExtensionFromMime(mimetype);
    const imagePath = path.join(tmpRoot, `page-${i}${ext}`);
    await fs.writeFile(imagePath, imageBuffers[i].buffer);
    imagePaths.push(imagePath);
  }
  return { tmpRoot, imagePaths };
}

async function runAppleVisionOcr(imageBuffers) {
  if (!imageBuffers.length) {
    throw new Error("Apple Vision OCR needs at least one image.");
  }

  await fs.access(APPLE_VISION_OCR_SWIFT);
  const { tmpRoot, imagePaths } = await writeImagesToTemp(imageBuffers);
  try {
    const { stdout } = await runProcess(
      "xcrun",
      ["swift", APPLE_VISION_OCR_SWIFT, ...imagePaths],
      { timeoutMs: APPLE_VISION_OCR_TIMEOUT_MS }
    );

    const payload = JSON.parse(String(stdout || "").trim());
    const combinedText = typeof payload.combinedText === "string" ? payload.combinedText.trim() : "";
    if (!combinedText) {
      throw new Error("Apple Vision OCR returned empty text.");
    }
    return combinedText;
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
}

function parseZeticOutput(stdout) {
  const trimmed = String(stdout || "").trim();
  if (!trimmed) {
    throw new Error("Zetic anonymizer returned empty output.");
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed;
    if (typeof parsed?.anonymizedText === "string") return parsed.anonymizedText;
    if (typeof parsed?.text === "string") return parsed.text;
    if (typeof parsed?.result === "string") return parsed.result;
  } catch (_err) {
    // If stdout isn't JSON, treat it as plain-text anonymized output.
  }
  return trimmed;
}

async function runZeticAnonymizer(rawText) {
  if (!rawText.trim()) {
    return { text: rawText, used: false };
  }
  if (!ZETIC_ANONYMIZER_CMD) {
    return { text: rawText, used: false };
  }

  const payload = {
    text: rawText,
    options: {
      modelId: ZETIC_MODEL_ID,
      personalKey: ZETIC_PERSONAL_KEY,
      modelVersion: ZETIC_MODEL_VERSION,
    },
  };
  const { stdout } = await runProcess(
    ZETIC_ANONYMIZER_CMD,
    [],
    {
      stdin: JSON.stringify(payload),
      timeoutMs: ZETIC_ANONYMIZER_TIMEOUT_MS,
      shell: true,
    }
  );
  return { text: parseZeticOutput(stdout), used: true };
}

async function extractWithLocalPipeline(imageBuffers) {
  const ocrText = await runAppleVisionOcr(imageBuffers);
  const anonymized = await runZeticAnonymizer(ocrText);
  const gemmaResult = await callGemmaTextOnly(anonymized.text);
  if (!gemmaResult || !Array.isArray(gemmaResult.medications) || gemmaResult.medications.length === 0) {
    throw new Error("Gemma (text mode) returned no medications from local OCR pipeline.");
  }
  return {
    extractedData: normalizeGemmaShape(gemmaResult),
    extractionPath: anonymized.used ? "zetic" : "gemma_direct",
    ocrChars: ocrText.length,
  };
}

// ── Fallback mock (used when Gemma is unavailable) ────────────────────────────

const MOCK_AGENT_RESPONSE = {
  extractionPath: "gemma_fallback",
  extractionConfidence: 0.94,
  medications: [
    { drugName: "Furosemide", rxNormCode: "4109", dose: "40 mg", frequency: "Once daily", schedule: ["08:00"], instructions: "Take in morning with water", duration: "30 days", indication: "Fluid retention / CHF", sourceConfidence: 0.97 },
    { drugName: "Carvedilol", rxNormCode: "20352", dose: "12.5 mg", frequency: "Twice daily", schedule: ["08:00", "20:00"], instructions: "Take with food", duration: "30 days", indication: "Heart failure / rate control", sourceConfidence: 0.95 },
    { drugName: "Lisinopril", rxNormCode: "29046", dose: "10 mg", frequency: "Once daily", schedule: ["08:00"], instructions: "Take on empty stomach", duration: "30 days", indication: "ACE inhibitor / blood pressure", sourceConfidence: 0.96 },
    { drugName: "Spironolactone", rxNormCode: "9997", dose: "25 mg", frequency: "Once daily", schedule: ["08:00"], instructions: "Take with food", duration: "30 days", indication: "Potassium-sparing diuretic", sourceConfidence: 0.93 },
  ],
  discrepancies: [{ field: "Carvedilol dose", paperSays: "12.5 mg", bottleSays: "12.5 mg", recommendation: "Consistent" }],
  followUps: [
    { type: "Cardiology", daysFromDischarge: 7 },
    { type: "Primary Care", daysFromDischarge: 14 },
  ],
};

// ── Main extraction function ──────────────────────────────────────────────────

async function extractAndStoreRegimen({ patientId, imageBuffers = [] }) {
  let extractedData = null;
  let extractionPath = "gemma_fallback";

  if (imageBuffers.length > 0 && process.env.GOOGLE_API_KEY) {
    if (ENABLE_LOCAL_OCR_PIPELINE) {
      try {
        const localResult = await extractWithLocalPipeline(imageBuffers);
        extractedData = localResult.extractedData;
        extractionPath = localResult.extractionPath;
        console.log(
          `[regimenService] Local OCR pipeline succeeded (${localResult.ocrChars} chars, path=${extractionPath})`
        );
      } catch (error) {
        console.warn(`[regimenService] Local OCR pipeline failed: ${error.message}`);
        if (REQUIRE_LOCAL_OCR_PIPELINE) {
          throw new Error(`Local OCR pipeline required but failed: ${error.message}`);
        }
      }
    }

    if (!extractedData) {
      // Fallback to direct multimodal Gemma extraction.
      const gemmaResult = await callGemmaMultimodal(imageBuffers);
      if (!gemmaResult || !Array.isArray(gemmaResult.medications) || gemmaResult.medications.length === 0) {
        throw new Error("Gemma returned no medications — check the image quality or model response");
      }
      extractedData = normalizeGemmaShape(gemmaResult);
      extractionPath = "gemma_direct";
      console.log(`[regimenService] Gemma extracted ${extractedData.medications.length} medications`);
    }
  } else {
    // No API key — use mock (dev/demo mode)
    console.log("[regimenService] No GOOGLE_API_KEY — using mock regimen");
    extractedData = {
      extractionConfidence: MOCK_AGENT_RESPONSE.extractionConfidence,
      medications: MOCK_AGENT_RESPONSE.medications,
      discrepancies: MOCK_AGENT_RESPONSE.discrepancies,
      followUps: MOCK_AGENT_RESPONSE.followUps,
    };
  }

  const interactions = findInteractions(extractedData.medications);

  const regimen = await Regimen.create({
    patientId,
    extractedAt: new Date(),
    extractionPath,
    extractionConfidence: extractedData.extractionConfidence,
    medications: extractedData.medications,
    interactions,
    discrepancies: extractedData.discrepancies,
    followUps: extractedData.followUps,
  });

  return {
    regimenId: regimen._id.toString(),
    extractionPath: regimen.extractionPath,
    confidence: regimen.extractionConfidence,
    medications: regimen.medications,
    interactions: regimen.interactions,
    discrepancies: regimen.discrepancies,
    followUps: regimen.followUps,
    needsReview: regimen.extractionConfidence < 0.7,
  };
}

module.exports = { extractAndStoreRegimen };
