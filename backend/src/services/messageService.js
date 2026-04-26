const VoiceMessage = require("../models/VoiceMessage");
const Patient = require("../models/Patient");
const { sendSms } = require("./notificationService");

async function saveVoiceMessage(patientId, audioBuffer, mimeType = "audio/m4a") {
  const patient = await Patient.findById(patientId).lean();
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  const msg = await VoiceMessage.create({ patientId, audioBuffer, mimeType });

  let notificationStatus = "mocked";
  try {
    const patientLabel = patient.preferredName || patient.patientName;
    const result = await sendSms(
      patient.caregiver.phone,
      `${patientLabel} left you a voice message. Open DischargeCoach to listen.`
    );
    notificationStatus = result.status;
  } catch {
    notificationStatus = "failed";
  }

  await VoiceMessage.findByIdAndUpdate(msg._id, { notificationStatus });

  return { messageId: msg._id.toString(), notificationStatus };
}

module.exports = { saveVoiceMessage };
