const Alert = require("../models/Alert");
const Patient = require("../models/Patient");
const { evaluateLog } = require("./agentClient");
const { sendSms, sendEmail } = require("./notificationService");

function buildSummary(dayNumber, reasons) {
  return `Day ${dayNumber}: ${reasons.join("; ")}`;
}

function localEvaluateLog(dailyLog) {
  const reasons = [];
  const { weightDeltaFromBaseline, symptoms } = dailyLog;

  if (weightDeltaFromBaseline >= 5) reasons.push("Weight up 5+ lbs from baseline");
  else if (weightDeltaFromBaseline >= 3) reasons.push("Weight up 3+ lbs from baseline");

  if (symptoms?.shortnessOfBreath === "rest") reasons.push("Shortness of breath at rest");
  else if (symptoms?.shortnessOfBreath === "exertion") reasons.push("Shortness of breath on exertion");

  if (symptoms?.swelling === "severe" || symptoms?.swelling === "moderate") reasons.push("Significant swelling");
  if (symptoms?.chestPain === "severe" || symptoms?.chestPain === "moderate") reasons.push("Chest pain reported");
  if (symptoms?.fatigue === "severe") reasons.push("Severe fatigue");

  let flagLevel = "green";
  if (reasons.some(r => r.includes("at rest") || r.includes("Chest pain") || weightDeltaFromBaseline >= 5)) {
    flagLevel = "red";
  } else if (reasons.length > 0) {
    flagLevel = "yellow";
  }

  return { flagLevel, flagReasons: reasons };
}

async function handleEscalation({ patientId, dailyLog }) {
  let flagLevel, flagReasons;

  try {
    const evaluation = await evaluateLog({
      type: "evaluate_log",
      patientId,
      dailyLogId: dailyLog._id.toString(),
      dailyLog,
    });
    flagLevel = evaluation.flagLevel || "green";
    flagReasons = evaluation.flagReasons || [];
  } catch {
    // Shim not running — use local rule-based evaluation
    const local = localEvaluateLog(dailyLog);
    flagLevel = local.flagLevel;
    flagReasons = local.flagReasons;
  }

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
