import { Router } from "express";
import asyncHandler from "express-async-handler";
import multer from "multer";
import Patient from "../models/Patient";
import { cloneVoice, getSynthesizedAudio } from "../services/voiceService";
import { renderTemplate, TemplateRenderError } from "../utils/templateRenderer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

type SupportedLanguage = "en" | "es";

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === "en" || value === "es";
}

function getRequiredQueryParam(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getRequiredBodyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function setAudioResponseHeaders(res: Parameters<Parameters<typeof router.get>[1]>[1]): void {
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "public, max-age=86400");
}

router.get(
  "/api/audio",
  asyncHandler(async (req, res, next) => {
    const voiceId = getRequiredQueryParam(req.query.voiceId);
    const text = getRequiredQueryParam(req.query.text);
    const language = req.query.language;

    if (!voiceId || !text || !isSupportedLanguage(language)) {
      res.status(400).json({
        error: 'Missing or invalid query params: voiceId, text, and language ("en" | "es") are required.',
      });
      return;
    }

    const audioStream = await getSynthesizedAudio(voiceId, text, language);

    setAudioResponseHeaders(res);

    audioStream.on("error", next);
    audioStream.pipe(res);
  }),
);

router.post(
  "/api/audio/template",
  asyncHandler(async (req, res, next) => {
    const voiceId = getRequiredBodyString(req.body.voiceId);
    const templateId = getRequiredBodyString(req.body.templateId);
    const language = req.body.language;
    const vars = req.body.vars;

    if (!voiceId || !templateId || !isSupportedLanguage(language) || !isStringRecord(vars)) {
      res.status(400).json({
        error:
          'Missing or invalid body fields: voiceId, templateId, language ("en" | "es"), and vars are required.',
      });
      return;
    }

    let text: string;
    try {
      text = renderTemplate(templateId, language, vars);
    } catch (error) {
      if (error instanceof TemplateRenderError) {
        res.status(400).json({
          error: error.message,
          missingVariables: error.missingVariables,
        });
        return;
      }

      throw error;
    }

    const audioStream = await getSynthesizedAudio(voiceId, text, language);

    setAudioResponseHeaders(res);

    audioStream.on("error", next);
    audioStream.pipe(res);
  }),
);

router.post(
  "/api/voice/clone",
  upload.single("audio"),
  asyncHandler(async (req, res) => {
    const patientId = typeof req.body.patientId === "string" ? req.body.patientId.trim() : "";
    const audioBuffer = req.file?.buffer;

    if (!patientId || !audioBuffer) {
      res.status(400).json({
        error: "Missing multipart fields: patientId and audio are required.",
      });
      return;
    }

    const voiceId = await cloneVoice(audioBuffer, patientId);
    await Patient.findByIdAndUpdate(patientId, { voiceId });

    res.json({ voiceId });
  }),
);

export default router;
