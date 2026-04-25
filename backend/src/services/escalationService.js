const Alert = require("../models/Alert");
const Patient = require("../models/Patient");
const { evaluateLog } = require("./agentClient");
const { sendSms, sendEmail } = require("./notificationService");

function buildSummary(dayNumber, reasons) {
  return `Day ${dayNumber}: ${reasons.join("; ")}`;
}

async function handleEscalation({ patientId, dailyLog }) {
  const evaluation = await evaluateLog({
    type: "evaluate_log",
    patientId,
    dailyLogId: dailyLog._id.toString(),
    dailyLog,
  });

  const flagLevel = evaluation.flagLevel || "green";
  const flagReasons = evaluation.flagReasons || [];

  if (flagLevel === "green") {
    return { flagLevel, flagReasons, alertsCreated: [] };
  }

  const patient = await Patient.findById(patientId);
  const summary = buildSummary(dailyLog.dayNumber, flagReasons);
  const actionsTaken = [];

  if (patient?.caregiver?.phone) {
    const smsAction = await sendSms(patient.caregiver.phone, summary);
    actionsTaken.push({ ...smsAction, timestamp: new Date() });
  }
  if ((flagLevel === "red" || flagLevel === "urgent") && patient?.caregiver?.email) {
    const emailAction = await sendEmail(patient.caregiver.email, "DischargeCoach Alert", summary);
    actionsTaken.push({ ...emailAction, timestamp: new Date() });
  }
  if (flagLevel === "red" || flagLevel === "urgent") {
    actionsTaken.push({
      type: "appointment_offer",
      specialty: "cardiology",
      status: "offered",
      timestamp: new Date(),
    });
  }

  const alert = await Alert.create({
    patientId,
    dailyLogId: dailyLog._id,
    level: flagLevel,
    summary,
    actionsTaken,
  });

  return {
    flagLevel,
    flagReasons,
    alertsCreated: [{ alertId: alert._id.toString(), level: alert.level, actionsTaken }],
  };
}

module.exports = { handleEscalation };
