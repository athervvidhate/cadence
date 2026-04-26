const { createDailyLog } = require("../services/dailyLogService");

async function createDailyLogController(req, res) {
  try {
    console.log("[dailyLog] body:", JSON.stringify(req.validatedBody).slice(0, 200));
    const result = await createDailyLog(req.validatedBody);
    res.status(200).json(result);
  } catch (err) {
    console.error("[dailyLog] ERROR:", err.message);
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

module.exports = { createDailyLogController };
