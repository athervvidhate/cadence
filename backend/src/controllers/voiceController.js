const { saveVoiceId } = require("../services/patientService");
const Patient = require("../models/Patient");
const { renderTemplate, TemplateRenderError } = require("../services/templateRenderer");
const {
  cloneVoice,
  getPatientVoiceId,
  getSynthesizedAudio,
  getSynthesizedAudioForPatient,
} = require("../services/voiceService");

function setAudioHeaders(res) {
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "public, max-age=86400");
}

function pipeAudioStream(audioStream, res, next) {
  setAudioHeaders(res);
  audioStream.on("error", next);
  audioStream.pipe(res);
}

function getBodyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isSupportedLanguage(value) {
  return value === "en" || value === "es";
}

function isStringRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

async function cloneVoiceController(req, res) {
  const patientId = getBodyString(req.body.patientId);
  const audioBuffer = req.file?.buffer;

  if (!patientId || !audioBuffer) {
    const error = new Error("Multipart fields 'patientId' and 'audio' are required.");
    error.statusCode = 400;
    throw error;
  }

  const patient = await Patient.findById(patientId).lean();
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  const voiceId = await cloneVoice(audioBuffer, patient.caregiver?.name || patient.preferredName);
  await saveVoiceId(patientId, voiceId);

  res.status(200).json({ voiceId, patientId });
}

async function streamTextAudioController(req, res, next) {
  const voiceId = getBodyString(req.query.voiceId);
  const text = getBodyString(req.query.text);
  const language = req.query.language;

  if (!voiceId || !text || !isSupportedLanguage(language)) {
    const error = new Error('Query params voiceId, text, and language ("en" | "es") are required.');
    error.statusCode = 400;
    throw error;
  }

  const audioStream = await getSynthesizedAudio(voiceId, text, language);
  pipeAudioStream(audioStream, res, next);
}

async function streamTemplateAudioController(req, res, next) {
  const patientId = getBodyString(req.body.patientId);
  const requestVoiceId = getBodyString(req.body.voiceId);
  const templateId = getBodyString(req.body.templateId);
  const language = req.body.language;
  const vars = req.body.vars;

  if ((!patientId && !requestVoiceId) || !templateId || !isSupportedLanguage(language) || !isStringRecord(vars)) {
    const error = new Error(
      'Body fields templateId, language ("en" | "es"), vars, and either patientId or voiceId are required.'
    );
    error.statusCode = 400;
    throw error;
  }

  let text;
  try {
    text = renderTemplate(templateId, language, vars);
  } catch (error) {
    if (error instanceof TemplateRenderError) {
      throw error;
    }
    throw error;
  }

  const voiceId = requestVoiceId || (await getPatientVoiceId(patientId));
  const audioStream = await getSynthesizedAudio(voiceId, text, language);
  pipeAudioStream(audioStream, res, next);
}

async function synthesizeVoiceController(req, res, next) {
  const { patientId, voiceId, text, language = "en" } = req.validatedBody;

  const audioStream = patientId
    ? await getSynthesizedAudioForPatient(patientId, text, language)
    : await getSynthesizedAudio(voiceId, text, language);

  pipeAudioStream(audioStream, res, next);
}

module.exports = {
  cloneVoiceController,
  streamTemplateAudioController,
  streamTextAudioController,
  synthesizeVoiceController,
};
