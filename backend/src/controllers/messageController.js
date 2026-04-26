const { saveVoiceMessage } = require("../services/messageService");

async function sendVoiceMessageController(req, res) {
  const patientId = req.params.id;
  const audioBuffer = req.file?.buffer;
  const mimeType = req.file?.mimetype || "audio/m4a";

  if (!audioBuffer) {
    const error = new Error("Multipart file field 'audio' is required.");
    error.statusCode = 400;
    throw error;
  }

  const result = await saveVoiceMessage(patientId, audioBuffer, mimeType);
  res.status(201).json(result);
}

module.exports = { sendVoiceMessageController };
