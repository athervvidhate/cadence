import "dotenv/config";
import { Blob, File } from "buffer";
import { Readable } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web";
import { ElevenLabsClient } from "elevenlabs";
import { computeCacheKey, getCachedAudio, storeCachedAudio } from "./audioCache";

const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
const AUDIO_MIME_TYPE = "audio/mpeg";

type SupportedLanguage = "en" | "es";

type ElevenLabsVoiceResponse = {
  voice_id?: string;
  voiceId?: string;
};

type ElevenLabsSdk = {
  voices: {
    add(params: {
      name: string;
      files: File[];
      description?: string;
    }): Promise<ElevenLabsVoiceResponse>;
  };
  textToSpeech: {
    convert(
      voiceId: string,
      params: {
        text: string;
        modelId: string;
        outputFormat: string;
        voiceSettings: {
          stability: number;
          similarityBoost: number;
        };
        languageCode: SupportedLanguage;
      },
    ): Promise<unknown>;
  };
};

export class VoiceCloneError extends Error {
  public readonly statusCode?: number;
  public readonly cause?: unknown;

  constructor(message: string, options: { statusCode?: number; cause?: unknown } = {}) {
    super(message);
    this.name = "VoiceCloneError";
    this.statusCode = options.statusCode;
    this.cause = options.cause;
  }
}

const elevenLabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
}) as unknown as ElevenLabsSdk;

function toNodeReadableStream(value: unknown): NodeJS.ReadableStream {
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
    return toNodeReadableStream((value as { body: unknown }).body);
  }

  throw new Error("ElevenLabs did not return a readable audio stream.");
}

function isNodeReadableStream(value: unknown): value is NodeJS.ReadableStream {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as NodeJS.ReadableStream).pipe === "function" &&
    typeof (value as NodeJS.ReadableStream).on === "function"
  );
}

function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const maybeError = error as {
    statusCode?: number;
    status?: number;
    response?: { status?: number };
  };

  return maybeError.statusCode ?? maybeError.status ?? maybeError.response?.status;
}

/**
 * Creates an ElevenLabs voice clone from a caregiver audio sample.
 *
 * @param audioBuffer - Raw audio sample bytes to upload as multipart form data.
 * @param caregiverName - Human-readable name for the cloned caregiver voice.
 * @returns The ElevenLabs voice ID for the newly cloned voice.
 * @throws VoiceCloneError when ElevenLabs rejects or fails the clone request.
 */
export async function cloneVoice(audioBuffer: Buffer, caregiverName: string): Promise<string> {
  try {
    const sample = new File([Uint8Array.from(audioBuffer)], `${caregiverName}-sample.mp3`, {
      type: AUDIO_MIME_TYPE,
    });

    const response = await elevenLabs.voices.add({
      name: caregiverName,
      files: [sample],
      description: `Caregiver voice clone for ${caregiverName}`,
    });

    const voiceId = response.voice_id ?? response.voiceId;
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

/**
 * Synthesizes text to speech with an existing ElevenLabs voice.
 *
 * @param voiceId - ElevenLabs voice ID to use for synthesis.
 * @param text - Dialogue text to synthesize.
 * @param language - Language code for the utterance.
 * @returns A readable MP3 audio stream.
 */
export async function synthesize(
  voiceId: string,
  text: string,
  language: SupportedLanguage,
): Promise<NodeJS.ReadableStream> {
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
}

/**
 * Returns synthesized audio from GridFS cache when available, otherwise stores a fresh ElevenLabs result.
 *
 * @param voiceId - ElevenLabs voice ID to use for synthesis.
 * @param text - Dialogue text to synthesize.
 * @param language - Language code for the utterance.
 * @returns A readable MP3 audio stream from GridFS.
 */
export async function getSynthesizedAudio(
  voiceId: string,
  text: string,
  language: SupportedLanguage,
): Promise<NodeJS.ReadableStream> {
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
