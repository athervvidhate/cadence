const mongoose = require("mongoose");

const checkInSchema = new mongoose.Schema(
  {
    time: String,
    type: { type: String, enum: ["morning", "evening"] },
    tasks: [String],
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayNumber: Number,
    date: Date,
    checkIns: [checkInSchema],
    appointments: { type: [String], default: [] },
  },
  { _id: false }
);

const carePlanSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", index: true, required: true },
  regimenId: { type: mongoose.Schema.Types.ObjectId, ref: "Regimen", required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: [daySchema], default: [] },
});

carePlanSchema.index({ patientId: 1, startDate: 1 });

module.exports = mongoose.model("CarePlan", carePlanSchema);
