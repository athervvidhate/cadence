// Idle patient-facing home screen — shown between check-ins.
// Hold the button to record a voice message for the caregiver; release to send.
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { usePatientStore } from "../../store/patient";
import { FONT } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "PatientHome">;
type HomeState = "idle" | "recording" | "sent";

const BG = "#0E120F";
const TEXT = "#F2EEE3";
const DIM = "rgba(242,238,227,0.55)";
const DIMMER = "rgba(242,238,227,0.32)";
const BTN_RED = "#C8402C";
const BTN_RED_HOT = "#D94A3D";

// Static waveform heights — decorative, matches design aesthetic
const WAVE_HEIGHTS = Array.from({ length: 9 }, (_, i) =>
  Math.max(8, (Math.sin(i * 1.2) * 0.5 + Math.cos(i * 0.7) * 0.5 + 0.6) * 40)
);

function greetingText(hour: number, name: string): string {
  const salutation =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${salutation},\n${name || "there"}.`;
}

function useElapsedTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Three concentric rings pulse outward while recording.
// Each ring starts its own loop delayed by 400 ms so they stagger.
const RING_SIZES = [240, 300, 360] as const;
const RING_DELAYS = [0, 400, 800] as const;
const RING_PERIOD = 1400;

export default function PatientHomeScreen(_props: Props) {
  const preferredName = usePatientStore((s) => s.preferredName);
  const caregiver = usePatientStore((s) => s.caregiver);
  const currentDay = usePatientStore((s) => s.currentDay);
  const caregiverFirstName = caregiver?.name.split(" ")[0] ?? "Sarah";

  const [homeState, setHomeState] = useState<HomeState>("idle");
  const isRecording = homeState === "recording";
  const isSent = homeState === "sent";

  const recordingRef = useRef<Audio.Recording | null>(null);
  const sentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Clock — refreshes every 30 s
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Elapsed recording timer
  const elapsed = useElapsedTimer(isRecording);

  // Ring animated values
  const ring0 = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ringAnims = [ring0, ring1, ring2];
  const ringLoopsRef = useRef<Animated.CompositeAnimation[]>([]);
  const ringTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (sentTimerRef.current) clearTimeout(sentTimerRef.current);
      stopRings();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  function startRings() {
    ringAnims.forEach((a) => a.setValue(0));
    ringAnims.forEach((anim, i) => {
      const t = setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: RING_PERIOD,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
        loop.start();
        ringLoopsRef.current.push(loop);
      }, RING_DELAYS[i]);
      ringTimersRef.current.push(t);
    });
  }

  function stopRings() {
    ringLoopsRef.current.forEach((l) => l.stop());
    ringLoopsRef.current = [];
    ringTimersRef.current.forEach((t) => clearTimeout(t));
    ringTimersRef.current = [];
    ringAnims.forEach((a) => a.setValue(0));
  }

  async function handlePressIn() {
    if (homeState !== "idle") return;
    if (sentTimerRef.current) clearTimeout(sentTimerRef.current);

    // Enter recording state immediately so UI responds without waiting for mic
    setHomeState("recording");
    startRings();

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!isMountedRef.current) return;
      if (granted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        if (!isMountedRef.current) {
          await recording.stopAndUnloadAsync().catch(() => {});
          return;
        }
        recordingRef.current = recording;
      }
    } catch {
      // Mic unavailable — recording state is still shown visually
    }
  }

  async function handlePressOut() {
    if (!isMountedRef.current) return;
    if (homeState !== "recording") return;

    stopRings();

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // ignore cleanup errors
      }
      recordingRef.current = null;
    }

    if (!isMountedRef.current) return;
    setHomeState("sent");
    sentTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setHomeState("idle");
    }, 3000);
  }

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dayStr = now
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>

        {/* Status bar */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{timeStr} · {dayStr}</Text>
          <Text style={styles.statusText}>DAY {currentDay} OF 30</Text>
        </View>

        {/* Greeting + next check-in */}
        <View style={styles.greetingWrap}>
          <Text style={styles.greetingText}>
            {greetingText(now.getHours(), preferredName)}
          </Text>
          <Text style={styles.nextText}>
            Next check-in at{" "}
            <Text style={styles.nextTime}>8:00 PM</Text>
          </Text>
        </View>

        {/* Hairline */}
        <View style={styles.hairline} />

        {/* Button + rings */}
        <View style={styles.centerArea}>

          {/* Expanding pulse rings — visible only while recording */}
          {RING_SIZES.map((size, i) => {
            const anim = ringAnims[i];
            return (
              <Animated.View
                key={size}
                pointerEvents="none"
                style={[
                  styles.ring,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    opacity: anim.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0, 0.35 - i * 0.08, 0],
                    }),
                    transform: [
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1.1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })}

          <Pressable
            onPressIn={() => void handlePressIn()}
            onPressOut={() => void handlePressOut()}
            style={[styles.bigButton, isRecording && styles.bigButtonHot]}
          >
            {isRecording ? (
              <View style={styles.waveRow}>
                {WAVE_HEIGHTS.map((h, i) => (
                  <View key={i} style={[styles.waveBar, { height: h }]} />
                ))}
              </View>
            ) : (
              <Ionicons name="mic" size={44} color={TEXT} />
            )}
            <Text style={styles.bigButtonLabel}>
              {isRecording ? "Listening…" : `I need ${caregiverFirstName}`}
            </Text>
          </Pressable>

          <Text style={[styles.holdHint, isRecording && styles.holdHintActive]}>
            {isRecording
              ? `Speak as long as you need · ${elapsed}`
              : "Hold to leave a message"}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            CADENCE · LISTENING ONLY WHEN HELD
          </Text>
        </View>

      </SafeAreaView>

      {/* Sent toast — absolutely positioned over the footer */}
      {isSent && (
        <View style={styles.toast}>
          <View style={styles.toastIconWrap}>
            <Ionicons name="checkmark" size={20} color="rgba(180,240,200,1)" />
          </View>
          <View>
            <Text style={styles.toastTitle}>
              Message sent to {caregiverFirstName}
            </Text>
            <Text style={styles.toastSub}>she'll call you back soon</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  statusText: {
    fontFamily: FONT.mono,
    fontSize: 12,
    letterSpacing: 0.06 * 12,
    color: "rgba(242,238,227,0.45)",
  },

  greetingWrap: {
    paddingHorizontal: 32,
    paddingTop: 28,
    alignItems: "center",
  },
  greetingText: {
    fontFamily: FONT.serif,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.015 * 40,
    color: TEXT,
    textAlign: "center",
  },
  nextText: {
    marginTop: 22,
    fontSize: 19,
    color: "rgba(242,238,227,0.6)",
    textAlign: "center",
  },
  nextTime: { color: TEXT },

  hairline: {
    marginHorizontal: 32,
    marginTop: 34,
    height: 1,
    backgroundColor: "rgba(242,238,227,0.10)",
  },

  centerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  ring: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(220,80,70,1)",
  },

  bigButton: {
    width: 232,
    height: 232,
    borderRadius: 116,
    backgroundColor: BTN_RED,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(220,80,70,1)",
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.45,
        shadowRadius: 28,
      },
      android: { elevation: 14 },
    }),
  },
  bigButtonHot: {
    backgroundColor: BTN_RED_HOT,
  },

  bigButtonLabel: {
    fontFamily: FONT.serif,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.01 * 30,
    color: TEXT,
    textAlign: "center",
  },

  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 44,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: TEXT,
  },

  holdHint: {
    marginTop: 38,
    fontSize: 18,
    color: DIM,
    textAlign: "center",
    minHeight: 26,
  },
  holdHintActive: {
    color: "#FFB199",
  },

  // Toast sits above the footer area
  toast: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(140,220,160,0.12)",
    borderWidth: 1,
    borderColor: "rgba(140,220,160,0.32)",
  },
  toastIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(140,220,160,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  toastTitle: {
    fontSize: 16,
    color: TEXT,
    fontWeight: "500",
  },
  toastSub: {
    fontSize: 13,
    color: "rgba(242,238,227,0.6)",
    marginTop: 2,
  },

  footer: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    alignItems: "center",
  },
  footerText: {
    fontFamily: FONT.mono,
    fontSize: 12,
    letterSpacing: 0.08 * 12,
    color: DIMMER,
  },
});
