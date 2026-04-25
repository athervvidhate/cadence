const { createPatient, saveVoiceId } = require("../services/patientService");
const Patient = require("../models/Patient");
const { cloneVoice } = require("../services/voiceService");

async function createPatientController(req, res) {
  const result = await createPatient(req.validatedBody);
  res.status(201).json(result);
}

async function uploadVoiceController(req, res) {
  const patientId = req.params.id;
  const audioBuffer = req.file?.buffer;

  if (!audioBuffer) {
    const error = new Error("Multipart file field 'audio' is required.");
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

  const name = patient.preferredName || patient.patientName;
  const previewUrl = `/api/voice/stream?voiceId=${voiceId}&text=${encodeURIComponent(`Hi ${name}, it's me. I'll be checking in with you every day.`)}&language=${patient.language || "en"}`;

  res.status(200).json({ voiceId, previewUrl });
}

module.exports = { createPatientController, uploadVoiceController };
