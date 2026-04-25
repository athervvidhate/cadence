const crypto = require("crypto");
const mongoose = require("mongoose");

const GRIDFS_BUCKET_NAME = "audioCache";
const AUDIO_MIME_TYPE = "audio/mpeg";

let gridFsBucket = null;

function getDatabase() {
  if (!mongoose.connection.db) {
    throw new Error("Mongoose must be connected before using the audio cache.");
  }

  return mongoose.connection.db;
}

function getGridFsBucket() {
  if (gridFsBucket) {
    return gridFsBucket;
  }

  gridFsBucket = new mongoose.mongo.GridFSBucket(getDatabase(), {
    bucketName: GRIDFS_BUCKET_NAME,
  });

  return gridFsBucket;
}

function getFilesCollection() {
  return getDatabase().collection(`${GRIDFS_BUCKET_NAME}.files`);
}

function computeCacheKey(voiceId, text, language) {
  return crypto.createHash("sha256").update(`${voiceId}|${text}|${language}`).digest("hex");
}

async function getCachedAudio(hash) {
  const file = await getFilesCollection().findOne({ "metadata.hash": hash });

  if (!file) {
    return null;
  }

  return getGridFsBucket().openDownloadStream(file._id);
}

function storeCachedAudio(hash, stream, metadata) {
  return new Promise((resolve, reject) => {
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
    const finish = (error) => {
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

module.exports = {
  computeCacheKey,
  getCachedAudio,
  storeCachedAudio,
};
