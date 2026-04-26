const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema(
  {
    type: String,
    to: String,
    specialty: String,
    status: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const alertSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", index: true, required: true },
  dailyLogId: { type: mongoose.Schema.Types.ObjectId, ref: "DailyLog", required: true },
  createdAt: { type: Date, default: Date.now },
  level: { type: String, enum: ["yellow", "red", "urgent"], required: true },
  summary: { type: String, required: true },
  actionsTaken: { type: [actionSchema], default: [] },
  resolvedAt: { type: Date, default: null },
  resolution: {
    type: String,
    enum: ["appointment_booked", "patient_recovered", "false_alarm", "ed_visit", null],
    default: null,
  },
});

alertSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model("Alert", alertSchema);
