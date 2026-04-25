const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");
const { startCheckinScheduler } = require("./scheduler/checkinScheduler");

async function bootstrap() {
  await connectDatabase();
  if (env.enableScheduler) {
    startCheckinScheduler();
  }
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start backend", error);
  process.exit(1);
});
