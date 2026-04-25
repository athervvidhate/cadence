const mongoose = require("mongoose");

const notificationPrefsSchema = new mongoose.Schema(
  {
    yellow: { type: [String], default: ["sms"] },
    red: { type: [String], default: ["sms", "email"] },
    urgent: { type: [String], default: ["sms", "call"] },
  },
  { _id: false }
);

const caregiverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    voiceId: { type: String, default: null },
    notificationPrefs: { type: notificationPrefsSchema, default: () => ({}) },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    patientName: { type: String, required: true },
    preferredName: { type: String, required: true },
    ageYears: { type: Number, required: true },
    language: { type: String, enum: ["en", "es"], default: "en" },
    diagnosis: { type: String, default: "CHF" },
    baselineWeightLbs: { type: Number, required: true },
    dischargeDate: { type: Date, default: Date.now },
    caregiver: { type: caregiverSchema, required: true },
    demoMode: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Patient", patientSchema);
