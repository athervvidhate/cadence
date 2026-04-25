const cron = require("node-cron");

let started = false;

function scheduleTask(expression, name) {
  cron.schedule(expression, () => {
    // eslint-disable-next-line no-console
    console.log(`[scheduler] ${name} fired at ${new Date().toISOString()}`);
  });
}

function startCheckinScheduler() {
  if (started) return;
  started = true;
  scheduleTask("0 8 * * *", "morning_checkin");
  scheduleTask("0 20 * * *", "evening_checkin");

  if (process.env.SCHEDULER_FAST_MODE === "true") {
    scheduleTask("*/1 * * * *", "fast_mode_checkin");
  }
}

module.exports = { startCheckinScheduler };
