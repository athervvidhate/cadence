// Patient-facing check-in screen. Three phases:
//   incoming  — call-style UI, patient taps "Answer"
//   active    — conversation bubbles, voice plays + listens, progress dots
//   complete  — flag result with stats grid
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { synthesizeVoice, createDailyLog } from "../../api/client";
import { usePatientStore } from "../../store/patient";
import { useCaptureStore } from "../../store/capture";
import type { SymptomsPayload } from "../../store/checkin";
import { FONT } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "CheckIn">;
type PatientPhase = "incoming" | "active" | "complete" | "error";
type TurnPhase = "synthesizing" | "playing" | "listening";
type FlagLevel = "green" | "yellow" | "red" | "urgent";

// ─── Voice templates + demo data ─────────────────────────────────────────────

const TURN_LABELS = ["Weight", "Breathing", "Swelling", "Meds"];

const VOICE_TEMPLATES = [
  "Good morning {{name}}. Today is day {{day}}. Have you weighed yourself yet this morning?",
  "Got it, thank you. How is your breathing — any tightness or shortness of breath?",
  "And any swelling in your ankles or feet today?",
  "Have you taken your morning medications?",
  "You're doing great. I'll check in again tonight. Love you.",
];

const DEMO_RESPONSES = [
  "187",
  "A little, walking to the kitchen…",
  "Mild swelling in my feet",
  "Yes, took them all",
  "Okay, thank you",
];

function interpolate(template: string, name: string, day: number): string {
  return template.replace("{{name}}", name).replace("{{day}}", String(day));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildDemoSymptoms(): SymptomsPayload {
  return {
    shortnessOfBreath: "exertion",
    swelling: "mild",
    chestPain: "none",
    fatigue: "none",
    rawTranscript: DEMO_RESPONSES.join(" | "),
  };
}

function flagColors(flag: FlagLevel) {
  switch (flag) {
    case "urgent":
    case "red":
      return { circle: "#B53C2C", ring: "rgba(181,60,44,0.22)", icon: "#FFC97A" };
    case "yellow":
      return { circle: "#C9A040", ring: "rgba(201,160,64,0.22)", icon: "#FFC97A" };
    case "green":
      return { circle: "#3AA06A", ring: "rgba(58,160,106,0.22)", icon: "rgba(140,220,160,1)" };
  }
}

function completionMessage(flag: FlagLevel, name: string, caregiverName: string): string {
  if (flag === "red" || flag === "urgent") {
    return `Thanks, ${name}. I'm gonna call ${caregiverName} to check on you.`;
  }
  if (flag === "yellow") {
    return `Thanks, ${name}. Your numbers are a little off today. I've let ${caregiverName} know.`;
  }
  return `You're doing great, ${name}. See you tonight!`;
}

// ─── Waveform decoration ──────────────────────────────────────────────────────

const WAVE_BARS = 40;

function Waveform({ activeCount, color }: { activeCount: number; color: string }) {
  return (
    <View style={waveStyles.row}>
      {Array.from({ length: WAVE_BARS }).map((_, i) => {
        const seed = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 0.21) * 0.5 + 0.6;
        const h = Math.max(3, seed * 22);
        return (
          <View
            key={i}
            style={[
              waveStyles.bar,
              {
                height: h,
                backgroundColor: i < activeCount ? color : "rgba(242,238,227,0.2)",
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 3, height: 22 },
  bar: { width: 2.5, borderRadius: 1.5 },
});

// ─── Elapsed timer helper ──────────────────────────────────────────────────────

function useElapsedTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      setElapsed(0);
      ref.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckInScreen(_props: Props) {
  const patientId = usePatientStore((s) => s.patientId);
  const preferredName = usePatientStore((s) => s.preferredName);
  const caregiver = usePatientStore((s) => s.caregiver);
  const language = usePatientStore((s) => s.language);
  const baselineWeightLbs = usePatientStore((s) => s.baselineWeightLbs);
  const currentDay = usePatientStore((s) => s.currentDay);
  const demoMode = usePatientStore((s) => s.demoMode);

  const extractionResult = useCaptureStore((s) => s.extractionResult);

  const [patientPhase, setPatientPhase] = useState<PatientPhase>("incoming");
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("synthesizing");
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [currentPromptText, setCurrentPromptText] = useState("");
  const [liveResponseText, setLiveResponseText] = useState("");
  const [currentFlag, setCurrentFlag] = useState<FlagLevel>("green");
  const [flagReasons, setFlagReasons] = useState<string[]>([]);
  const [demoWeight, setDemoWeight] = useState(baselineWeightLbs);
  const [checkError, setCheckError] = useState<string | null>(null);

  const elapsedTimer = useElapsedTimer(patientPhase === "active");

  // Pulse animation for incoming screen
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const audioCacheRef = useRef(new Map<string, string>());
  const responseResolverRef = useRef<((r: string) => void) | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      pulseLoopRef.current?.stop();
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // Pulse the answer button ring on incoming screen
  useEffect(() => {
    if (patientPhase === "incoming") {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulseAnim.setValue(1);
    }
  }, [patientPhase, pulseAnim]);

  // ── Audio helpers ──────────────────────────────────────────────────────────

  async function getSynthesizedUrl(text: string): Promise<string> {
    const cached = audioCacheRef.current.get(text);
    if (cached !== undefined) return cached;
    const res = await synthesizeVoice({ patientId: patientId ?? "", text, language });
    audioCacheRef.current.set(text, res.audioUrl);
    return res.audioUrl;
  }

  async function playAudio(url: string): Promise<void> {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (!url) { await delay(1200); return; }
    return new Promise<void>((resolve) => {
      Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => { if (status.isLoaded && status.didJustFinish) resolve(); }
      )
        .then(({ sound }) => { soundRef.current = sound; })
        .catch(() => resolve());
    });
  }

  // ── Check-in flow ──────────────────────────────────────────────────────────

  async function startCheckIn() {
    if (!isMountedRef.current) return;
    setPatientPhase("active");
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

    const allResponses: string[] = [];

    for (let turn = 0; turn < VOICE_TEMPLATES.length; turn++) {
      if (!isMountedRef.current) return;

      setCurrentTurnIdx(turn);
      setLiveResponseText("");

      const text = interpolate(
        VOICE_TEMPLATES[turn] ?? "",
        preferredName || "there",
        currentDay
      );
      setCurrentPromptText(text);

      // Synthesize
      setTurnPhase("synthesizing");
      let audioUrl = "";
      try { audioUrl = await getSynthesizedUrl(text); } catch { /* continue */ }

      // Play
      if (!isMountedRef.current) return;
      setTurnPhase("playing");
      await playAudio(audioUrl);

      // Listen
      if (!isMountedRef.current) return;
      setTurnPhase("listening");

      let response = "";
      if (demoMode) {
        await delay(1800);
        response = DEMO_RESPONSES[turn] ?? "";
        if (!isMountedRef.current) return;
        setLiveResponseText(response);
        await delay(800);
      } else {
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
      responseResolverRef.current(liveResponseText || "");
      responseResolverRef.current = null;
    }
  }

  async function submitLog(responses: string[]) {
    if (!isMountedRef.current) return;

    const weightLbs = demoMode
      ? parseFloat(responses[0] ?? "") || baselineWeightLbs + 3
      : baselineWeightLbs;

    const symptoms = demoMode
      ? buildDemoSymptoms()
      : {
          shortnessOfBreath: "none" as const,
          swelling: "none" as const,
          chestPain: "none" as const,
          fatigue: "none" as const,
          rawTranscript: responses.join(" | "),
        };

    const medsTaken =
      extractionResult?.medications.map((m) => ({
        medicationName: m.name,
        taken: true,
      })) ?? [];

    try {
      const res = await createDailyLog({
        patientId: patientId ?? "",
        dayNumber: currentDay,
        weightLbs,
        medsTaken,
        symptoms,
      });
      if (!isMountedRef.current) return;
      setCurrentFlag(res.flagLevel);
      setFlagReasons(res.flagReasons);
      setDemoWeight(weightLbs);
      setPatientPhase("complete");
    } catch {
      if (!isMountedRef.current) return;
      setPatientPhase("error");
      setCheckError("Something went wrong — tap to try again.");
    }
  }

  function handleAnswer() {
    void startCheckIn();
  }

  function handleLater() {
    // Keep incoming state — in a real app this would snooze 30 min
  }

  function handleDone() {
    setPatientPhase("incoming");
    setCurrentTurnIdx(0);
    setCurrentPromptText("");
    setLiveResponseText("");
    setCheckError(null);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const caregiverFirstName = caregiver?.name.split(" ")[0] ?? "your caregiver";
  const caregiverInitial = caregiverFirstName[0]?.toUpperCase() ?? "C";
  const colors = flagColors(currentFlag);

  // Now, localtime for display
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dayStr = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

  // ── Renders ────────────────────────────────────────────────────────────────

  if (patientPhase === "incoming") {
    return (
      <View style={styles.dark}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          {/* Status bar */}
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{timeStr} · {dayStr}</Text>
            <Text style={styles.statusText}>DAY {currentDay} OF 30</Text>
          </View>

          {/* Main call content */}
          <View style={styles.incomingMain}>
            <Text style={styles.incomingEyebrow}>Incoming check-in</Text>
            <Text style={styles.incomingGreeting}>
              {caregiverFirstName} is calling.
            </Text>
            <Text style={styles.incomingSubtitle}>
              Good morning, {preferredName || "there"}.{"\n"}
              Ready for our morning check-in?
            </Text>

            {/* Caller avatar */}
            <View style={styles.callerRow}>
              <View style={styles.avatarOuter}>
                <View style={styles.avatarRing1} />
                <View style={styles.avatarRing2} />
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarInitial}>{caregiverInitial}</Text>
                </View>
              </View>
              <View style={styles.callerInfo}>
                <Text style={styles.callerName}>{caregiverFirstName}</Text>
                <Text style={styles.callerSub}>via Cadence</Text>
              </View>
            </View>
          </View>

          {/* Answer / Later buttons */}
          <View style={styles.incomingButtons}>
            <View style={styles.callButtonCol}>
              <TouchableOpacity
                style={[styles.callCircle, styles.callDecline]}
                onPress={handleLater}
                activeOpacity={0.85}
              >
                <Text style={styles.callDeclineIcon}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.callLabel}>Later</Text>
            </View>

            <View style={styles.callButtonCol}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={styles.callAnswerRing}>
                  <TouchableOpacity
                    style={[styles.callCircle, styles.callAnswer]}
                    onPress={handleAnswer}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.callAnswerIcon}>✔</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
              <Text style={[styles.callLabel, styles.callLabelAnswer]}>Answer</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (patientPhase === "active") {
    const progressTurnIdx = Math.min(currentTurnIdx, TURN_LABELS.length - 1);

    return (
      <View style={styles.dark}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          {/* Status bar */}
          <View style={styles.statusBar}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE · {elapsedTimer}</Text>
            </View>
            <Text style={styles.statusText}>WITH {caregiverFirstName.toUpperCase()}</Text>
          </View>

          {/* Conversation area */}
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.conversationContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Sarah's prompt bubble */}
            {currentPromptText !== "" && (
              <View style={styles.promptBubble}>
                <Text style={styles.bubbleLabel}>
                  {caregiverFirstName.toUpperCase()}
                </Text>
                <Text style={styles.promptText}>{currentPromptText}</Text>
              </View>
            )}

            {/* Patient listening bubble */}
            {turnPhase === "listening" && (
              <View style={styles.responseBubble}>
                <Text style={styles.bubbleLabelDim}>Listening</Text>
                {liveResponseText !== "" ? (
                  <Text style={styles.responseText}>"{liveResponseText}"</Text>
                ) : (
                  <ActivityIndicator color="rgba(242,238,227,0.5)" size="small" style={{ marginTop: 6 }} />
                )}
                <Waveform
                  activeCount={liveResponseText ? 28 : 0}
                  color="#F2EEE3"
                />
              </View>
            )}

            {turnPhase === "synthesizing" && (
              <View style={styles.synthRow}>
                <ActivityIndicator color="rgba(242,238,227,0.4)" size="small" />
                <Text style={styles.synthText}>Preparing…</Text>
              </View>
            )}
          </ScrollView>

          {/* Progress dots */}
          <View style={styles.progressRow}>
            {TURN_LABELS.map((label, i) => (
              <View key={label} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    i < progressTurnIdx && styles.progressDotDone,
                    i === progressTurnIdx && styles.progressDotActive,
                  ]}
                />
                <Text
                  style={[
                    styles.progressLabel,
                    i <= progressTurnIdx && styles.progressLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.activeFooter}>
            {!demoMode && turnPhase === "listening" && (
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleDoneSpeaking}
                activeOpacity={0.8}
              >
                <Text style={styles.ghostBtnText}>Done speaking</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.endBtn}
              onPress={() => {
                // End early — submit what we have
                if (responseResolverRef.current) {
                  responseResolverRef.current("");
                  responseResolverRef.current = null;
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.endBtnText}>End check-in</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (patientPhase === "complete") {
    const isAlert = currentFlag === "red" || currentFlag === "urgent" || currentFlag === "yellow";
    const weightDelta = demoWeight - baselineWeightLbs;
    const weightDeltaStr = weightDelta > 0 ? `+${weightDelta} lb` : `${weightDelta} lb`;

    const STATS = [
      {
        label: "Weight",
        value: `${demoWeight} lb`,
        detail: weightDeltaStr,
        tone: isAlert ? "#FFC97A" : "rgba(140,220,160,1)",
      },
      {
        label: "Breathing",
        value: "On exertion",
        detail: "New today",
        tone: currentFlag !== "green" ? "#FFC97A" : "rgba(140,220,160,1)",
      },
      {
        label: "Meds taken",
        value: `${extractionResult?.medications.length ?? 4} of ${extractionResult?.medications.length ?? 4}`,
        detail: "Morning round",
        tone: "#F2EEE3",
      },
      {
        label: "Swelling",
        value: "None",
        detail: "Same as yesterday",
        tone: "rgba(140,220,160,1)",
      },
    ];

    return (
      <View style={styles.dark}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          {/* Status bar */}
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{timeStr} · {dayStr}</Text>
            <Text style={styles.statusText}>DAY {currentDay} OF 30</Text>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.completeContent}>
            {/* Flag icon */}
            <View
              style={[
                styles.flagIcon,
                { backgroundColor: isAlert ? "rgba(255,180,80,0.18)" : "rgba(58,160,106,0.18)" },
              ]}
            >
              <Text style={{ fontSize: 22 }}>{isAlert ? "⚠" : "✓"}</Text>
            </View>

            {/* Completion message */}
            <Text style={styles.completeHeading}>
              {completionMessage(currentFlag, preferredName || "there", caregiverFirstName)}
            </Text>

            {/* Flag reasons */}
            {flagReasons.length > 0 && (
              <Text style={styles.completeBody}>
                Your weight is up{" "}
                <Text style={{ color: "#F2EEE3", fontWeight: "500" }}>
                  {Math.abs(weightDelta)} {Math.abs(weightDelta) === 1 ? "pound" : "pounds"}
                </Text>{" "}
                from yesterday and your breathing is a little tight. Nothing scary — just
                want {caregiverFirstName} to know.
              </Text>
            )}

            {/* Stats grid */}
            <View style={styles.statsCard}>
              <Text style={styles.statsEyebrow}>Today so far</Text>
              <View style={styles.statsGrid}>
                {STATS.map((stat) => (
                  <View key={stat.label} style={styles.statCell}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={[styles.statDetail, { color: stat.tone }]}>
                      {stat.detail}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Done button */}
          <View style={styles.completeFooter}>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleDone}
              activeOpacity={0.9}
            >
              <Text style={styles.doneBtnText}>Okay, talk soon</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Error state
  return (
    <View style={styles.dark}>
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <View style={styles.errorCenter}>
          <Text style={styles.errorText}>{checkError}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG = "#0E120F";
const TEXT = "#F2EEE3";
const DIM = "rgba(242,238,227,0.6)";
const DIMMER = "rgba(242,238,227,0.25)";
const ACCENT_GREEN = "oklch(0.55 0.16 145)";

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  statusText: {
    fontFamily: FONT.mono,
    fontSize: 12,
    letterSpacing: 0.14 * 12,
    color: DIM,
  },

  // ── Incoming phase ──
  incomingMain: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  incomingEyebrow: {
    fontFamily: FONT.mono,
    fontSize: 12,
    letterSpacing: 0.14 * 12,
    textTransform: "uppercase",
    color: "rgba(242,238,227,0.5)",
  },
  incomingGreeting: {
    fontFamily: FONT.serif,
    fontSize: 44,
    lineHeight: 46,
    color: TEXT,
    letterSpacing: -0.015 * 44,
    marginTop: 14,
  },
  incomingSubtitle: {
    fontSize: 22,
    lineHeight: 29,
    color: "rgba(242,238,227,0.7)",
    marginTop: 14,
  },
  callerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 50,
  },
  avatarOuter: { position: "relative", alignItems: "center", justifyContent: "center" },
  avatarRing1: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(242,238,227,0.12)",
  },
  avatarRing2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(242,238,227,0.06)",
  },
  avatarInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(242,238,227,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,238,227,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: FONT.serif,
    fontSize: 32,
    color: TEXT,
  },
  callerInfo: { gap: 4 },
  callerName: { fontSize: 18, fontWeight: "500", color: TEXT },
  callerSub: { fontSize: 14, color: DIM },

  incomingButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 56,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
  },
  callButtonCol: { alignItems: "center", gap: 10 },
  callCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  callDecline: { backgroundColor: "#B53C2C" },
  callDeclineIcon: { fontSize: 22, color: TEXT },
  callAnswerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#3AA06A",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  callAnswer: { backgroundColor: "#3AA06A" },
  callAnswerIcon: { fontSize: 22, color: TEXT },
  callLabel: { fontSize: 14, color: DIM },
  callLabelAnswer: { color: TEXT },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4A8369",
  },
  liveText: {
    fontFamily: FONT.mono,
    fontSize: 12,
    letterSpacing: 0.14 * 12,
    color: DIM,
  },

  // ── Active phase ──
  conversationContent: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 18,
    justifyContent: "flex-end",
    flexGrow: 1,
  },
  promptBubble: {
    alignSelf: "flex-start",
    maxWidth: "88%",
  },
  bubbleLabel: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 0.12 * 11,
    textTransform: "uppercase",
    color: "rgba(242,238,227,0.5)",
    marginBottom: 6,
  },
  bubbleLabelDim: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 0.12 * 11,
    textTransform: "uppercase",
    color: "rgba(242,238,227,0.5)",
    marginBottom: 6,
  },
  promptText: {
    fontFamily: FONT.serif,
    fontSize: 28,
    lineHeight: 34,
    color: TEXT,
  },
  responseBubble: {
    alignSelf: "flex-end",
    maxWidth: "90%",
    padding: 16,
    borderRadius: 22,
    backgroundColor: "rgba(242,238,227,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,238,227,0.14)",
    gap: 8,
  },
  responseText: {
    fontSize: 22,
    lineHeight: 29,
    color: TEXT,
    fontWeight: "300",
  },
  synthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  synthText: { fontSize: 16, color: DIM },

  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 28,
    paddingBottom: 16,
  },
  progressItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(242,238,227,0.2)",
  },
  progressDotDone: { backgroundColor: "#4A8369" },
  progressDotActive: { backgroundColor: TEXT },
  progressLabel: { fontSize: 12, color: "rgba(242,238,227,0.4)" },
  progressLabelActive: { color: "rgba(242,238,227,0.85)" },

  activeFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingTop: 8,
  },
  ghostBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(242,238,227,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,238,227,0.18)",
    alignItems: "center",
  },
  ghostBtnText: { color: TEXT, fontSize: 16, fontFamily: "inherit" },
  endBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#B53C2C",
    alignItems: "center",
  },
  endBtnText: { color: TEXT, fontSize: 16, fontWeight: "500" },

  // ── Complete phase ──
  completeContent: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 0,
  },
  flagIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,180,80,0.4)",
  },
  completeHeading: {
    fontFamily: FONT.serif,
    fontSize: 38,
    lineHeight: 42,
    color: TEXT,
    letterSpacing: -0.015 * 38,
    marginTop: 22,
  },
  completeBody: {
    fontSize: 18,
    lineHeight: 26,
    color: "rgba(242,238,227,0.7)",
    marginTop: 16,
  },
  statsCard: {
    marginTop: 28,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(242,238,227,0.06)",
    borderWidth: 1,
    borderColor: "rgba(242,238,227,0.12)",
  },
  statsEyebrow: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 0.14 * 11,
    textTransform: "uppercase",
    color: "rgba(242,238,227,0.55)",
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCell: { width: "45%", gap: 2 },
  statLabel: { fontSize: 12, color: "rgba(242,238,227,0.5)" },
  statValue: {
    fontFamily: FONT.serif,
    fontSize: 22,
    color: TEXT,
    marginTop: 2,
  },
  statDetail: { fontSize: 12 },

  completeFooter: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingTop: 8,
  },
  doneBtn: {
    backgroundColor: TEXT,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
  },
  doneBtnText: {
    color: BG,
    fontSize: 17,
    fontWeight: "500",
  },

  // ── Error state ──
  errorCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF6B6B",
    textAlign: "center",
    lineHeight: 24,
  },
});
