// Idle patient-facing home screen — shown between check-ins.
// Hold the button to record a voice message for the caregiver; release to send.
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { sendVoiceMessage } from "../../api/client";
import { FONT } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "PatientHome">;
type HomeState = "idle" | "recording" | "uploading" | "sent" | "error";

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
const RING_SIZES = [240, 300, 360] as const;
const RING_DELAYS = [0, 400, 800] as const;
const RING_PERIOD = 1400;

export default function PatientHomeScreen(_props: Props) {
  const patientId = usePatientStore((s) => s.patientId);
  const preferredName = usePatientStore((s) => s.preferredName);
  const caregiver = usePatientStore((s) => s.caregiver);
  const currentDay = usePatientStore((s) => s.currentDay);
  const caregiverFirstName = caregiver?.name.split(" ")[0] ?? "Sarah";

  const [homeState, setHomeState] = useState<HomeState>("idle");
  const isRecording = homeState === "recording";
  const isUploading = homeState === "uploading";
  const isSent = homeState === "sent";
  const isError = homeState === "error";

  const recordingRef = useRef<Audio.Recording | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
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
            Animated.timing(anim, { toValue: 1, duration: RING_PERIOD, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
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

  function scheduleReset(ms = 3000) {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setHomeState("idle");
    }, ms);
  }

  async function handlePressIn() {
    if (homeState !== "idle") return;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

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
    if (!isMountedRef.current || homeState !== "recording") return;

    stopRings();

    // Retrieve URI before unloading — getURI() is unavailable after stopAndUnloadAsync
    let audioUri: string | null = null;
    if (recordingRef.current) {
      try {
        audioUri = recordingRef.current.getURI();
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // ignore cleanup errors
      }
      recordingRef.current = null;
    }

    // Always restore audio mode so check-in playback works normally
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch {}

    if (!isMountedRef.current) return;

    if (!audioUri || !patientId) {
      // Nothing recorded or session not initialised — silently reset
      setHomeState("idle");
      return;
    }

    setHomeState("uploading");

    try {
      await sendVoiceMessage(patientId, audioUri);
      if (!isMountedRef.current) return;
      setHomeState("sent");
      scheduleReset(3000);
    } catch {
      if (!isMountedRef.current) return;
      setHomeState("error");
      scheduleReset(3000);
    }
  }

  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dayStr = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

  function holdHintLabel() {
    if (isRecording)  return `Speak as long as you need · ${elapsed}`;
    if (isUploading)  return "Sending your message…";
    if (isSent)       return "Message sent";
    if (isError)      return "Couldn't send — try again";
    return "Hold to leave a message";
  }

  function buttonLabel() {
    if (isRecording || isUploading) return isRecording ? "Listening…" : "Sending…";
    return `I need ${caregiverFirstName}`;
  }

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
                    transform: [{
                      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }),
                    }],
                  },
                ]}
              />
            );
          })}

          <Pressable
            onPressIn={() => void handlePressIn()}
            onPressOut={() => void handlePressOut()}
            disabled={isUploading}
            style={[
              styles.bigButton,
              isRecording && styles.bigButtonHot,
              isUploading && styles.bigButtonMuted,
            ]}
          >
            {isRecording ? (
              <View style={styles.waveRow}>
                {WAVE_HEIGHTS.map((h, i) => (
                  <View key={i} style={[styles.waveBar, { height: h }]} />
                ))}
              </View>
            ) : isUploading ? (
              <ActivityIndicator color={TEXT} size="large" />
            ) : (
              <Ionicons name="mic" size={44} color={TEXT} />
            )}
            <Text style={styles.bigButtonLabel}>{buttonLabel()}</Text>
          </Pressable>

          <Text style={[
            styles.holdHint,
            isRecording && styles.holdHintActive,
            isError && styles.holdHintError,
          ]}>
            {holdHintLabel()}
          </Text>
        </View>

        {/* Start check-in */}
        <Pressable
          style={styles.checkInBtn}
          onPress={() => _props.navigation.navigate("CheckIn")}
        >
          <Text style={styles.checkInBtnText}>Start check-in</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CADENCE · LISTENING ONLY WHEN HELD</Text>
        </View>

      </SafeAreaView>

      {/* Sent toast */}
      {isSent && (
        <View style={styles.toast}>
          <View style={styles.toastIconWrap}>
            <Ionicons name="checkmark" size={20} color="rgba(180,240,200,1)" />
          </View>
          <View>
            <Text style={styles.toastTitle}>Message sent to {caregiverFirstName}</Text>
            <Text style={styles.toastSub}>she'll call you back soon</Text>
          </View>
        </View>
      )}

      {/* Error toast */}
      {isError && (
        <View style={[styles.toast, styles.toastError]}>
          <View style={[styles.toastIconWrap, styles.toastIconWrapError]}>
            <Ionicons name="alert" size={20} color="rgba(255,160,140,1)" />
          </View>
          <View>
            <Text style={styles.toastTitle}>Couldn't send the message</Text>
            <Text style={styles.toastSub}>Check your connection and try again</Text>
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
  bigButtonHot: { backgroundColor: BTN_RED_HOT },
  bigButtonMuted: { opacity: 0.6 },

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
  holdHintActive: { color: "#FFB199" },
  holdHintError: { color: "#FF9980" },

  // Sent toast
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

  // Error toast overrides
  toastError: {
    backgroundColor: "rgba(220,80,70,0.10)",
    borderColor: "rgba(220,80,70,0.30)",
  },
  toastIconWrapError: {
    backgroundColor: "rgba(220,80,70,0.18)",
  },

  checkInBtn: {
    marginHorizontal: 28,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(242,238,227,0.2)",
    alignItems: "center",
  },
  checkInBtnText: {
    color: "rgba(242,238,227,0.7)",
    fontSize: 16,
    fontFamily: FONT.mono,
    letterSpacing: 0.05 * 16,
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
