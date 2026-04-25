// Triggers /api/regimens/extract on mount, displays medications + warnings, starts care plan on confirm
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import {
  extractRegimen,
  generateCarePlan,
  type ExtractRegimenResponse,
  type Medication,
  type Interaction,
  type Discrepancy,
} from "../../api/client";
import { usePatientStore } from "../../store/patient";
import { useCaptureStore } from "../../store/capture";
import { C, FONT, R } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "RegimenReview">;
type LoadPhase = "loading" | "success" | "error";

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

export default function RegimenReviewScreen({ navigation }: Props) {
  const patientId = usePatientStore((s) => s.patientId);
  const setRegimenIdStore = usePatientStore((s) => s.setRegimenId);
  const setCarePlanId = usePatientStore((s) => s.setCarePlanId);

  const dischargePages = useCaptureStore((s) => s.dischargePages);
  const medicationBottles = useCaptureStore((s) => s.medicationBottles);
  const setExtractionResult = useCaptureStore((s) => s.setExtractionResult);
  const setRegimenIdCapture = useCaptureStore((s) => s.setRegimenId);

  const [loadPhase, setLoadPhase] = useState<LoadPhase>("loading");
  const [result, setResult] = useState<ExtractRegimenResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (loadPhase === "loading") {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => loopRef.current?.stop();
  }, [loadPhase, pulseAnim]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoadPhase("loading");
    setApiError(null);
    try {
      const res = await extractRegimen({
        patientId: patientId ?? "",
        pageUris: dischargePages,
        bottleUris: medicationBottles,
      });
      setExtractionResult(res);
      setRegimenIdCapture(res.regimenId);
      setRegimenIdStore(res.regimenId);
      setResult(res);
      setLoadPhase("success");
    } catch {
      setLoadPhase("error");
      setApiError(
        "Couldn't read your paperwork — check your connection and try again."
      );
    }
  }

  async function handleStartPlan() {
    if (!result || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await generateCarePlan({
        patientId: patientId ?? "",
        regimenId: result.regimenId,
        startDate: new Date().toISOString().split("T")[0] ?? "",
      });
      setCarePlanId(res.carePlanId);
    } catch {
      // Don't block demo if endpoint isn't ready
    } finally {
      setIsSubmitting(false);
      navigation.navigate("CheckIn");
    }
  }

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ width: 56 }} />
        <StepDots active={2} total={5} />
        <Text style={styles.topLink}>Edit</Text>
      </View>

      {/* Loading */}
      {loadPhase === "loading" && (
        <View style={styles.center}>
          <Animated.Text style={[styles.loadingText, { opacity: pulseAnim }]}>
            Extracting your medications…
          </Animated.Text>
          <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 20 }} />
        </View>
      )}

      {/* Error */}
      {loadPhase === "error" && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{apiError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success */}
      {loadPhase === "success" && result !== null && (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Page header */}
            <Text style={styles.eyebrow}>Step 3 · Review the plan</Text>
            <Text style={styles.heading}>
              We found{" "}
              <Text style={styles.headingItalic}>
                {result.medications.length} medication{result.medications.length !== 1 ? "s" : ""}
              </Text>
              {result.interactions.length > 0 || result.discrepancies.length > 0
                ? ` and ${result.interactions.length + result.discrepancies.length} flag${result.interactions.length + result.discrepancies.length !== 1 ? "s" : ""}.`
                : "."}
            </Text>

            {/* Confidence tags */}
            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <View style={styles.tagDot} />
                <Text style={styles.tagText}>{confidencePct}% confidence</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {result.extractionPath === "zetic" ? "on-device · zetic" : "cloud · gemma"}
                </Text>
              </View>
            </View>

            {/* needsReview banner */}
            {result.needsReview && (
              <View style={styles.warnBanner}>
                <Text style={styles.warnBannerText}>
                  Some fields need your review — please check carefully before continuing.
                </Text>
              </View>
            )}

            {/* Discrepancies — shown prominently */}
            {result.discrepancies.length > 0 && (
              <View style={styles.discrepancyCallout}>
                <View style={styles.discrepancyHeader}>
                  <Text style={styles.discrepancyTitle}>
                    {result.discrepancies.length} discrepanc{result.discrepancies.length !== 1 ? "ies" : "y"} need{result.discrepancies.length === 1 ? "s" : ""} review
                  </Text>
                </View>
                {result.discrepancies.map((d, i) => (
                  <View key={i} style={i > 0 ? styles.discrepancyItemBorder : undefined}>
                    <Text style={styles.discrepancyMed}>{d.medicationName}:</Text>
                    <Text style={styles.discrepancyDetail}>
                      paper says <Text style={styles.discrepancyBold}>{d.paperValue}</Text>, bottle says{" "}
                      <Text style={styles.discrepancyBold}>{d.bottleValue}</Text>.{" "}
                      Confirm with pharmacy before next dose.
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Medications */}
            <Text style={styles.sectionLabel}>Medications</Text>
            <View style={styles.card}>
              {result.medications.map((med, i) => (
                <MedicationRow
                  key={i}
                  med={med}
                  isLast={i === result.medications.length - 1}
                  hasDiscrepancy={result.discrepancies.some(
                    (d) => d.medicationName.toLowerCase() === med.name.toLowerCase()
                  )}
                />
              ))}
            </View>

            {/* Interactions */}
            {result.interactions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Interactions checked</Text>
                <View style={styles.card}>
                  {result.interactions.map((item, i) => (
                    <InteractionRow
                      key={i}
                      item={item}
                      isLast={i === result.interactions.length - 1}
                    />
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.ctaBtn, isSubmitting && styles.ctaBtnDisabled]}
              onPress={handleStartPlan}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color={C.bgElev} size="small" />
              ) : (
                <Text style={styles.ctaBtnText}>Looks right · continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MedicationRow({
  med,
  isLast,
  hasDiscrepancy,
}: {
  med: Medication;
  isLast: boolean;
  hasDiscrepancy: boolean;
}) {
  return (
    <View style={[styles.medRow, !isLast && styles.medRowBorder]}>
      <View style={styles.medMain}>
        <View style={styles.medNameRow}>
          <Text style={styles.medName}>{med.name}</Text>
          <Text style={styles.medDose}>{med.dose}</Text>
        </View>
        <Text style={styles.medFreq}>{med.frequency}</Text>
      </View>
      {hasDiscrepancy ? (
        <View style={styles.pillWarn}>
          <View style={[styles.pillDot, { backgroundColor: C.warn }]} />
          <Text style={[styles.pillText, { color: C.warnInk }]}>review</Text>
        </View>
      ) : (
        <View style={styles.pillNeutral}>
          <Text style={styles.pillTextNeutral}>rx</Text>
        </View>
      )}
    </View>
  );
}

function InteractionRow({
  item,
  isLast,
}: {
  item: Interaction;
  isLast: boolean;
}) {
  const isHigh = item.severity === "high";
  const isMod = item.severity === "moderate";

  const pillStyle = isHigh
    ? styles.pillDanger
    : isMod
    ? styles.pillWarn
    : styles.pillNeutral;
  const pillTextStyle = isHigh
    ? { color: C.dangerInk }
    : isMod
    ? { color: C.warnInk }
    : { color: C.ink3 };

  return (
    <View style={[styles.interactionRow, !isLast && styles.medRowBorder]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.interactionDrugs}>
          {item.drugs[0]} + {item.drugs[1]}
        </Text>
        <Text style={styles.interactionDesc}>{item.description}</Text>
      </View>
      <View style={[styles.pill, pillStyle]}>
        <View
          style={[
            styles.pillDot,
            {
              backgroundColor: isHigh ? C.danger : isMod ? C.warn : C.ink4,
            },
          ]}
        />
        <Text style={[styles.pillText, pillTextStyle]}>{item.severity}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

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

  loadingText: {
    fontSize: 20,
    color: C.ink2,
    textAlign: "center",
    fontWeight: "500",
    fontFamily: FONT.serif,
  },
  errorText: {
    fontSize: 16,
    color: C.danger,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: C.ink,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: R.pill,
  },
  retryBtnText: { color: C.bgElev, fontSize: 16, fontWeight: "500" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },

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
  headingItalic: { fontStyle: "italic" },

  tagRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.hairline2,
    borderRadius: R.xs,
  },
  tagDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent },
  tagText: {
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: C.ink3,
  },

  warnBanner: {
    marginTop: 16,
    padding: 14,
    backgroundColor: C.warnSoft,
    borderWidth: 1,
    borderColor: C.warn,
    borderRadius: R.md,
  },
  warnBannerText: { fontSize: 14, color: C.warnInk, lineHeight: 20 },

  discrepancyCallout: {
    marginTop: 16,
    padding: 14,
    backgroundColor: C.warnSoft,
    borderWidth: 1,
    borderColor: C.warn,
    borderRadius: R.md,
    gap: 8,
  },
  discrepancyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  discrepancyTitle: { fontSize: 14, fontWeight: "600", color: C.warnInk },
  discrepancyItemBorder: { borderTopWidth: 1, borderTopColor: C.warn, paddingTop: 8, marginTop: 0 },
  discrepancyMed: { fontSize: 14, fontWeight: "600", color: C.ink2 },
  discrepancyDetail: { fontSize: 13, color: C.ink2, lineHeight: 20, marginTop: 2 },
  discrepancyBold: { fontWeight: "600", color: C.ink },

  sectionLabel: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.ink3,
    fontWeight: "500",
    marginTop: 20,
    marginBottom: 8,
  },

  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: R.md,
    overflow: "hidden",
  },

  medRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  medRowBorder: { borderBottomWidth: 1, borderBottomColor: C.hairline },
  medMain: { flex: 1, gap: 2 },
  medNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  medName: { fontSize: 15, fontWeight: "500", color: C.ink },
  medDose: { fontSize: 13, color: C.ink3 },
  medFreq: { fontSize: 13, color: C.ink3 },

  interactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  interactionDrugs: { fontSize: 14, fontWeight: "500", color: C.ink },
  interactionDesc: { fontSize: 12, color: C.ink3, lineHeight: 18 },

  // Pills
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.pill,
    flexShrink: 0,
  },
  pillWarn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.pill,
    backgroundColor: C.warnSoft,
    flexShrink: 0,
  },
  pillDanger: {
    backgroundColor: C.dangerSoft,
  },
  pillNeutral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.pill,
    backgroundColor: C.hairline2,
    flexShrink: 0,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: "500" },
  pillTextNeutral: { fontSize: 12, fontWeight: "500", color: C.ink3 },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    backgroundColor: C.bgElev,
  },
  ctaBtn: {
    backgroundColor: C.ink,
    paddingVertical: 18,
    borderRadius: R.pill,
    alignItems: "center",
  },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaBtnText: { color: C.bgElev, fontSize: 16, fontWeight: "500" },
});
