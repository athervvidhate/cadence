const Patient = require("../models/Patient");

async function synthesizeVoice({ patientId, text }) {
  const patient = await Patient.findById(patientId).lean();
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  const cacheKey = Buffer.from(`${patient.caregiver.voiceId || "demo"}:${text}`).toString("base64url");
  return {
    audioUrl: `https://demo.local/voice/${cacheKey}.mp3`,
    durationMs: Math.max(1200, text.length * 45),
    cached: false,
  };
}

module.exports = { synthesizeVoice };
