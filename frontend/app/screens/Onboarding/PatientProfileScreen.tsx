// Caregiver fills in patient + their own details; POSTs to /api/patients on Continue
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { createPatient } from "../../api/client";
import { usePatientStore } from "../../store/patient";
import { C, FONT, R } from "../../theme";

type Props = StackScreenProps<RootStackParamList, "PatientProfile">;

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  patientName: string;
  preferredName: string;
  ageYears: string;
  baselineWeightLbs: string;
  language: "en" | "es";
  caregiverName: string;
  caregiverRelationship: string;
  caregiverPhone: string;
  caregiverEmail: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState): FieldErrors {
  const e: FieldErrors = {};
  if (!f.patientName.trim()) e.patientName = "Patient name is required.";
  if (!f.preferredName.trim()) e.preferredName = "Preferred name is required.";
  const age = parseInt(f.ageYears, 10);
  if (!f.ageYears.trim() || isNaN(age) || age <= 0 || age > 130)
    e.ageYears = "Enter a valid age (e.g. 76).";
  const wt = parseFloat(f.baselineWeightLbs);
  if (!f.baselineWeightLbs.trim() || isNaN(wt) || wt <= 0)
    e.baselineWeightLbs = "Enter the discharge weight in lbs (e.g. 184).";
  if (!f.caregiverName.trim()) e.caregiverName = "Your name is required.";
  if (!f.caregiverRelationship.trim())
    e.caregiverRelationship = "Relationship is required.";
  if (!f.caregiverPhone.trim()) {
    e.caregiverPhone = "Phone number is required.";
  } else if (!/^\+[1-9]\d{1,14}$/.test(f.caregiverPhone.trim())) {
    e.caregiverPhone = "Use international format, e.g. +12125551234.";
  }
  if (!f.caregiverEmail.trim()) {
    e.caregiverEmail = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.caregiverEmail.trim())) {
    e.caregiverEmail = "Enter a valid email address.";
  }
  return e;
}

function isFilled(f: FormState): boolean {
  return (
    f.patientName.trim() !== "" &&
    f.preferredName.trim() !== "" &&
    f.ageYears.trim() !== "" &&
    f.baselineWeightLbs.trim() !== "" &&
    f.caregiverName.trim() !== "" &&
    f.caregiverRelationship.trim() !== "" &&
    f.caregiverPhone.trim() !== "" &&
    f.caregiverEmail.trim() !== ""
  );
}

// ─── Step dots ────────────────────────────────────────────────────────────────

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PatientProfileScreen({ navigation }: Props) {
  const [form, setForm] = useState<FormState>({
    patientName: "",
    preferredName: "",
    ageYears: "",
    baselineWeightLbs: "",
    language: "en",
    caregiverName: "",
    caregiverRelationship: "",
    caregiverPhone: "",
    caregiverEmail: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const setPatientId = usePatientStore((s) => s.setPatientId);
  const setPatientProfile = usePatientStore((s) => s.setPatientProfile);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (apiError) setApiError(null);
  }

  async function handleContinue() {
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    setApiError(null);
    try {
      const res = await createPatient({
        patientName: form.patientName.trim(),
        preferredName: form.preferredName.trim(),
        ageYears: parseInt(form.ageYears, 10),
        language: form.language,
        baselineWeightLbs: parseFloat(form.baselineWeightLbs),
        caregiver: {
          name: form.caregiverName.trim(),
          relationship: form.caregiverRelationship.trim(),
          phone: form.caregiverPhone.trim(),
          email: form.caregiverEmail.trim(),
        },
      });

      setPatientId(res.patientId);
      setPatientProfile({
        patientName: form.patientName.trim(),
        preferredName: form.preferredName.trim(),
        baselineWeightLbs: parseFloat(form.baselineWeightLbs),
        language: form.language,
        caregiver: {
          name: form.caregiverName.trim(),
          relationship: form.caregiverRelationship.trim(),
          phone: form.caregiverPhone.trim(),
          email: form.caregiverEmail.trim(),
        },
      });

      navigation.navigate("DischargeCapture");
    } catch {
      setApiError(
        "Couldn't save the profile — check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const canSubmit = isFilled(form) && !isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ width: 56 }} />
        <StepDots active={0} total={5} />
        <View style={{ width: 56 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Page header */}
          <Text style={styles.eyebrow}>Step 1 · About the patient</Text>
          <Text style={styles.heading}>Who are we caring for?</Text>
          <Text style={styles.sub}>We'll use this to personalize check-ins.</Text>

          {/* ── Patient fields ── */}
          <View style={styles.fieldGroup}>
            <Field label="Full name" error={errors.patientName}>
              <TextInput
                style={[styles.input, !!errors.patientName && styles.inputError]}
                placeholder="Robert Chen"
                placeholderTextColor={C.ink4}
                value={form.patientName}
                onChangeText={(v) => update("patientName", v)}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </Field>

            <Field label="What you call them" error={errors.preferredName}>
              <TextInput
                style={[styles.input, !!errors.preferredName && styles.inputError]}
                placeholder="Dad"
                placeholderTextColor={C.ink4}
                value={form.preferredName}
                onChangeText={(v) => update("preferredName", v)}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <Text style={styles.hint}>
                Used in voice prompts: "Good morning, Dad."
              </Text>
            </Field>

            <View style={styles.halfRow}>
              <View style={{ flex: 1 }}>
                <Field label="Age" error={errors.ageYears}>
                  <TextInput
                    style={[styles.input, !!errors.ageYears && styles.inputError]}
                    placeholder="76"
                    placeholderTextColor={C.ink4}
                    value={form.ageYears}
                    onChangeText={(v) => update("ageYears", v)}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Baseline weight" error={errors.baselineWeightLbs}>
                  <TextInput
                    style={[styles.input, !!errors.baselineWeightLbs && styles.inputError]}
                    placeholder="184 lb"
                    placeholderTextColor={C.ink4}
                    value={form.baselineWeightLbs}
                    onChangeText={(v) => update("baselineWeightLbs", v)}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </Field>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Preferred language</Text>
              <View style={styles.langRow}>
                {(["en", "es"] as const).map((lang, i) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.langOption,
                      form.language === lang && styles.langOptionActive,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, language: lang }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        form.language === lang && styles.langOptionTextActive,
                      ]}
                    >
                      {lang === "en" ? "English" : "Español"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Divider ── */}
          <View style={styles.divider} />

          {/* ── Caregiver fields ── */}
          <Text style={styles.sectionEyebrow}>About you</Text>

          <View style={styles.fieldGroup}>
            <Field label="Your name" error={errors.caregiverName}>
              <TextInput
                style={[styles.input, !!errors.caregiverName && styles.inputError]}
                placeholder="Sarah Chen"
                placeholderTextColor={C.ink4}
                value={form.caregiverName}
                onChangeText={(v) => update("caregiverName", v)}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </Field>

            <Field label="Relationship to patient" error={errors.caregiverRelationship}>
              <TextInput
                style={[styles.input, !!errors.caregiverRelationship && styles.inputError]}
                placeholder="daughter, son, spouse"
                placeholderTextColor={C.ink4}
                value={form.caregiverRelationship}
                onChangeText={(v) => update("caregiverRelationship", v)}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </Field>

            <Field label="Phone number" error={errors.caregiverPhone}>
              <TextInput
                style={[styles.input, !!errors.caregiverPhone && styles.inputError]}
                placeholder="+12125551234"
                placeholderTextColor={C.ink4}
                value={form.caregiverPhone}
                onChangeText={(v) => update("caregiverPhone", v)}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
              />
            </Field>

            <Field label="Email" error={errors.caregiverEmail}>
              <TextInput
                style={[styles.input, !!errors.caregiverEmail && styles.inputError]}
                placeholder="sarah@example.com"
                placeholderTextColor={C.ink4}
                value={form.caregiverEmail}
                onChangeText={(v) => update("caregiverEmail", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </Field>
          </View>

          {apiError !== null && (
            <Text style={styles.apiError}>{apiError}</Text>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !canSubmit && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={C.bgElev} size="small" />
          ) : (
            <Text style={styles.continueBtnText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stepDots: { flexDirection: "row", gap: 6, alignItems: "center" },
  stepDot: { width: 22, height: 3, borderRadius: 2, backgroundColor: C.hairline },
  stepDotActive: { backgroundColor: C.accent },
  stepDotDone: { backgroundColor: C.accent, opacity: 0.4 },

  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },

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
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: C.ink3,
    marginTop: 8,
  },

  fieldGroup: { marginTop: 22, gap: 16 },
  fieldWrap: {},
  label: {
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: C.ink3,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.surface,
  },
  inputError: { borderColor: C.danger },
  hint: { fontSize: 12, color: C.ink3, marginTop: 5 },
  errorText: { fontSize: 13, color: C.danger, marginTop: 5, lineHeight: 18 },

  halfRow: { flexDirection: "row", gap: 12 },

  langRow: { flexDirection: "row", gap: 10 },
  langOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
  },
  langOptionActive: { borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.surface },
  langOptionText: { fontSize: 15, color: C.ink3 },
  langOptionTextActive: { fontWeight: "500", color: C.ink },

  divider: { height: 1, backgroundColor: C.hairline, marginVertical: 24 },
  sectionEyebrow: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.ink3,
    fontWeight: "500",
    marginBottom: 16,
  },

  apiError: {
    fontSize: 15,
    color: C.danger,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    backgroundColor: C.bgElev,
  },
  continueBtn: {
    backgroundColor: C.ink,
    paddingVertical: 18,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: C.bgElev, fontSize: 16, fontWeight: "500", letterSpacing: -0.05 },
});
