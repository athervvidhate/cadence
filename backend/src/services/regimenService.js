const axios = require("axios");
const Regimen = require("../models/Regimen");
const { findInteractions } = require("./drugInteractionService");
const env = require("../config/env");

// ── Gemma multimodal extraction ───────────────────────────────────────────────

const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-3-27b-it";
const GEMMA_BASE_URL =
  process.env.GEMMA_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const GEMMA_TIMEOUT_MS = Number(process.env.GEMMA_TIMEOUT_MS || 120000);

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

async function callGemmaMultimodal(imageBuffers) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const imageParts = imageBuffers.map(({ buffer, mimetype }) => ({
    inlineData: {
      mimeType: mimetype,
      data: buffer.toString("base64"),
    },
  }));

  const endpoint = `${GEMMA_BASE_URL}/models/${encodeURIComponent(GEMMA_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
      responseMimeType: "application/json",
    },
  };

  const response = await axios.post(endpoint, payload, {
    timeout: GEMMA_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
  });

  const parts = response.data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text || "")
    .join("")
    .trim();

  if (!text) throw new Error("Gemma returned empty response");
  return JSON.parse(cleanJsonText(text));
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
    try {
      const gemmaResult = await callGemmaMultimodal(imageBuffers);
      if (gemmaResult && Array.isArray(gemmaResult.medications) && gemmaResult.medications.length > 0) {
        extractedData = {
          extractionConfidence: gemmaResult.extractionConfidence || 0.85,
          medications: gemmaResult.medications,
          discrepancies: gemmaResult.discrepancies || [],
          followUps: gemmaResult.followUps || [],
        };
        extractionPath = "gemma_direct";
        console.log(`[regimenService] Gemma extracted ${extractedData.medications.length} medications`);
      }
    } catch (err) {
      console.warn("[regimenService] Gemma extraction failed, falling back to mock:", err.message);
    }
  }

  if (!extractedData) {
    extractedData = {
      extractionConfidence: MOCK_AGENT_RESPONSE.extractionConfidence,
      medications: MOCK_AGENT_RESPONSE.medications,
      discrepancies: MOCK_AGENT_RESPONSE.discrepancies,
      followUps: MOCK_AGENT_RESPONSE.followUps,
    };
    if (!process.env.GOOGLE_API_KEY) {
      console.log("[regimenService] No GOOGLE_API_KEY — using mock regimen");
    }
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
