// Caregiver photographs discharge paperwork pages; images compressed and stored in Zustand (no upload here)
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "../../navigation";
import { useCaptureStore } from "../../store/capture";

type Props = StackScreenProps<RootStackParamList, "DischargeCapture">;

const MAX_PAGES = 6;
const THUMB_SIZE = 60;
const SHUTTER_SIZE = 74;

export default function DischargeCaptureScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);

  const pages = useCaptureStore((s) => s.dischargePages);
  const addDischargePage = useCaptureStore((s) => s.addDischargePage);
  const replaceDischargePage = useCaptureStore((s) => s.replaceDischargePage);

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
          Cadence needs camera access to photograph the discharge
          paperwork. Tap below to allow it.
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

      // Compress to 1024px wide JPEG before storing — hard rule from CLAUDE.md
      const compressed = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.85, format: SaveFormat.JPEG }
      );

      if (retakeIndex !== null) {
        replaceDischargePage(retakeIndex, compressed.uri);
        setRetakeIndex(null);
      } else {
        addDischargePage(compressed.uri);
      }
    } catch {
      setCaptureError("Couldn't capture the photo — try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Thumbnail tap → retake confirmation ───────────────────────────────────

  function handleThumbnailPress(index: number) {
    Alert.alert(
      `Retake page ${index + 1}?`,
      "This will replace the current photo.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retake",
          style: "destructive",
          onPress: () => {
            setRetakeIndex(index);
            setCaptureError(null);
          },
        },
      ]
    );
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const atMax = pages.length >= MAX_PAGES && retakeIndex === null;
  const shutterDisabled = isProcessing || !isCameraReady || atMax;

  let headerSub: string;
  if (retakeIndex !== null) {
    headerSub = `Retaking page ${retakeIndex + 1} — tap shutter to replace`;
  } else if (pages.length === 0) {
    headerSub = "Photograph each page of the discharge summary";
  } else {
    headerSub = `${pages.length} of ${MAX_PAGES} pages captured`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discharge Papers</Text>
          <Text
            style={[
              styles.headerSub,
              retakeIndex !== null && styles.headerSubRetake,
            ]}
            numberOfLines={1}
          >
            {headerSub}
          </Text>
        </View>
      </SafeAreaView>

      {/* Live camera viewfinder */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Bottom controls */}
      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {/* Thumbnail strip — only shown once at least one page exists */}
        {pages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}
          >
            {pages.map((uri, i) => (
              <TouchableOpacity
                key={`page-${i}`}
                onPress={() => handleThumbnailPress(i)}
                activeOpacity={0.75}
                style={[
                  styles.thumbWrap,
                  retakeIndex === i && styles.thumbRetaking,
                ]}
              >
                <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                <View style={styles.thumbBadge}>
                  <Text style={styles.thumbBadgeText}>{i + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Empty slot hint when below max */}
            {pages.length < MAX_PAGES && retakeIndex === null && (
              <View style={[styles.thumbWrap, styles.thumbEmpty]}>
                <Text style={styles.thumbEmptyText}>+</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Inline messages */}
        {captureError !== null && (
          <Text style={styles.errorText}>{captureError}</Text>
        )}
        {atMax && (
          <Text style={styles.maxText}>
            Maximum {MAX_PAGES} pages reached — tap a thumbnail to retake one.
          </Text>
        )}

        {/* Shutter + Done row */}
        <View style={styles.buttonsRow}>
          {/* Left slot — empty, mirrors the Done button width for centering */}
          <View style={styles.sideSlot} />

          {/* Shutter */}
          <TouchableOpacity
            style={[
              styles.shutterOuter,
              shutterDisabled && styles.shutterDisabled,
            ]}
            onPress={takePhoto}
            disabled={shutterDisabled}
            activeOpacity={0.8}
            accessibilityLabel={
              retakeIndex !== null
                ? `Retake page ${retakeIndex + 1}`
                : "Take photo"
            }
          >
            {isProcessing ? (
              <ActivityIndicator color={C.controls} size="small" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>

          {/* Done button */}
          <View style={[styles.sideSlot, styles.sideSlotRight]}>
            <TouchableOpacity
              style={[
                styles.doneBtn,
                pages.length === 0 && styles.doneBtnDisabled,
              ]}
              onPress={() => navigation.navigate("RegimenReview")}
              disabled={pages.length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>
                {pages.length > 0 ? `Done (${pages.length})` : "Done"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  retake: "#f59e0b",
  text: "#ffffff",
  textDim: "#9ca3af",
  error: "#ff6b6b",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },

  // ── Permission screen ──
  permScreen: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  permTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 12,
  },
  permBody: {
    fontSize: 16,
    color: C.textDim,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  permBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  permBtnText: { color: "#fff", fontSize: 18, fontWeight: "600" },

  // ── Header ──
  headerSafe: { backgroundColor: C.headerBg },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 13, color: C.textDim, marginTop: 2 },
  headerSubRetake: { color: C.retake, fontWeight: "600" },

  // ── Camera ──
  camera: { flex: 1 },

  // ── Bottom controls ──
  controls: { backgroundColor: C.controls, paddingTop: 10 },

  // ── Thumbnail strip ──
  strip: { maxHeight: THUMB_SIZE + 20 },
  stripContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    alignItems: "center",
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbRetaking: { borderColor: C.retake },
  thumb: { width: "100%", height: "100%" },
  thumbBadge: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  thumbBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  thumbEmpty: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    // dashed not supported on Android; borderStyle omitted intentionally
  },
  thumbEmptyText: { color: "rgba(255,255,255,0.3)", fontSize: 22, lineHeight: 26 },

  // ── Inline messages ──
  errorText: {
    color: C.error,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  maxText: {
    color: C.textDim,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  // ── Shutter + Done row ──
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sideSlot: { flex: 1 },
  sideSlotRight: { alignItems: "flex-end" },

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
      ios: {
        shadowColor: "#fff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
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

  doneBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
  },
  doneBtnDisabled: { backgroundColor: "rgba(26,115,232,0.3)" },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
