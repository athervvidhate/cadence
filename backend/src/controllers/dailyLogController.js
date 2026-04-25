const { createDailyLog } = require("../services/dailyLogService");

async function createDailyLogController(req, res) {
  const result = await createDailyLog(req.validatedBody);
  res.status(200).json(result);
}

module.exports = { createDailyLogController };
