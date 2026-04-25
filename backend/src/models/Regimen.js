const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
  {
    drugName: { type: String, required: true },
    rxNormCode: { type: String, required: true },
    dose: { type: String, required: true },
    frequency: { type: String, required: true },
    schedule: { type: [String], default: [] },
    instructions: { type: String, required: true },
    duration: { type: String, required: true },
    indication: { type: String, required: true },
    sourceConfidence: { type: Number, required: true },
  },
  { _id: false }
);

const interactionSchema = new mongoose.Schema(
  {
    drugs: { type: [String], required: true },
    severity: { type: String, enum: ["contraindicated", "major", "moderate"], required: true },
    note: { type: String, required: true },
  },
  { _id: false }
);

const discrepancySchema = new mongoose.Schema(
  {
    field: String,
    paperSays: String,
    bottleSays: String,
    recommendation: String,
  },
  { _id: false }
);

const followUpSchema = new mongoose.Schema(
  {
    type: String,
    daysFromDischarge: Number,
  },
  { _id: false }
);

const regimenSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  extractedAt: { type: Date, default: Date.now },
  extractionPath: { type: String, enum: ["zetic", "gemma_fallback"], required: true },
  extractionConfidence: { type: Number, required: true },
  medications: { type: [medicationSchema], default: [] },
  interactions: { type: [interactionSchema], default: [] },
  discrepancies: { type: [discrepancySchema], default: [] },
  followUps: { type: [followUpSchema], default: [] },
});

module.exports = mongoose.model("Regimen", regimenSchema);
