const Patient = require("../models/Patient");
const DailyLog = require("../models/DailyLog");
const Alert = require("../models/Alert");
const Regimen = require("../models/Regimen");

function calcAdherence(logs) {
  let total = 0;
  let taken = 0;
  for (const log of logs) {
    for (const med of log.medsTaken || []) {
      total += 1;
      if (med.taken) taken += 1;
    }
  }
  return total ? Number((taken / total).toFixed(2)) : 1;
}

async function getDashboard(patientId) {
  const patient = await Patient.findById(patientId).lean();
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }
  const logs = await DailyLog.find({ patientId }).sort({ date: 1 }).lean();
  const recentLogs = logs.slice(-7);
  const alerts = await Alert.find({ patientId }).sort({ createdAt: -1 }).limit(20).lean();
  const regimen = await Regimen.findOne({ patientId }).sort({ extractedAt: -1 }).lean();

  const currentDay = recentLogs.length || 1;
  const today = recentLogs[recentLogs.length - 1] || null;

  return {
    patient,
    currentDay,
    todayStatus: today?.flagLevel || "green",
    weightTrend: recentLogs.map((log) => ({
      date: log.date.toISOString().slice(0, 10),
      weightLbs: log.weightLbs,
    })),
    adherence7d: calcAdherence(recentLogs),
    todaySymptoms: today?.symptoms || null,
    alertHistory: alerts,
    upcomingAppointments: [],
    regimen: regimen
      ? { medications: regimen.medications, interactions: regimen.interactions }
      : { medications: [], interactions: [] },
  };
}

module.exports = { getDashboard };
