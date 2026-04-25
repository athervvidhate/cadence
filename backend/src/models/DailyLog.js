const mongoose = require("mongoose");

const medTakenSchema = new mongoose.Schema(
  {
    drugName: String,
    dose: String,
    scheduled: String,
    taken: Boolean,
    actualTime: String,
  },
  { _id: false }
);

const symptomsSchema = new mongoose.Schema(
  {
    shortnessOfBreath: { type: String, enum: ["none", "exertion", "rest"], default: "none" },
    swelling: { type: String, enum: ["none", "mild", "moderate", "severe"], default: "none" },
    chestPain: { type: String, enum: ["none", "mild", "moderate", "severe"], default: "none" },
    fatigue: { type: String, enum: ["none", "mild", "moderate", "severe"], default: "none" },
    rawTranscript: { type: String, default: "" },
  },
  { _id: false }
);

const dailyLogSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", index: true, required: true },
  date: { type: Date, required: true },
  dayNumber: { type: Number, required: true },
  weightLbs: Number,
  weightDeltaFromYesterday: Number,
  weightDeltaFromBaseline: Number,
  medsTaken: { type: [medTakenSchema], default: [] },
  symptoms: { type: symptomsSchema, default: () => ({}) },
  flagLevel: { type: String, enum: ["green", "yellow", "red", "urgent"], default: "green" },
  flagReasons: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

dailyLogSchema.index({ patientId: 1, date: 1 });

module.exports = mongoose.model("DailyLog", dailyLogSchema);
