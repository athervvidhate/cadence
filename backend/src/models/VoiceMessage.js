const mongoose = require("mongoose");

const voiceMessageSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    index: true,
    required: true,
  },
  audioBuffer: { type: Buffer, required: true },
  mimeType: { type: String, default: "audio/m4a" },
  sentAt: { type: Date, default: Date.now },
  notificationStatus: {
    type: String,
    enum: ["sent", "mocked", "failed"],
    default: "mocked",
  },
});

voiceMessageSchema.index({ patientId: 1, sentAt: -1 });

module.exports = mongoose.model("VoiceMessage", voiceMessageSchema);
