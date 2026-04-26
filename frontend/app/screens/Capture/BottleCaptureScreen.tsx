// Caregiver photographs medication bottles one at a time; stored in Zustand (no upload here)
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { useCaptureStore } from "../../store/capture";

type Props = StackScreenProps<RootStackParamList, "BottleCapture">;

// camera → preview (confirm single capture) → reviewing (see all, add more or finish)
type Phase = "camera" | "preview" | "reviewing";

const SHUTTER_SIZE = 74;
const REVIEW_THUMB = 80;

export default function BottleCaptureScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("camera");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);

  const bottles = useCaptureStore((s) => s.medicationBottles);
  const addMedicationBottle = useCaptureStore((s) => s.addMedicationBottle);

  // ── Permission gates ──────────────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permScreen} edges={["top", "bottom"]}>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permBody}>
          Cadence needs camera access to photograph medication bottles.
          Tap below to allow it.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera Access</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Capture + compress ────────────────────────────────────────────────────

  async function takePhoto() {
    if (!cameraRef.current || isProcessing || !isCameraReady) return;
    setCaptureError(null);
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo?.uri) throw new Error("No photo returned.");

      const compressed = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.85, format: SaveFormat.JPEG }
      );
      setPreviewUri(compressed.uri);
      setPhase("preview");
    } catch {
      setCaptureError("Couldn't capture the photo — try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Phase transitions ─────────────────────────────────────────────────────

  function handleRetake() {
    setPreviewUri(null);
    setPhase("camera");
  }

  function handleUseThis() {
    if (!previewUri) return;
    addMedicationBottle(previewUri);
    setPreviewUri(null);
    setPhase("reviewing");
  }

  function handleAddAnother() {
    setIsCameraReady(false); // reset so shutter stays locked until camera warms up
    setCaptureError(null);
    setPhase("camera");
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const shutterDisabled = isProcessing || !isCameraReady;

  function headerContent(): { title: string; sub: string } {
    if (phase === "camera") {
      return bottles.length === 0
        ? { title: "Medication Bottles", sub: "Point the camera at a label and tap the shutter" }
        : { title: "Medication Bottles", sub: `${bottles.length} bottle${bottles.length > 1 ? "s" : ""} added — tap shutter for the next one` };
    }
    if (phase === "preview") {
      return { title: "Does this look clear?", sub: "Make sure the label is fully visible and in focus" };
    }
    return {
      title: `${bottles.length} bottle${bottles.length > 1 ? "s" : ""} captured`,
      sub: "Add another bottle or continue to the medication review",
    };
  }

  const { title, sub } = headerContent();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub} numberOfLines={2}>{sub}</Text>
        </View>
      </SafeAreaView>

      {/* ── Content area changes by phase ── */}

      {phase === "camera" && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setIsCameraReady(true)}
        />
      )}

      {phase === "preview" && previewUri !== null && (
        <Image
          source={{ uri: previewUri }}
          style={styles.camera}
          resizeMode="cover"
        />
      )}

      {phase === "reviewing" && (
        <View style={styles.reviewingArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reviewingScroll}
          >
            {bottles.map((uri, i) => (
              <View key={`bottle-${i}`} style={styles.reviewThumbWrap}>
                <Image
                  source={{ uri }}
                  style={styles.reviewThumb}
                  resizeMode="cover"
                />
                <Text style={styles.reviewThumbLabel}>Bottle {i + 1}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Controls bar ── */}
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 12) }]}>

        {/* Capture error — shown in camera phase only */}
        {phase === "camera" && captureError !== null && (
          <Text style={styles.errorText}>{captureError}</Text>
        )}

        {/* Camera phase: centered shutter */}
        {phase === "camera" && (
          <View style={styles.shutterRow}>
            <TouchableOpacity
              style={[styles.shutterOuter, shutterDisabled && styles.shutterDisabled]}
              onPress={takePhoto}
              disabled={shutterDisabled}
              activeOpacity={0.8}
              accessibilityLabel="Photograph bottle"
            >
              {isProcessing ? (
                <ActivityIndicator color={C.controls} size="small" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Preview phase: Retake | Use this */}
        {phase === "preview" && (
          <View style={styles.previewRow}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleRetake}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSecondaryText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleUseThis}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Use this</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reviewing phase: Add another | Done */}
        {phase === "reviewing" && (
          <View style={styles.reviewingButtons}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleAddAnother}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSecondaryText}>Add another bottle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, bottles.length === 0 && styles.btnPrimaryDisabled]}
              onPress={() => navigation.navigate("RegimenReview")}
              disabled={bottles.length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                Done ({bottles.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: "#000000",
  controls: "#1a1a1a",
  headerBg: "#111111",
  accent: "#1a73e8",
  text: "#ffffff",
  textDim: "#9ca3af",
  error: "#ff6b6b",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },

  // ── Permission screen ──
  permScreen: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  permTitle: { fontSize: 22, fontWeight: "700", color: C.text, textAlign: "center", marginBottom: 12 },
  permBody: { fontSize: 16, color: C.textDim, textAlign: "center", lineHeight: 24, marginBottom: 32 },
  permBtn: { backgroundColor: C.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  permBtnText: { color: "#fff", fontSize: 18, fontWeight: "600" },

  // ── Header ──
  headerSafe: { backgroundColor: C.headerBg },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 13, color: C.textDim, marginTop: 2, lineHeight: 18 },

  // ── Content ──
  camera: { flex: 1 },

  // Reviewing: thumbnails centered in the remaining space
  reviewingArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewingScroll: {
    paddingHorizontal: 24,
    gap: 16,
    alignItems: "center",
  },
  reviewThumbWrap: { alignItems: "center", gap: 6 },
  reviewThumb: {
    width: REVIEW_THUMB,
    height: REVIEW_THUMB,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  reviewThumbLabel: { color: C.textDim, fontSize: 11 },

  // ── Controls bar ──
  controls: { backgroundColor: C.controls, paddingTop: 12 },
  errorText: { color: C.error, fontSize: 13, textAlign: "center", paddingHorizontal: 16, marginBottom: 6 },

  // Camera phase
  shutterRow: { alignItems: "center", paddingVertical: 10 },
  shutterOuter: {
    width: SHUTTER_SIZE,
    height: SHUTTER_SIZE,
    borderRadius: SHUTTER_SIZE / 2,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#fff", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  shutterDisabled: { opacity: 0.3 },
  shutterInner: {
    width: SHUTTER_SIZE - 16,
    height: SHUTTER_SIZE - 16,
    borderRadius: (SHUTTER_SIZE - 16) / 2,
    backgroundColor: "#ffffff",
  },

  // Preview phase
  previewRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  // Reviewing phase
  reviewingButtons: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  // Shared buttons
  btnPrimary: {
    flex: 1,
    backgroundColor: C.accent,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  btnPrimaryDisabled: { backgroundColor: "rgba(26,115,232,0.3)" },
  btnPrimaryText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  btnSecondary: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  btnSecondaryText: { color: C.textDim, fontSize: 17, fontWeight: "500" },
});
