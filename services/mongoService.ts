import "dotenv/config";
import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Connects Mongoose to MongoDB using the MONGODB_URI environment variable.
 *
 * Call this once during app startup before using services that depend on MongoDB,
 * including the GridFS-backed voice audio cache.
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to connect to MongoDB.");
  }

  connectionPromise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10_000,
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

/**
 * Disconnects Mongoose from MongoDB.
 *
 * Useful for tests, local scripts, and graceful shutdown handlers.
 */
export async function disconnectMongoDB(): Promise<void> {
  connectionPromise = null;
  await mongoose.disconnect();
}
