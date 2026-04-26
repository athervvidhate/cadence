import { Audio } from "expo-av";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ExtractTextFromImageFn = (uri: string) => Promise<string[]>;

type TextExtractorModule = {
  extractTextFromImage: ExtractTextFromImageFn;
  isSupported: boolean;
};

type ZeticNativeModule = {
  anonymize: (
    text: string,
    options?: {
      personalKey?: string;
      modelId?: string;
      modelVersion?: number;
    }
  ) => Promise<string>;
};

let extractTextFromImage: ExtractTextFromImageFn | null = null;
let isOcrSupported = false;
let ocrModuleInitError = "";
const nativeZeticModule = NativeModules.ZeticAnonymizerModule as
  | ZeticNativeModule
  | undefined;

function normalizeOptionalUrl(rawValue: string | undefined): string | undefined {
  const value = rawValue?.trim();
  if (!value) return undefined;
  if (value.includes("your-backend.example.com")) return undefined;
  return value;
}

try {
  // Use dynamic require so the app can still render a friendly message when
  // running in Expo Go without a development build.
  const module = require("expo-text-extractor") as TextExtractorModule;
  extractTextFromImage = module.extractTextFromImage;
  isOcrSupported = module.isSupported;
} catch (error) {
  ocrModuleInitError = error instanceof Error ? error.message : String(error);
}

const ZETIC_ANONYMIZE_URL = normalizeOptionalUrl(
  process.env.EXPO_PUBLIC_ZETIC_ANONYMIZE_URL
);
const ZETIC_PERSONAL_KEY = process.env.EXPO_PUBLIC_ZETIC_PERSONAL_KEY;
const ZETIC_MODEL_ID =
  process.env.EXPO_PUBLIC_ZETIC_MODEL_ID || "Steve/text-anonymizer-v1";
const ZETIC_MODEL_VERSION = Number(
  process.env.EXPO_PUBLIC_ZETIC_MODEL_VERSION || "1"
);
const LLM_PIPELINE_URL = normalizeOptionalUrl(
  process.env.EXPO_PUBLIC_LLM_PIPELINE_URL
);
const ELEVENLABS_TTS_URL = normalizeOptionalUrl(
  process.env.EXPO_PUBLIC_ELEVENLABS_TTS_URL
);

type LoadingStage = "ocr" | "anonymize" | "llm" | "tts" | null;

function stageLabel(stage: LoadingStage): string {
  if (stage === "ocr") return "Running on-device OCR";
  if (stage === "anonymize") return "Running Zetic anonymizer";
  if (stage === "llm") return "Calling LLM pipeline";
  if (stage === "tts") return "Generating TTS audio";
  return "";
}

function shortenError(message: string, limit = 320): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit - 3)}...`;
}

function mockAnonymizeText(input: string): string {
  let output = input;
  output = output.replace(
    /(Patient:\s*)([A-Za-z ,.'-]+)/gi,
    "$1[REDACTED_NAME]"
  );
  output = output.replace(/(MRN:\s*)([A-Za-z0-9-]+)/gi, "$1[REDACTED_MRN]");
  output = output.replace(
    /(Historia:\s*)([A-Za-z0-9-]+)/gi,
    "$1[REDACTED_HISTORIA]"
  );
  output = output.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[REDACTED_DATE]");
  output = output.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, "[REDACTED_DATE]");
  output = output.replace(/\b\S+@\S+\.\S+\b/g, "[REDACTED_EMAIL]");
  output = output.replace(/\b(?:\+?\d[\d -]{7,}\d)\b/g, "[REDACTED_PHONE]");
  return output;
}

function mockLlmResponse(anonymizedText: string): string {
  const medicationLines = anonymizedText
    .split("\n")
    .filter((line) => /\b(mg|mcg|meq|tablet|capsule|po|bid|daily)\b/i.test(line))
    .slice(0, 8);

  if (!medicationLines.length) {
    return "No clear medication lines were detected. Please retake a sharper photo and retry OCR.";
  }

  return [
    "Medication summary from anonymized OCR:",
    ...medicationLines.map((line, index) => `${index + 1}. ${line.trim()}`),
    "",
    "Suggested next step: confirm this list with your clinician before acting on it.",
  ].join("\n");
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Endpoint returned non-JSON response (${response.status}): ${text.slice(0, 220)}`
    );
  }
}

async function writeAudioBase64ToCache(
  audioBase64: string,
  mimeType = "audio/mpeg"
): Promise<string> {
  const extension = mimeType.includes("wav")
    ? "wav"
    : mimeType.includes("ogg")
      ? "ogg"
      : "mp3";

  const audioFile = new File(Paths.cache, `cadence-tts-${Date.now()}.${extension}`);
  audioFile.create({ overwrite: true, intermediates: true });
  audioFile.write(audioBase64, { encoding: "base64" });
  return audioFile.uri;
}

export default function App() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [anonymizedText, setAnonymizedText] = useState("");
  const [llmText, setLlmText] = useState("");
  const [ttsAudioUri, setTtsAudioUri] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const [lastError, setLastError] = useState("");

  const soundRef = useRef<Audio.Sound | null>(null);

  const isBusy = loadingStage !== null;
  const canUseNativeZetic =
    Platform.OS === "ios" &&
    Boolean(nativeZeticModule?.anonymize) &&
    Boolean(ZETIC_PERSONAL_KEY);
  const usingMockAnonymizer = !canUseNativeZetic && !ZETIC_ANONYMIZE_URL;
  const usingBackendAnonymizer = !canUseNativeZetic && !!ZETIC_ANONYMIZE_URL;
  const usingMockLlm = !LLM_PIPELINE_URL;
  const usingMockTts = !ELEVENLABS_TTS_URL;

  const ocrReady = useMemo(
    () => Boolean(extractTextFromImage) && Boolean(isOcrSupported),
    []
  );

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const clearPipelineOutputs = () => {
    setOcrText("");
    setAnonymizedText("");
    setLlmText("");
    setTtsAudioUri(null);
    setLastError("");
  };

  const ensureOcrAvailable = () => {
    if (!extractTextFromImage || !isOcrSupported) {
      throw new Error(
        "On-device OCR is unavailable. Use an Expo development build (not Expo Go) so the Apple Vision OCR module can load."
      );
    }
  };

  const selectImage = async (fromCamera: boolean) => {
    try {
      setLastError("");
      const permissionResult = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          fromCamera
            ? "Camera permission is required to capture medication labels or discharge papers."
            : "Photo library permission is required to choose an image."
        );
        return;
      }

      const pickerResult = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 1,
          });

      if (pickerResult.canceled) return;
      const selectedUri = pickerResult.assets?.[0]?.uri;
      if (!selectedUri) return;

      setImageUri(selectedUri);
      clearPipelineOutputs();
    } catch (error) {
      const message = shortenError(
        error instanceof Error ? error.message : String(error)
      );
      setLastError(message);
      Alert.alert("Image selection failed", message);
    }
  };

  const runOcr = async (): Promise<string> => {
    if (!imageUri) {
      throw new Error("Select or capture an image first.");
    }
    ensureOcrAvailable();

    setLoadingStage("ocr");
    setLastError("");
    try {
      const lines = await extractTextFromImage!(imageUri);
      const extracted = lines.map((line) => line.trim()).filter(Boolean).join("\n");
      if (!extracted) {
        throw new Error("No text was detected. Try a closer, sharper image.");
      }
      setOcrText(extracted);
      return extracted;
    } finally {
      setLoadingStage(null);
    }
  };

  const anonymizeWithZetic = async (inputText: string): Promise<string> => {
    setLoadingStage("anonymize");
    try {
      if (canUseNativeZetic) {
        const nativeResult = await nativeZeticModule!.anonymize(inputText, {
          personalKey: ZETIC_PERSONAL_KEY,
          modelId: ZETIC_MODEL_ID,
          modelVersion: Number.isFinite(ZETIC_MODEL_VERSION)
            ? ZETIC_MODEL_VERSION
            : 1,
        });
        if (!nativeResult.trim()) {
          throw new Error("On-device Zetic anonymizer returned an empty result.");
        }
        setAnonymizedText(nativeResult);
        return nativeResult;
      }

      if (!ZETIC_ANONYMIZE_URL) {
        const mock = mockAnonymizeText(inputText);
        setAnonymizedText(mock);
        return mock;
      }

      const response = await fetch(ZETIC_ANONYMIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          mode: "anonymize_pii",
          source: "apple_vision_ocr",
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Zetic anonymizer returned ${response.status}: ${await response.text()}`
        );
      }

      const payload = await parseJsonResponse(response);
      const candidate =
        payload.anonymizedText ??
        payload.anonymized_text ??
        payload.outputText ??
        payload.output ??
        payload.text;

      if (typeof candidate !== "string" || !candidate.trim()) {
        throw new Error("Zetic response did not include anonymized text.");
      }

      setAnonymizedText(candidate);
      return candidate;
    } finally {
      setLoadingStage(null);
    }
  };

  const callLlmPipeline = async (inputText: string): Promise<string> => {
    setLoadingStage("llm");
    try {
      if (!LLM_PIPELINE_URL) {
        const mock = mockLlmResponse(inputText);
        setLlmText(mock);
        return mock;
      }

      const response = await fetch(LLM_PIPELINE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymizedText: inputText,
          task: "discharge-medication-assistant",
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM endpoint returned ${response.status}: ${await response.text()}`);
      }

      const payload = await parseJsonResponse(response);
      const candidate =
        payload.responseText ?? payload.summary ?? payload.output ?? payload.text;

      if (typeof candidate !== "string" || !candidate.trim()) {
        throw new Error("LLM response did not include text output.");
      }

      setLlmText(candidate);
      return candidate;
    } finally {
      setLoadingStage(null);
    }
  };

  const generateTts = async (inputText: string): Promise<string | null> => {
    setLoadingStage("tts");
    try {
      if (!ELEVENLABS_TTS_URL) {
        return null;
      }

      const response = await fetch(ELEVENLABS_TTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error(`TTS endpoint returned ${response.status}: ${await response.text()}`);
      }

      const payload = await parseJsonResponse(response);
      const audioUrl = payload.audioUrl;
      const audioBase64 = payload.audioBase64;
      const mimeType =
        typeof payload.mimeType === "string" ? payload.mimeType : "audio/mpeg";

      if (typeof audioUrl === "string" && audioUrl.trim()) {
        setTtsAudioUri(audioUrl);
        return audioUrl;
      }

      if (typeof audioBase64 === "string" && audioBase64.trim()) {
        const cachedUri = await writeAudioBase64ToCache(audioBase64, mimeType);
        setTtsAudioUri(cachedUri);
        return cachedUri;
      }

      throw new Error(
        "TTS response must include either { audioUrl } or { audioBase64, mimeType }."
      );
    } finally {
      setLoadingStage(null);
    }
  };

  const playTtsAudio = async () => {
    if (!ttsAudioUri) {
      Alert.alert("No audio", "Run TTS first so there is audio to play.");
      return;
    }

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync({ uri: ttsAudioUri });
      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      const message = shortenError(
        error instanceof Error ? error.message : String(error)
      );
      setLastError(message);
      Alert.alert("Playback failed", message);
    }
  };

  const runFullPipeline = async () => {
    try {
      if (!imageUri) {
        throw new Error("Select or capture an image before running the pipeline.");
      }
      setLastError("");

      const extracted = ocrText || (await runOcr());
      const anonymized = await anonymizeWithZetic(extracted);
      const llmOutput = await callLlmPipeline(anonymized);
      await generateTts(llmOutput);
    } catch (error) {
      const message = shortenError(
        error instanceof Error ? error.message : String(error)
      );
      setLastError(message);
      Alert.alert("Pipeline failed", message);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Cadence OCR + Zetic PII Demo</Text>
        <Text style={styles.subtitle}>
          iOS Vision OCR (on-device) {"->"} Zetic anonymize {"->"} LLM {"->"} ElevenLabs TTS
        </Text>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Endpoint mode</Text>
          <Text style={styles.bannerText}>
            Zetic:{" "}
            {canUseNativeZetic
              ? "on-device iOS model"
              : usingBackendAnonymizer
                ? "backend endpoint"
                : "mock (set EXPO_PUBLIC_ZETIC_PERSONAL_KEY or EXPO_PUBLIC_ZETIC_ANONYMIZE_URL)"}
          </Text>
          <Text style={styles.bannerText}>
            LLM: {usingMockLlm ? "mock (set EXPO_PUBLIC_LLM_PIPELINE_URL)" : "live"}
          </Text>
          <Text style={styles.bannerText}>
            TTS: {usingMockTts ? "disabled (set EXPO_PUBLIC_ELEVENLABS_TTS_URL)" : "live"}
          </Text>
        </View>

        {!ocrReady && (
          <View style={[styles.banner, styles.warningBanner]}>
            <Text style={styles.warningTitle}>OCR module not active</Text>
            <Text style={styles.warningText}>
              Build and run as an Expo development build on iOS to use Apple Vision OCR.
            </Text>
            {ocrModuleInitError ? (
              <Text style={styles.warningTextSmall}>{shortenError(ocrModuleInitError, 180)}</Text>
            ) : null}
          </View>
        )}
        {Platform.OS === "ios" &&
          !canUseNativeZetic &&
          ZETIC_PERSONAL_KEY &&
          !ZETIC_ANONYMIZE_URL && (
            <View style={[styles.banner, styles.warningBanner]}>
              <Text style={styles.warningTitle}>Zetic native module not active</Text>
              <Text style={styles.warningText}>
                Personal key is set, but the iOS native anonymizer module is not available in this
                build yet. Rebuild the iOS dev client after `pod install`.
              </Text>
            </View>
          )}

        <View style={styles.actionsRow}>
          <ActionButton
            label="Pick Image"
            onPress={() => selectImage(false)}
            disabled={isBusy}
          />
          <ActionButton
            label="Take Photo"
            onPress={() => selectImage(true)}
            disabled={isBusy}
          />
        </View>

        <View style={styles.actionsRow}>
          <ActionButton
            label="Run OCR"
            onPress={() => {
              runOcr().catch((error: unknown) => {
                const message = shortenError(
                  error instanceof Error ? error.message : String(error)
                );
                setLastError(message);
                Alert.alert("OCR failed", message);
              });
            }}
            disabled={isBusy || !imageUri}
          />
          <ActionButton
            label="Run Full Pipeline"
            onPress={runFullPipeline}
            disabled={isBusy || !imageUri}
          />
        </View>

        <View style={styles.actionsRow}>
          <ActionButton
            label="Play TTS"
            onPress={playTtsAudio}
            disabled={isBusy || !ttsAudioUri}
          />
        </View>

        {loadingStage ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>{stageLabel(loadingStage)}...</Text>
          </View>
        ) : null}

        {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected image</Text>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.placeholderText}>
              Select a discharge paper or medication label image to begin.
            </Text>
          )}
        </View>

        <OutputBlock title="1) OCR text" value={ocrText} />
        <OutputBlock title="2) Zetic anonymized text" value={anonymizedText} />
        <OutputBlock title="3) LLM output text" value={llmText} />
        <OutputBlock title="4) TTS audio URI" value={ttsAudioUri || ""} />
      </ScrollView>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function OutputBlock({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <TextInput
        multiline
        editable={false}
        value={value}
        style={styles.outputInput}
        placeholder="No output yet."
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 36,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    color: "#334155",
    lineHeight: 20,
  },
  banner: {
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  bannerTitle: {
    fontWeight: "700",
    color: "#0f172a",
  },
  bannerText: {
    color: "#0f172a",
    fontSize: 13,
  },
  warningBanner: {
    backgroundColor: "#ffedd5",
    borderWidth: 1,
    borderColor: "#fdba74",
  },
  warningTitle: {
    color: "#9a3412",
    fontWeight: "700",
  },
  warningText: {
    color: "#7c2d12",
  },
  warningTextSmall: {
    color: "#9a3412",
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  actionButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    textAlign: "center",
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  loadingText: {
    color: "#334155",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  card: {
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 10,
  },
  cardTitle: {
    fontWeight: "700",
    color: "#0f172a",
  },
  previewImage: {
    width: "100%",
    height: 280,
    borderRadius: 8,
    resizeMode: "contain",
    backgroundColor: "#f1f5f9",
  },
  placeholderText: {
    color: "#64748b",
  },
  outputInput: {
    minHeight: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#0f172a",
    textAlignVertical: "top",
  },
});
