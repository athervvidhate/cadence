const { generateCarePlan } = require("../services/carePlanService");

async function generateCarePlanController(req, res) {
  const result = await generateCarePlan(req.validatedBody);
  res.status(201).json(result);
}

module.exports = { generateCarePlanController };
