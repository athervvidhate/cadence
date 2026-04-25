import { createHash } from "crypto";
import type { GridFSBucketReadStream } from "mongodb";
import mongoose from "mongoose";

/*
 * We hash the rendered text because that is the actual audio input.
 * Templates can produce different patient-specific phrases after variables fill in.
 * Different rendered strings need different cached MP3 files.
 * Identical rendered strings should share the same cached audio clip.
 * Including voice and language keeps clips from colliding across speakers/locales.
 */

const GRIDFS_BUCKET_NAME = "audioCache";
const AUDIO_MIME_TYPE = "audio/mpeg";

type AudioCacheMetadata = {
  voiceId: string;
  language: string;
};

type GridFsFile = {
  _id: mongoose.mongo.ObjectId;
  metadata?: {
    hash?: string;
  };
};

let gridFsBucket: mongoose.mongo.GridFSBucket | null = null;

function getDatabase(): NonNullable<typeof mongoose.connection.db> {
  if (!mongoose.connection.db) {
    throw new Error("Mongoose must be connected before using the audio cache.");
  }

  return mongoose.connection.db;
}

function getGridFsBucket(): mongoose.mongo.GridFSBucket {
  if (gridFsBucket) {
    return gridFsBucket;
  }

  gridFsBucket = new mongoose.mongo.GridFSBucket(getDatabase(), {
    bucketName: GRIDFS_BUCKET_NAME,
  });

  return gridFsBucket;
}

function getFilesCollection() {
  return getDatabase().collection<GridFsFile>(`${GRIDFS_BUCKET_NAME}.files`);
}

/**
 * Returns a cached audio download stream for the given cache hash, or null on cache miss.
 */
export async function getCachedAudio(hash: string): Promise<GridFSBucketReadStream | null> {
  const file = await getFilesCollection().findOne({ "metadata.hash": hash });

  if (!file) {
    return null;
  }

  return getGridFsBucket().openDownloadStream(file._id);
}

/**
 * Stores an audio stream in GridFS using the cache hash as the filename.
 */
export async function storeCachedAudio(
  hash: string,
  stream: NodeJS.ReadableStream,
  metadata: AudioCacheMetadata,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const uploadStream = getGridFsBucket().openUploadStream(hash, {
      contentType: AUDIO_MIME_TYPE,
      metadata: {
        hash,
        voiceId: metadata.voiceId,
        language: metadata.language,
        createdAt: new Date(),
      },
    });

    let settled = false;
    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    stream.once("error", finish);
    uploadStream.once("error", finish);
    uploadStream.once("finish", () => finish());
    stream.pipe(uploadStream);
  });
}

/**
 * Computes the deterministic SHA-256 cache key for a synthesized audio request.
 */
export function computeCacheKey(voiceId: string, text: string, language: string): string {
  return createHash("sha256").update(`${voiceId}|${text}|${language}`).digest("hex");
}
