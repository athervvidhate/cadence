const Patient = require("../models/Patient");

async function createPatient(payload) {
  const patient = await Patient.create(payload);
  return { patientId: patient._id.toString(), createdAt: patient.createdAt.toISOString() };
}

async function saveVoiceId(patientId, voiceId) {
  const patient = await Patient.findByIdAndUpdate(
    patientId,
    { $set: { "caregiver.voiceId": voiceId } },
    { new: true }
  );
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }
  return patient;
}

module.exports = { createPatient, saveVoiceId };
