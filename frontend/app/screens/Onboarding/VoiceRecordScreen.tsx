// Caregiver records 30s voice sample; cloned voice is returned from API and played back for confirmation
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { uploadVoice } from "../../api/client";
import { usePatientStore } from "../../store/patient";
import { C, FONT, R } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "VoiceRecord">;
// "review" sits between recording and uploading — user hears their own take first
type Phase = "idle" | "recording" | "review" | "uploading" | "preview" | "error";

const SCRIPT =
  "Hi Dad, it's Sarah. I just wanted to check in this morning. I love you, " +
  "and I'm right here if you need me. Let's take this one day at a time. " +
  "Remember to weigh yourself, take your medications, and call me if " +
  "anything feels off. I'm so proud of how hard you're working.";

const MAX_SEC = 30;
const NUM_BARS = 38;

function fmt(secs: number): string {
  return `0:${String(Math.min(secs, MAX_SEC)).padStart(2, "0")}`;
}

const BAR_HEIGHTS = Array.from({ length: NUM_BARS }, (_, i) => {
  const seed = Math.sin(i * 1.7) * 0.5 + 0.5;
  const noise = Math.sin(i * 0.4) * 0.4 + 0.6;
  return Math.max(8, seed * noise * 72);
});

function StepDots({ active, total }: { active: number; total: number }) {
  return (
    <View style={styles.stepDots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i === active && styles.stepDotActive,
            i < active && styles.stepDotDone,
          ]}
        />
      ))}
    </View>
  );
}

export default function VoiceRecordScreen({ navigation }: Props) {
  const patientId = usePatientStore((s) => s.patientId);
  const setVoiceId = usePatientStore((s) => s.setVoiceId);

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rawUri, setRawUri] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (elapsed >= MAX_SEC && recordingRef.current !== null) {
      void handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ── Audio helpers ────────────────────────────────────────────────────────────

  // Load and play a URI from scratch, replacing any active sound
  async function loadAndPlay(uri: string) {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded) setIsPlaying(status.isPlaying);
      }
    );
    soundRef.current = sound;
  }

  // Toggle play/pause for an already-loaded sound; reload if needed
  async function handlePlayPause(uri: string) {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          return;
        }
        // Restart from beginning if finished
        if ((status.durationMillis ?? 0) > 0 &&
            status.positionMillis >= (status.durationMillis ?? 0) - 200) {
          await soundRef.current.setPositionAsync(0);
        }
        await soundRef.current.playAsync();
        return;
      }
    }
    await loadAndPlay(uri);
  }

  async function stopSound() {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsPlaying(false);
  }

  // ── Recording lifecycle ──────────────────────────────────────────────────────

  async function handleRecord() {
    setApiError(null);

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      setApiError(
        "Microphone access is required. Go to Settings → DischargeCoach and enable Microphone."
      );
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;

    setPhase("recording");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  async function handleStop() {
    if (!recordingRef.current) return;

    clearTimer();

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("No audio captured.");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      setRawUri(uri);
      setPhase("review");
    } catch {
      setPhase("error");
      setApiError("Couldn't capture your recording — please try again.");
    }
  }

  // Called from review phase when the user approves their take
  async function handleUpload() {
    if (!rawUri) return;

    await stopSound();
    setPhase("uploading");

    try {
      const res = await uploadVoice(patientId ?? "", rawUri);
      setVoiceId(res.voiceId);
      setPreviewUrl(res.previewUrl);
      setPhase("preview");
      if (res.previewUrl) {
        await loadAndPlay(res.previewUrl);
      }
    } catch {
      setPhase("error");
      setApiError(
        "Couldn't upload your recording — check your connection and try again."
      );
    }
  }

  async function handleReRecord() {
    await stopSound();
    setPhase("idle");
    setElapsed(0);
    setApiError(null);
    setRawUri("");
    setPreviewUrl("");
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const activeBars =
    phase === "recording"
      ? Math.round((elapsed / MAX_SEC) * NUM_BARS)
      : 0;

  // ── Shared playback card ─────────────────────────────────────────────────────

  function PlaybackCard({
    uri,
    title,
    subtitle,
  }: {
    uri: string;
    title: string;
    subtitle: string;
  }) {
    return (
      <View style={styles.previewCard}>
        <View style={styles.previewRow}>
          <TouchableOpacity
            style={styles.playCircle}
            onPress={() => void handlePlayPause(uri)}
            activeOpacity={0.8}
          >
            {isPlaying ? (
              <View style={styles.pauseBars}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.playTriangle} />
            )}
          </TouchableOpacity>
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle}>{title}</Text>
            <Text style={styles.previewSub}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.waveformSmall}>
          {BAR_HEIGHTS.slice(0, 48).map((h, i) => (
            <View
              key={i}
              style={[
                styles.waveBarSmall,
                {
                  height: Math.max(3, h * 0.4),
                  backgroundColor: C.accent,
                },
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ width: 56 }} />
        <StepDots active={3} total={5} />
        <Text style={styles.topLink}>Why?</Text>
      </View>

      <View style={styles.body}>
        {/* Page header */}
        <Text style={styles.eyebrow}>Step 4 · Record your voice</Text>
        <Text style={styles.heading}>Read this aloud, just once.</Text>
        <Text style={styles.sub}>
          30 seconds is all we need. Dad will hear{" "}
          <Text style={styles.subEmphasis}>your</Text> voice on every check-in.
        </Text>

        {/* Script card */}
        <View style={styles.scriptCard}>
          <View style={styles.scriptTag}>
            <Text style={styles.scriptTagText}>script · 28 sec</Text>
          </View>
          <Text style={styles.scriptText}>"{SCRIPT}"</Text>
        </View>

        {/* Review — play back raw recording before uploading */}
        {phase === "review" && (
          <PlaybackCard
            uri={rawUri}
            title={`Your recording · ${fmt(elapsed)}`}
            subtitle={isPlaying ? "Playing…" : "Tap to listen back"}
          />
        )}

        {/* Preview — cloned voice returned from API */}
        {phase === "preview" && (
          <PlaybackCard
            uri={previewUrl}
            title={"\"Good morning, Dad. It's day 1.\""}
            subtitle={
              isPlaying ? "Playing cloned voice…" : "Sarah's voice · cloned"
            }
          />
        )}

        {/* Uploading */}
        {phase === "uploading" && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color={C.accent} size="small" />
            <Text style={styles.uploadingText}>Cloning your voice…</Text>
          </View>
        )}

        {/* Error */}
        {phase === "error" && apiError !== null && (
          <Text style={styles.errorText}>{apiError}</Text>
        )}

        {/* Waveform + timer — idle and recording only */}
        {(phase === "idle" || phase === "recording") && (
          <>
            <View style={styles.waveform}>
              {BAR_HEIGHTS.map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: h,
                      backgroundColor: i < activeBars ? C.accent : C.hairline,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.timerRow}>
              <Text style={styles.timerElapsed}>{fmt(elapsed)}</Text>
              <Text style={styles.timerTotal}>/ 0:30</Text>
            </View>

            <View style={styles.privacyRow}>
              <Ionicons name="shield-checkmark-outline" size={13} color={C.ink3} />
              <Text style={styles.privacyText}>
                Your audio is encrypted and only used to clone your voice.
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>

        {/* Review: listen back, then approve or re-record */}
        {phase === "review" && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={handleReRecord}
              activeOpacity={0.8}
            >
              <Text style={styles.ghostBtnText}>Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => void handleUpload()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Use this</Text>
              <Ionicons name="chevron-forward" size={16} color={C.bgElev} />
            </TouchableOpacity>
          </View>
        )}

        {/* Preview / error: re-record or continue */}
        {(phase === "preview" || phase === "error") && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={handleReRecord}
              activeOpacity={0.8}
            >
              <Text style={styles.ghostBtnText}>Re-record</Text>
            </TouchableOpacity>
            {phase === "preview" && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate("PlanReady")}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Sounds great</Text>
                <Ionicons name="chevron-forward" size={16} color={C.bgElev} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Idle / recording: the mic button */}
        {(phase === "idle" || phase === "recording") && (
          <View style={styles.recordRow}>
            <View style={{ width: 48 }} />
            <TouchableOpacity
              style={[
                styles.recordBtn,
                phase === "recording" && styles.recordBtnActive,
              ]}
              onPress={phase === "idle" ? handleRecord : handleStop}
              activeOpacity={0.85}
              accessibilityLabel={phase === "idle" ? "Start recording" : "Stop recording"}
            >
              {phase === "recording" ? (
                <View style={styles.stopSquare} />
              ) : (
                <Ionicons name="mic" size={28} color="#F2EEE3" />
              )}
            </TouchableOpacity>
            <View style={{ width: 48 }} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stepDots: { flexDirection: "row", gap: 6 },
  stepDot: { width: 22, height: 3, borderRadius: 2, backgroundColor: C.hairline },
  stepDotActive: { backgroundColor: C.accent },
  stepDotDone: { backgroundColor: C.accent, opacity: 0.4 },
  topLink: { fontSize: 14, color: C.ink3, width: 56, textAlign: "right" },

  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },

  eyebrow: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.ink3,
    fontWeight: "500",
  },
  heading: {
    fontFamily: FONT.serif,
    fontSize: 26,
    lineHeight: 30,
    color: C.ink,
    marginTop: 10,
    letterSpacing: -0.3,
  },
  sub: { fontSize: 15, lineHeight: 22, color: C.ink3, marginTop: 8 },
  subEmphasis: { fontStyle: "italic", color: C.ink2 },

  scriptCard: {
    marginTop: 18,
    padding: 20,
    paddingTop: 22,
    backgroundColor: C.bgElev,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: R.md,
    position: "relative",
  },
  scriptTag: {
    position: "absolute",
    top: 12,
    right: 14,
    backgroundColor: C.hairline2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.xs,
  },
  scriptTagText: {
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: C.ink3,
  },
  scriptText: {
    fontFamily: FONT.serif,
    fontSize: 19,
    lineHeight: 28,
    color: C.ink,
  },

  previewCard: {
    marginTop: 18,
    padding: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: R.md,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: C.bgElev,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    marginLeft: 3,
  },
  pauseBars: { flexDirection: "row", gap: 4, alignItems: "center" },
  pauseBar: { width: 3, height: 14, borderRadius: 1.5, backgroundColor: C.bgElev },
  previewInfo: { flex: 1, gap: 2 },
  previewTitle: { fontSize: 15, fontWeight: "500", color: C.ink },
  previewSub: { fontSize: 12, color: C.ink3 },
  waveformSmall: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
    height: 24,
    marginTop: 14,
  },
  waveBarSmall: { width: 2.5, borderRadius: 1.5 },

  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  uploadingText: { fontSize: 16, color: C.ink2 },

  errorText: {
    fontSize: 15,
    color: C.danger,
    marginTop: 20,
    lineHeight: 22,
  },

  waveform: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    height: 84,
    marginTop: 28,
  },
  waveBar: { width: 4, borderRadius: 2 },

  timerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  timerElapsed: {
    fontFamily: FONT.mono,
    fontSize: 14,
    color: C.ink2,
    fontVariant: ["tabular-nums"],
  },
  timerTotal: { fontSize: 14, color: C.ink3 },

  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 20,
  },
  privacyText: { fontSize: 13, color: C.ink3 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    backgroundColor: C.bgElev,
  },

  actionRow: { flexDirection: "row", gap: 10 },
  ghostBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { fontSize: 16, fontWeight: "500", color: C.ink2 },
  primaryBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: R.pill,
    backgroundColor: C.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "500", color: C.bgElev },

  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  recordBtn: {
    width: 78,
    height: 78,
    borderRadius: 40,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: C.danger,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  recordBtnActive: { backgroundColor: "#8A2B1F" },
  stopSquare: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: "#F2EEE3",
  },
});
