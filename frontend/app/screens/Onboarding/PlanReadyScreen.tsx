// Celebration screen after all onboarding is done — caregiver sees the 30-day plan summary,
// then taps "Hand the phone to Dad" to transition to the patient-facing check-in screen.
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { usePatientStore } from "../../store/patient";
import { useCaptureStore } from "../../store/capture";
import { C, FONT, R } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "PlanReady">;

export default function PlanReadyScreen({ navigation }: Props) {
  const preferredName = usePatientStore((s) => s.preferredName);
  const caregiver = usePatientStore((s) => s.caregiver);
  const toggleDemoMode = usePatientStore((s) => s.toggleDemoMode);
  const demoMode = usePatientStore((s) => s.demoMode);
  const extractionResult = useCaptureStore((s) => s.extractionResult);

  // Hidden triple-tap on version text to toggle demo mode
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [demoToast, setDemoToast] = useState(false);

  function handleVersionTap() {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 800);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      toggleDemoMode();
      setDemoToast(true);
      setTimeout(() => setDemoToast(false), 2000);
    }
  }

  // Build summary rows from regimen data
  const firstFewMeds = extractionResult?.medications.slice(0, 2) ?? [];
  const medLabel = firstFewMeds.length > 0
    ? firstFewMeds.map((m) => m.name).join(", ") +
      (extractionResult && extractionResult.medications.length > 2
        ? ` + ${extractionResult.medications.length - 2} others`
        : "")
    : "Medications from your care plan";

  const firstFollowUp = extractionResult?.followUps[0];
  const followUpLabel = firstFollowUp
    ? `${firstFollowUp.type}${firstFollowUp.doctorName ? ` with ${firstFollowUp.doctorName}` : ""} · Day ${firstFollowUp.daysFromDischarge}`
    : "Check back in the dashboard for upcoming appointments";

  const caregiverFirstName = caregiver?.name.split(" ")[0] ?? "you";

  const SUMMARY_ROWS = [
    {
      icon: "notifications-outline" as const,
      title: "Tomorrow 8:00 AM",
      sub: `First morning check-in (weight + breathing)`,
    },
    {
      icon: "medkit-outline" as const,
      title: "Tomorrow 8:00 AM",
      sub: medLabel,
    },
    {
      icon: "calendar-outline" as const,
      title: firstFollowUp
        ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + (firstFollowUp.daysFromDischarge ?? 7));
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
              (firstFollowUp.time ? ` · ${firstFollowUp.time}` : "");
          })()
        : "Day 7",
      sub: followUpLabel,
    },
    {
      icon: "alert-circle-outline" as const,
      title: "Anytime",
      sub: `${caregiverFirstName} gets an SMS for any yellow or red flag`,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Check icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark" size={24} color={C.accentInk} />
        </View>

        {/* Heading */}
        <Text style={styles.eyebrow}>30 days · 60 check-ins · ready</Text>
        <Text style={styles.heading}>
          {preferredName ? `${preferredName}'s` : "The"} plan is set.
        </Text>
        <Text style={styles.sub}>
          The first check-in calls tomorrow morning at 8:00. We'll watch weight,
          breathing, and meds — and ping {caregiverFirstName} the moment
          something changes.
        </Text>

        {/* Summary card */}
        <View style={styles.card}>
          {SUMMARY_ROWS.map((row, i) => (
            <View
              key={i}
              style={[styles.summaryRow, i < SUMMARY_ROWS.length - 1 && styles.summaryRowBorder]}
            >
              <View style={styles.summaryIcon}>
                <Ionicons name={row.icon} size={16} color={C.ink2} />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryTitle}>{row.title}</Text>
                <Text style={styles.summarySub}>{row.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Dashboard reference */}
        <View style={styles.dashNote}>
          <Text style={styles.dashNoteText}>
            Open the caregiver dashboard anytime at{" "}
            <Text style={styles.dashNoteUrl}>care.cadence.app</Text>
          </Text>
        </View>

        {/* Demo mode toast */}
        {demoToast && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>
              {demoMode ? "Demo mode on" : "Demo mode off"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("PatientHome")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Hand the phone to{" "}
            {preferredName || "the patient"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.bgElev} />
        </TouchableOpacity>

        {/* Hidden version tap — triple-tap to toggle demo mode */}
        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1}>
          <Text style={styles.version}>v1.0.0{demoMode ? " · demo" : ""}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16 },

  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  eyebrow: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.ink3,
    fontWeight: "500",
    marginTop: 22,
  },
  heading: {
    fontFamily: FONT.serif,
    fontSize: 34,
    lineHeight: 36,
    color: C.ink,
    marginTop: 10,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: C.ink3,
    marginTop: 12,
  },

  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: R.md,
    overflow: "hidden",
    marginTop: 24,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: C.hairline },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: R.sm,
    backgroundColor: C.bgElev,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 14, fontWeight: "500", color: C.ink },
  summarySub: { fontSize: 12.5, color: C.ink3, lineHeight: 18 },

  dashNote: { marginTop: 18, alignItems: "center" },
  dashNoteText: { fontSize: 13, color: C.ink3, textAlign: "center" },
  dashNoteUrl: { fontFamily: FONT.mono, color: C.ink },

  toast: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: C.ink,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
  },
  toastText: { color: C.bgElev, fontSize: 13, fontWeight: "500" },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    backgroundColor: C.bgElev,
    alignItems: "center",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: C.ink,
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: R.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
  },
  primaryBtnText: {
    color: C.bgElev,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.05,
  },
  version: {
    fontSize: 12,
    color: C.ink4,
    fontFamily: FONT.mono,
  },
});
