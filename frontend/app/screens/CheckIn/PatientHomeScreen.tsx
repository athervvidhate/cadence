// Idle patient-facing home screen — shown between check-ins.
// Tapping the button navigates to CheckInScreen (hold-to-record wiring is a future step).
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { usePatientStore } from "../../store/patient";
import { FONT } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "PatientHome">;

const BG = "#0E120F";
const TEXT = "#F2EEE3";
const DIM = "rgba(242,238,227,0.55)";
const DIMMER = "rgba(242,238,227,0.32)";
const BTN_RED = "#C8402C";
const BTN_SHADOW = "rgba(220,80,70,0.45)";

function greeting(hour: number, name: string): string {
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${time},\n${name || "there"}.`;
}

export default function PatientHomeScreen({ navigation }: Props) {
  const preferredName = usePatientStore((s) => s.preferredName);
  const caregiver = usePatientStore((s) => s.caregiver);
  const currentDay = usePatientStore((s) => s.currentDay);

  const caregiverFirstName = caregiver?.name.split(" ")[0] ?? "Sarah";

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dayStr = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

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
            {greeting(now.getHours(), preferredName)}
          </Text>
          <Text style={styles.nextText}>
            Next check-in at{" "}
            <Text style={styles.nextTime}>8:00 PM</Text>
          </Text>
        </View>

        {/* Hairline divider */}
        <View style={styles.hairline} />

        {/* Giant button */}
        <View style={styles.centerArea}>
          <TouchableOpacity
            style={styles.bigButton}
            onPress={() => navigation.navigate("CheckIn")}
            activeOpacity={0.88}
          >
            <Ionicons name="mic" size={44} color={TEXT} />
            <Text style={styles.bigButtonLabel}>
              I need {caregiverFirstName}
            </Text>
          </TouchableOpacity>

          <Text style={styles.holdHint}>Hold to leave a message</Text>
        </View>

        {/* Footer disclaimer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            CADENCE · LISTENING ONLY WHEN HELD
          </Text>
        </View>

      </SafeAreaView>
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
        shadowColor: BTN_SHADOW,
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 1,
        shadowRadius: 28,
      },
      android: { elevation: 14 },
    }),
  },
  bigButtonLabel: {
    fontFamily: FONT.serif,
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: -0.01 * 30,
    color: TEXT,
    textAlign: "center",
  },

  holdHint: {
    marginTop: 38,
    fontSize: 18,
    color: DIM,
    textAlign: "center",
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
