import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { C, FONT, R } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "Welcome">;

const FEATURES = [
  {
    icon: "camera-outline" as const,
    title: "Snap the paperwork",
    sub: "We extract meds, doses, and follow-ups.",
  },
  {
    icon: "mic-outline" as const,
    title: "Record 30s of your voice",
    sub: "Dad will hear you on every check-in.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Stays on this phone",
    sub: "Photos and voice never leave the device.",
  },
];

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.scroll}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Ionicons name="heart" size={14} color={C.bgElev} />
          </View>
          <Text style={styles.logoText}>Cadence</Text>
        </View>

        {/* Headline */}
        <View style={styles.headlineBlock}>
          <Text style={styles.eyebrow}>Set up · 2 minutes</Text>
          <Text style={styles.headline}>
            The next 30 days,{"\n"}
            <Text style={styles.headlineItalic}>handled</Text> together.
          </Text>
          <Text style={styles.sub}>
            Cadence turns the discharge paperwork into a daily plan and
            checks in twice a day — in your voice, so Dad always recognizes
            who's calling.
          </Text>
        </View>

        {/* Feature rows */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={16} color={C.ink2} />
              </View>
              <View style={styles.featureTextCol}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("PatientProfile")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Begin setup</Text>
          <Ionicons name="chevron-forward" size={16} color={C.bgElev} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate("PatientHome")}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>Skip to demo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  scroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 14,
    fontWeight: "500",
    color: C.ink,
    letterSpacing: -0.1,
  },

  headlineBlock: { marginTop: 56 },
  eyebrow: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.ink3,
    fontWeight: "500",
  },
  headline: {
    fontFamily: FONT.serif,
    fontSize: 34,
    lineHeight: 38,
    color: C.ink,
    marginTop: 14,
    letterSpacing: -0.3,
  },
  headlineItalic: {
    fontFamily: FONT.serif,
    fontStyle: "italic",
    color: C.accentInk,
  },
  sub: {
    fontSize: 16,
    lineHeight: 24,
    color: C.ink3,
    marginTop: 14,
  },

  features: { marginTop: 36, gap: 16 },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureTextCol: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 15, fontWeight: "500", color: C.ink },
  featureSub: { fontSize: 13, color: C.ink3, lineHeight: 18 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    backgroundColor: C.bgElev,
    gap: 10,
    alignItems: "stretch",
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
  },
  primaryBtnText: {
    color: C.bgElev,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.05,
  },

  skipBtn: {
    paddingVertical: 14,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    fontSize: 15,
    color: C.ink3,
  },
});
