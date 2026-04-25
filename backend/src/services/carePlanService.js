const CarePlan = require("../models/CarePlan");
const Regimen = require("../models/Regimen");
const { generateCarePlanDays } = require("./carePlanGenerator");
const { buildPlan } = require("./agentClient");

async function generateCarePlan({ patientId, regimenId, startDate }) {
  const regimen = await Regimen.findById(regimenId);
  if (!regimen) {
    const error = new Error("Regimen not found");
    error.statusCode = 404;
    throw error;
  }

  await buildPlan({
    type: "build_plan",
    patientId,
    regimenId,
    startDate,
  });

  const start = new Date(startDate);
  const days = generateCarePlanDays({ startDate: start, medications: regimen.medications });
  const endDate = days[days.length - 1].date;

  const carePlan = await CarePlan.create({
    patientId,
    regimenId,
    startDate: start,
    endDate,
    days,
  });

  return {
    carePlanId: carePlan._id.toString(),
    summary: { totalDays: 30, dailyCheckIns: 2, scheduledFollowUps: 3 },
  };
}

module.exports = { generateCarePlan };
