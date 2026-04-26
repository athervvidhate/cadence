import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

const port = Number(process.env.PORT || 8787);

const zeticUpstreamUrl = process.env.ZETIC_UPSTREAM_URL || "";
const zeticApiKey = process.env.ZETIC_API_KEY || "";
const llmUpstreamUrl = process.env.LLM_UPSTREAM_URL || "";
const llmApiKey = process.env.LLM_API_KEY || "";
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || "";
const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || "";
const elevenLabsModelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const elevenLabsOutputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

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
        `HTTP ${response.status} from ${url}: ${
          typeof payload === "string" ? payload : JSON.stringify(payload)
        }`
      );
    }
    return payload;
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
    "Medication summary:",
    ...medicationLines.map((line, index) => `${index + 1}. ${line}`),
    "",
    "Clinical reminder: verify this list with provider-approved instructions.",
  ].join("\n");
}

async function runLlmSummary(anonymizedText) {
  if (!llmUpstreamUrl) {
    return { responseText: localMedicationSummary(anonymizedText), source: "local-mock" };
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
      llm: Boolean(llmUpstreamUrl),
      elevenlabs: Boolean(elevenLabsApiKey && elevenLabsVoiceId),
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
