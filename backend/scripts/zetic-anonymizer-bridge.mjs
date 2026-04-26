#!/usr/bin/env node

/**
 * Zetic anonymizer bridge for backend regimen pipeline.
 *
 * Input (stdin JSON):
 * {
 *   "text": "raw OCR text",
 *   "options": {
 *     "modelId": "Steve/text-anonymizer-v1",
 *     "personalKey": "...",
 *     "modelVersion": 1
 *   }
 * }
 *
 * Output (stdout JSON):
 * { "anonymizedText": "...", "source": "upstream|regex_fallback" }
 *
 * Optional env:
 * - ZETIC_UPSTREAM_URL: HTTP endpoint that performs anonymization
 * - ZETIC_API_KEY: optional bearer token for upstream
 * - ZETIC_BRIDGE_TIMEOUT_MS: request timeout (default 20000)
 * - ZETIC_BRIDGE_STRICT=true: fail hard if upstream is configured but fails
 */

import process from "node:process";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function safeString(value) {
  return typeof value === "string" ? value : "";
}

function applyRegexFallback(input) {
  let output = safeString(input);
  output = output.replace(/(\bPatient\s*:\s*)([^\n]+)/gim, "$1[Person]");
  output = output.replace(/(\bMRN\s*:\s*)([A-Za-z0-9\-]+)/gim, "$1[MRN]");
  output = output.replace(
    /(\bAdmit\s*:\s*)(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/gim,
    "$1[Date]"
  );
  output = output.replace(
    /(\bDischarge\s*:\s*)(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/gim,
    "$1[Date]"
  );
  output = output.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[Identifier]");
  output = output.replace(/\b\S+@\S+\.\S+\b/g, "[Email]");
  output = output.replace(/\b(?:\+?\d[\d .\-]{7,}\d)\b/g, "[Phone number]");
  return output;
}

function extractAnonymizedText(payload) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.anonymizedText === "string") return payload.anonymizedText;
  if (typeof payload.text === "string") return payload.text;
  if (typeof payload.result === "string") return payload.result;
  if (payload.result && typeof payload.result === "object") {
    return extractAnonymizedText(payload.result);
  }
  return "";
}

async function anonymizeViaUpstream({ text, options, upstreamUrl, apiKey, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, options }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Upstream returned ${response.status}: ${body}`);
    }

    const parsed = await response.json();
    const anonymizedText = extractAnonymizedText(parsed);
    if (!anonymizedText.trim()) {
      throw new Error("Upstream returned no anonymized text.");
    }
    return anonymizedText;
  } finally {
    clearTimeout(timeout);
  }
}

function parseInput(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON on stdin.");
  }
  const text = safeString(parsed?.text);
  if (!text.trim()) {
    throw new Error("Missing non-empty 'text' in stdin payload.");
  }
  return {
    text,
    options: parsed?.options && typeof parsed.options === "object" ? parsed.options : {},
  };
}

async function main() {
  const input = parseInput(await readStdin());
  const upstreamUrl = safeString(process.env.ZETIC_UPSTREAM_URL).trim();
  const apiKey = safeString(process.env.ZETIC_API_KEY).trim();
  const timeoutMs = Number(process.env.ZETIC_BRIDGE_TIMEOUT_MS || 20000);
  const strict = safeString(process.env.ZETIC_BRIDGE_STRICT).toLowerCase() === "true";

  try {
    if (upstreamUrl) {
      const anonymizedText = await anonymizeViaUpstream({
        text: input.text,
        options: input.options,
        upstreamUrl,
        apiKey,
        timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 20000,
      });
      process.stdout.write(
        `${JSON.stringify({ anonymizedText, source: "upstream" })}\n`
      );
      return;
    }
  } catch (error) {
    if (strict) {
      throw error;
    }
  }

  const fallback = applyRegexFallback(input.text);
  process.stdout.write(
    `${JSON.stringify({ anonymizedText: fallback, source: "regex_fallback" })}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`zetic-anonymizer-bridge error: ${error.message}\n`);
  process.exit(1);
});

