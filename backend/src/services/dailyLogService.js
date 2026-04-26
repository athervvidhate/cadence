const DailyLog = require("../models/DailyLog");
const Patient = require("../models/Patient");
const { handleEscalation } = require("./escalationService");

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function createDailyLog(payload) {
  const patient = await Patient.findById(payload.patientId);
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  const previousLog = await DailyLog.findOne({ patientId: payload.patientId }).sort({ date: -1 });
  const weightDeltaFromYesterday = previousLog ? payload.weightLbs - previousLog.weightLbs : 0;
  const weightDeltaFromBaseline = payload.weightLbs - patient.baselineWeightLbs;

  const dailyLog = await DailyLog.create({
    ...payload,
    date: startOfUtcDay(),
    weightDeltaFromYesterday,
    weightDeltaFromBaseline,
  });

  const escalation = await handleEscalation({ patientId: payload.patientId, dailyLog });
  dailyLog.flagLevel = escalation.flagLevel;
  dailyLog.flagReasons = escalation.flagReasons;
  await dailyLog.save();

  return {
    dailyLogId: dailyLog._id.toString(),
    flagLevel: escalation.flagLevel,
    flagReasons: escalation.flagReasons,
    alertsCreated: escalation.alertsCreated,
  };
}

module.exports = { createDailyLog };
