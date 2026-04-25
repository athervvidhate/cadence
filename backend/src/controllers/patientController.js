const { createPatient, saveVoiceId } = require("../services/patientService");

async function createPatientController(req, res) {
  const result = await createPatient(req.validatedBody);
  res.status(201).json(result);
}

async function uploadVoiceController(req, res) {
  const patientId = req.params.id;
  const voiceId = `elevenlabs_voice_${Date.now()}`;
  await saveVoiceId(patientId, voiceId);
  res.status(200).json({
    voiceId,
    previewUrl: `https://demo.local/voice-previews/${voiceId}.mp3`,
  });
}

module.exports = { createPatientController, uploadVoiceController };
