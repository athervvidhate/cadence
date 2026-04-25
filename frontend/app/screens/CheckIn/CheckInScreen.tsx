// Patient-facing voice check-in screen — plays cloned voice, collects responses, posts daily log
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { synthesizeVoice, createDailyLog } from "../../api/client";
import { usePatientStore } from "../../store/patient";
import { useCaptureStore } from "../../store/capture";
import type { SymptomsPayload } from "../../store/checkin";

type Props = StackScreenProps<RootStackParamList, "CheckIn">;
type CheckPhase =
  | "idle"
  | "synthesizing"
  | "playing"
  | "listening"
  | "submitting"
  | "result"
  | "error";
type FlagLevel = "green" | "yellow" | "red" | "urgent";

// ─── Voice templates + demo responses ────────────────────────────────────────

const VOICE_TEMPLATES = [
  "Good morning {{name}}. Today is day {{day}}. Have you weighed yourself yet this morning?",
  "Got it, thank you. How is your breathing — any tightness or shortness of breath?",
  "And any swelling in your ankles or feet today?",
  "Have you taken your morning medications?",
  "You're doing great. I'll check in again tonight. Love you.",
];

const DEMO_RESPONSES = [
  "187",
  "a little short of breath walking to the kitchen",
  "mild swelling",
  "yes",
  "okay",
];

function interpolate(template: string, name: string, day: number): string {
  return template.replace("{{name}}", name).replace("{{day}}", String(day));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function flagColor(flag: FlagLevel): string {
  switch (flag) {
    case "urgent":
    case "red":
      return "#ef4444";
    case "yellow":
      return "#f59e0b";
    case "green":
      return "#22c55e";
  }
}

function buildDemoSymptoms(responses: string[]): SymptomsPayload {
  const breathStr = responses[1] ?? "";
  const swellStr = responses[2] ?? "";
  return {
    shortnessOfBreath: breathStr.includes("short of breath") ? "exertion" : "none",
    swelling: swellStr.includes("mild") || swellStr.includes("swelling") ? "mild" : "none",
    chestPain: "none",
    fatigue: "none",
    rawTranscript: responses.join(" | "),
  };
}

function buildDefaultSymptoms(transcript: string): SymptomsPayload {
  return {
    shortnessOfBreath: "none",
    swelling: "none",
    chestPain: "none",
    fatigue: "none",
    rawTranscript: transcript,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckInScreen(_props: Props) {
  const patientId = usePatientStore((s) => s.patientId);
  const preferredName = usePatientStore((s) => s.preferredName);
  const language = usePatientStore((s) => s.language);
  const baselineWeightLbs = usePatientStore((s) => s.baselineWeightLbs);
  const currentDay = usePatientStore((s) => s.currentDay);
  const demoMode = usePatientStore((s) => s.demoMode);

  const extractionResult = useCaptureStore((s) => s.extractionResult);

  const [checkPhase, setCheckPhase] = useState<CheckPhase>("idle");
  const [currentTurn, setCurrentTurn] = useState(0);
  const [currentFlag, setCurrentFlag] = useState<FlagLevel>("green");
  const [checkError, setCheckError] = useState<string | null>(null);

  // Pulse animation for the status circle
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Audio
  const soundRef = useRef<Audio.Sound | null>(null);
  // Cache: prompt text → audioUrl (avoids re-fetching the same clip)
  const audioCacheRef = useRef(new Map<string, string>());

  // Real-mode listening: resolver is called when user taps "Done speaking"
  const responseResolverRef = useRef<((r: string) => void) | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      pulseLoopRef.current?.stop();
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // ── Pulse circle while active ─────────────────────────────────────────────

  useEffect(() => {
    const active =
      checkPhase !== "idle" &&
      checkPhase !== "result" &&
      checkPhase !== "error";

    if (active) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.07,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [checkPhase, scaleAnim]);

  // ── Audio helpers ─────────────────────────────────────────────────────────

  async function getSynthesizedUrl(text: string): Promise<string> {
    const cached = audioCacheRef.current.get(text);
    if (cached !== undefined) return cached;
    const res = await synthesizeVoice({
      patientId: patientId ?? "",
      text,
      language,
    });
    audioCacheRef.current.set(text, res.audioUrl);
    return res.audioUrl;
  }

  async function playAudio(url: string): Promise<void> {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    if (!url) {
      // Stub mode: simulate speaking time so transitions feel natural
      await delay(900);
      return;
    }

    return new Promise<void>((resolve) => {
      Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) resolve();
        }
      )
        .then(({ sound }) => {
          soundRef.current = sound;
        })
        .catch(() => resolve()); // don't block on audio errors
    });
  }

  // ── Check-in flow ─────────────────────────────────────────────────────────

  async function startCheckIn() {
    if (!isMountedRef.current) return;

    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

    const allResponses: string[] = [];

    for (let turn = 0; turn < VOICE_TEMPLATES.length; turn++) {
      if (!isMountedRef.current) return;

      setCurrentTurn(turn);

      // Synthesize
      setCheckPhase("synthesizing");
      const text = interpolate(
        VOICE_TEMPLATES[turn] ?? "",
        preferredName || "there",
        currentDay
      );
      let audioUrl = "";
      try {
        audioUrl = await getSynthesizedUrl(text);
      } catch {
        // Continue without audio — never let a network error block the patient
      }

      // Play
      if (!isMountedRef.current) return;
      setCheckPhase("playing");
      await playAudio(audioUrl);

      // Listen
      if (!isMountedRef.current) return;
      setCheckPhase("listening");

      let response = "";
      if (demoMode) {
        await delay(1500);
        response = DEMO_RESPONSES[turn] ?? "";
      } else {
        // Wait for caregiver to tap "Done speaking"
        response = await new Promise<string>((resolve) => {
          responseResolverRef.current = resolve;
        });
      }

      allResponses.push(response);
    }

    if (!isMountedRef.current) return;
    await submitLog(allResponses);
  }

  function handleDoneSpeaking() {
    if (responseResolverRef.current) {
      responseResolverRef.current("");
      responseResolverRef.current = null;
    }
  }

  async function submitLog(responses: string[]) {
    if (!isMountedRef.current) return;
    setCheckPhase("submitting");

    try {
      const weightLbs = demoMode
        ? parseFloat(responses[0] ?? "") || baselineWeightLbs
        : baselineWeightLbs;

      const symptoms = demoMode
        ? buildDemoSymptoms(responses)
        : buildDefaultSymptoms(responses.join(" | "));

      const medsTaken =
        extractionResult?.medications.map((m) => ({
          medicationName: m.name,
          taken: true,
        })) ?? [];

      const res = await createDailyLog({
        patientId: patientId ?? "",
        dayNumber: currentDay,
        weightLbs,
        medsTaken,
        symptoms,
      });

      if (!isMountedRef.current) return;
      setCurrentFlag(res.flagLevel);
      setCheckPhase("result");

      // Show flag result for 3 seconds, then return to idle
      await delay(3000);
      if (!isMountedRef.current) return;
      setCheckPhase("idle");
      setCurrentTurn(0);
    } catch {
      if (!isMountedRef.current) return;
      setCheckPhase("error");
      setCheckError("Something went wrong — tap to try again.");
    }
  }

  function handleTap() {
    if (checkPhase === "idle") void startCheckIn();
    if (checkPhase === "error") {
      setCheckPhase("idle");
      setCheckError(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const circleColor = flagColor(currentFlag);
  const isActive =
    checkPhase !== "idle" &&
    checkPhase !== "result" &&
    checkPhase !== "error";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <TouchableOpacity
        style={styles.touchTarget}
        onPress={handleTap}
        activeOpacity={isActive ? 1 : 0.97}
      >
        {/* Greeting */}
        <View style={styles.topSection}>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.patientName}>
            {preferredName || "there"}
          </Text>
          <Text style={styles.dayLabel}>Day {currentDay}</Text>
        </View>

        {/* Status circle */}
        <View style={styles.centerSection}>
          {/* Outer pulse ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                backgroundColor: circleColor,
                transform: [{ scale: scaleAnim }],
                opacity: isActive ? 0.25 : 0,
              },
            ]}
            pointerEvents="none"
          />
          {/* Main circle */}
          <View style={[styles.circle, { backgroundColor: circleColor }]}>
            {checkPhase === "submitting" && (
              <ActivityIndicator color="#fff" size="large" />
            )}
          </View>
        </View>

        {/* Bottom phase content */}
        <View style={styles.bottomSection}>
          {checkPhase === "idle" && (
            <Text style={styles.tapPrompt}>Tap anywhere to begin check-in</Text>
          )}

          {(checkPhase === "synthesizing") && (
            <Text style={styles.statusText}>Preparing…</Text>
          )}

          {checkPhase === "playing" && (
            <Text style={styles.statusText}>
              Speaking — turn {currentTurn + 1} of {VOICE_TEMPLATES.length}
            </Text>
          )}

          {checkPhase === "listening" && (
            <>
              <Text style={styles.listeningText}>Listening…</Text>
              {!demoMode && (
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={handleDoneSpeaking}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>Done speaking</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {checkPhase === "result" && (
            <Text style={styles.statusText}>Check-in complete.</Text>
          )}

          {checkPhase === "error" && checkError !== null && (
            <Text style={styles.errorText}>{checkError}</Text>
          )}
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 180;

const C = {
  bg: "#0a0a12",
  text: "#f5f5f7",
  textDim: "#6b7280",
  accent: "#1a73e8",
  error: "#ff6b6b",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  touchTarget: { flex: 1 },

  topSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  greeting: { fontSize: 20, color: C.textDim, fontWeight: "400" },
  patientName: {
    fontSize: 40,
    color: C.text,
    fontWeight: "700",
    marginTop: 4,
  },
  dayLabel: { fontSize: 18, color: C.textDim, marginTop: 8 },

  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    height: CIRCLE_SIZE + 60,
  },
  pulseRing: {
    position: "absolute",
    width: CIRCLE_SIZE + 60,
    height: CIRCLE_SIZE + 60,
    borderRadius: (CIRCLE_SIZE + 60) / 2,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 24,
    paddingHorizontal: 32,
    gap: 16,
  },
  tapPrompt: { fontSize: 16, color: C.textDim, textAlign: "center" },
  statusText: { fontSize: 17, color: C.textDim, textAlign: "center" },
  listeningText: {
    fontSize: 22,
    color: C.text,
    fontWeight: "500",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: C.error,
    textAlign: "center",
    lineHeight: 24,
  },

  doneBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
