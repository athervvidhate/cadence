const { Blob, File } = require("buffer");
const { Readable } = require("stream");
const { ReadableStream: WebReadableStream } = require("stream/web");
const { ElevenLabsClient } = require("elevenlabs");
const env = require("../config/env");
const Patient = require("../models/Patient");
const { computeCacheKey, getCachedAudio, storeCachedAudio } = require("./audioCacheService");

const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
const AUDIO_MIME_TYPE = "audio/mpeg";

class VoiceCloneError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "VoiceCloneError";
    this.statusCode = options.statusCode || 502;
    this.cause = options.cause;
  }
}

class VoiceSynthesisError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "VoiceSynthesisError";
    this.statusCode = options.statusCode || 502;
    this.cause = options.cause;
  }
}

const elevenLabs = new ElevenLabsClient({
  apiKey: env.elevenLabsApiKey,
});

function assertElevenLabsConfigured() {
  if (!env.elevenLabsApiKey) {
    const error = new Error("ELEVENLABS_API_KEY is required for voice synthesis.");
    error.statusCode = 500;
    throw error;
  }
}

function getStatusCode(error) {
  return error?.statusCode || error?.status || error?.response?.status;
}

function isNodeReadableStream(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.pipe === "function" &&
    typeof value.on === "function"
  );
}

function toNodeReadableStream(value) {
  if (isNodeReadableStream(value)) {
    return value;
  }

  if (value instanceof WebReadableStream) {
    return Readable.fromWeb(value);
  }

  if (value instanceof Blob) {
    return Readable.fromWeb(value.stream());
  }

  if (value instanceof ArrayBuffer) {
    return Readable.from(Buffer.from(value));
  }

  if (value && typeof value === "object" && "body" in value) {
    return toNodeReadableStream(value.body);
  }

  throw new Error("ElevenLabs did not return a readable audio stream.");
}

async function getPatientVoiceId(patientId) {
  const patient = await Patient.findById(patientId).lean();
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  const voiceId = patient.caregiver?.voiceId;
  if (!voiceId) {
    const error = new Error("Patient does not have a cloned caregiver voice yet.");
    error.statusCode = 400;
    throw error;
  }

  return voiceId;
}

async function cloneVoice(audioBuffer, caregiverName) {
  assertElevenLabsConfigured();

  try {
    const sample = new File([Uint8Array.from(audioBuffer)], `${caregiverName}-sample.mp3`, {
      type: AUDIO_MIME_TYPE,
    });

    const response = await elevenLabs.voices.add({
      name: caregiverName,
      files: [sample],
      description: `Caregiver voice clone for ${caregiverName}`,
    });

    const voiceId = response.voice_id || response.voiceId;
    if (!voiceId) {
      throw new Error("ElevenLabs response did not include a voice ID.");
    }

    return voiceId;
  } catch (error) {
    if (error instanceof VoiceCloneError) {
      throw error;
    }

    throw new VoiceCloneError("Failed to clone caregiver voice with ElevenLabs.", {
      statusCode: getStatusCode(error),
      cause: error,
    });
  }
}

async function synthesize(voiceId, text, language = "en") {
  assertElevenLabsConfigured();

  try {
    const audio = await elevenLabs.textToSpeech.convert(voiceId, {
      text,
      modelId: ELEVENLABS_MODEL_ID,
      outputFormat: "mp3_44100_128",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.8,
      },
      languageCode: language,
    });

    return toNodeReadableStream(audio);
  } catch (error) {
    throw new VoiceSynthesisError("Failed to synthesize audio with ElevenLabs.", {
      statusCode: getStatusCode(error),
      cause: error,
    });
  }
}

async function getSynthesizedAudio(voiceId, text, language = "en") {
  const hash = computeCacheKey(voiceId, text, language);
  const cachedAudio = await getCachedAudio(hash);

  if (cachedAudio) {
    return cachedAudio;
  }

  const audioStream = await synthesize(voiceId, text, language);
  await storeCachedAudio(hash, audioStream, { voiceId, language });

  const storedAudio = await getCachedAudio(hash);
  if (!storedAudio) {
    throw new Error("Audio cache write completed, but cached audio could not be read.");
  }

  return storedAudio;
}

async function getSynthesizedAudioForPatient(patientId, text, language = "en") {
  const voiceId = await getPatientVoiceId(patientId);
  return getSynthesizedAudio(voiceId, text, language);
}

module.exports = {
  VoiceCloneError,
  VoiceSynthesisError,
  cloneVoice,
  getPatientVoiceId,
  getSynthesizedAudio,
  getSynthesizedAudioForPatient,
  synthesize,
};
