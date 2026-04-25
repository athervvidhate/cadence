const { synthesizeVoice } = require("../services/voiceService");

async function synthesizeVoiceController(req, res) {
  const result = await synthesizeVoice(req.validatedBody);
  res.status(200).json(result);
}

module.exports = { synthesizeVoiceController };
