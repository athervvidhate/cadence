import "dotenv/config";
import express from "express";
import audioRoutes from "./routes/audio";
import { connectMongoDB } from "./services/mongoService";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

async function startServer(): Promise<void> {
  await connectMongoDB();

  app.use(audioRoutes);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  app.listen(port, () => {
    console.log(`DischargeCoach API listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start DischargeCoach API", error);
  process.exit(1);
});
