import React, { useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/auth";

type CanvasRef = HTMLCanvasElement | null;

const GOLD = "#E8C86F";
const BG = "#080B14";

export default function StyleSwapPage() {
  const router = useRouter();
  const { api } = useAuth();
  const imageCanvas = useRef<CanvasRef>(null);
  const overlayCanvas = useRef<CanvasRef>(null);
  const maskCanvas = useRef<CanvasRef>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const sourceDataUrl = useRef("");
  const [imageReady, setImageReady] = useState(false);
  const [prompt, setPrompt] = useState("Replace the masked clothing area with a refined white luxury shirt with subtle crystal detailing and realistic fabric.");
  const [negativePrompt, setNegativePrompt] = useState("face changes, body changes, extra jewelry, warped hands, fake logos, plastic skin");
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("");

  const resetMask = () => {
    const overlay = overlayCanvas.current;
    const mask = maskCanvas.current;
    if (!overlay || !mask) return;
    overlay.getContext("2d")?.clearRect(0, 0, overlay.width, overlay.height);
    const ctx = mask.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, mask.width, mask.height);
    }
  };

  const loadFile = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      setError("Style Swap photo masking is currently enabled in the STAAR Hub web build.");
      return;
    }
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/png,image/jpeg,image/webp";
    picker.onchange = () => {
      const file = picker.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setError("Choose an image under 10 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || "");
        const img = new window.Image();
        img.onload = () => {
          const maxSide = 1536;
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
          const width = Math.max(1, Math.round(img.naturalWidth * scale));
          const height = Math.max(1, Math.round(img.naturalHeight * scale));
          const base = imageCanvas.current;
          const overlay = overlayCanvas.current;
          const mask = maskCanvas.current;
          if (!base || !overlay || !mask) return;
          for (const canvas of [base, overlay, mask]) {
            canvas.width = width;
            canvas.height = height;
          }
          const baseCtx = base.getContext("2d");
          if (!baseCtx) return;
          baseCtx.clearRect(0, 0, width, height);
          baseCtx.drawImage(img, 0, 0, width, height);
          sourceDataUrl.current = base.toDataURL("image/png");
          resetMask();
          setResultUrl("");
          setProvider("");
          setError("");
          setImageReady(true);
        };
        img.onerror = () => setError("That image could not be opened.");
        img.src = raw;
      };
      reader.readAsDataURL(file);
    };
    picker.click();
  };

  const pointFromEvent = (event: any) => {
    const canvas = overlayCanvas.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const overlay = overlayCanvas.current;
    const mask = maskCanvas.current;
    if (!overlay || !mask) return;
    const width = Math.max(18, overlay.width * 0.028);

    const overlayCtx = overlay.getContext("2d");
    if (overlayCtx) {
      overlayCtx.strokeStyle = "rgba(255, 48, 64, 0.58)";
      overlayCtx.lineWidth = width;
      overlayCtx.lineCap = "round";
      overlayCtx.lineJoin = "round";
      overlayCtx.beginPath();
      overlayCtx.moveTo(from.x, from.y);
      overlayCtx.lineTo(to.x, to.y);
      overlayCtx.stroke();
    }

    const maskCtx = mask.getContext("2d");
    if (maskCtx) {
      maskCtx.strokeStyle = "#ffffff";
      maskCtx.lineWidth = width;
      maskCtx.lineCap = "round";
      maskCtx.lineJoin = "round";
      maskCtx.beginPath();
      maskCtx.moveTo(from.x, from.y);
      maskCtx.lineTo(to.x, to.y);
      maskCtx.stroke();
    }
  };

  const pointerDown = (event: any) => {
    if (!imageReady) return;
    drawing.current = true;
    const point = pointFromEvent(event);
    lastPoint.current = point;
    if (point) drawSegment(point, { x: point.x + 0.1, y: point.y + 0.1 });
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  };

  const pointerMove = (event: any) => {
    if (!drawing.current) return;
    const point = pointFromEvent(event);
    const last = lastPoint.current;
    if (!point || !last) return;
    drawSegment(last, point);
    lastPoint.current = point;
  };

  const pointerUp = (event?: any) => {
    drawing.current = false;
    lastPoint.current = null;
    if (event?.currentTarget && event?.pointerId != null) {
      try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch {}
    }
  };

  const generate = async () => {
    const mask = maskCanvas.current;
    if (!imageReady || !sourceDataUrl.current || !mask) {
      setError("Upload a photo and paint the area you want changed first.");
      return;
    }
    if (prompt.trim().length < 3) {
      setError("Describe the style you want.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await api("/api/style-swap", {
        method: "POST",
        body: JSON.stringify({
          imageBase64: sourceDataUrl.current,
          maskBase64: mask.toDataURL("image/png"),
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || "Style Swap failed");
      setResultUrl(payload.imageUrl || "");
      setProvider(payload.provider || "");
      if (!payload.imageUrl) throw new Error("The image provider returned no result.");
    } catch (cause: any) {
      setError(cause?.message || "Style Swap failed.");
    } finally {
      setBusy(false);
    }
  };

  if (Platform.OS !== "web") {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.mobileCard}>
          <Text style={styles.kicker}>STYLE · AI FITTING ROOM</Text>
          <Text style={styles.title}>Masked Style Swap</Text>
          <Text style={styles.copy}>The precision mask painter is currently available in the STAAR Hub web experience. Mobile support can be added as a native canvas pass without changing the backend contract.</Text>
          <Pressable onPress={() => router.back()} style={styles.primary}><Text style={styles.primaryText}>RETURN TO STYLE</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canvasStyle: React.CSSProperties = { width: "100%", height: "auto", display: "block", borderRadius: 18 };
  const overlayStyle: React.CSSProperties = { ...canvasStyle, position: "absolute", inset: 0, cursor: "crosshair", touchAction: "none" };
  const hiddenStyle: React.CSSProperties = { display: "none" };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ STYLE</Text></Pressable>
          <Text style={styles.brand}>STAARWAARDD</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>STYLE · AI FITTING ROOM</Text>
          <Text style={styles.title}>Change the garment. Keep the person.</Text>
          <Text style={styles.copy}>Upload your photo, paint only the clothing or accessory region you want changed, then describe the target look. The Guardian sends the original image and your black/white mask to the configured image-editing provider.</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>1 · PHOTO + MASK</Text>
              <View style={styles.inline}>
                <Pressable onPress={loadFile} style={styles.secondary}><Text style={styles.secondaryText}>{imageReady ? "CHANGE PHOTO" : "UPLOAD PHOTO"}</Text></Pressable>
                <Pressable onPress={resetMask} disabled={!imageReady} style={[styles.secondary, !imageReady && styles.disabled]}><Text style={styles.secondaryText}>CLEAR MASK</Text></Pressable>
              </View>
            </View>

            <View style={styles.canvasShell}>
              {!imageReady && <View style={styles.placeholder}><Text style={styles.placeholderTitle}>Your photo appears here</Text><Text style={styles.placeholderCopy}>Then paint the exact region to replace.</Text></View>}
              {React.createElement("canvas" as any, { ref: imageCanvas as any, style: canvasStyle })}
              {React.createElement("canvas" as any, {
                ref: overlayCanvas as any,
                style: overlayStyle,
                onPointerDown: pointerDown,
                onPointerMove: pointerMove,
                onPointerUp: pointerUp,
                onPointerCancel: pointerUp,
                onPointerLeave: pointerUp,
              })}
              {React.createElement("canvas" as any, { ref: maskCanvas as any, style: hiddenStyle })}
            </View>
            <Text style={styles.hint}>Red paint = the region the model is allowed to change. Everything else should remain as stable as the provider permits.</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>2 · TARGET LOOK</Text>
            <Text style={styles.label}>STYLE PROMPT</Text>
            <TextInput value={prompt} onChangeText={setPrompt} multiline maxLength={1200} style={styles.input} placeholderTextColor="#72819A" />
            <Text style={styles.label}>AVOID</Text>
            <TextInput value={negativePrompt} onChangeText={setNegativePrompt} multiline maxLength={600} style={[styles.input, styles.smallInput]} placeholderTextColor="#72819A" />
            <Pressable onPress={generate} disabled={busy || !imageReady} style={[styles.primary, (busy || !imageReady) && styles.disabled]}>
              <Text style={styles.primaryText}>{busy ? "GENERATING…" : "GENERATE STYLE SWAP"}</Text>
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.disclosure}>AI-generated style visualization. Product, logo, jewelry, fit and material details may not exactly match real-world items.</Text>
          </View>
        </View>

        {resultUrl ? (
          <View style={styles.resultPanel}>
            <View style={styles.resultHeader}><Text style={styles.panelTitle}>3 · RESULT</Text><Text style={styles.provider}>{provider ? provider.toUpperCase() : "IMAGE MODEL"}</Text></View>
            {React.createElement("img" as any, { src: resultUrl, alt: "AI style swap result", style: { width: "100%", height: "auto", borderRadius: 20, display: "block" } })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 48, width: "100%", maxWidth: 1180, alignSelf: "center" },
  nav: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  back: { minHeight: 44, justifyContent: "center", paddingRight: 14 },
  backText: { color: GOLD, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  brand: { color: "#8796B0", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  hero: { borderWidth: 1, borderColor: "rgba(232,200,111,0.32)", backgroundColor: "rgba(232,200,111,0.06)", borderRadius: 24, padding: 22, marginBottom: 14 },
  kicker: { color: GOLD, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  title: { color: "#F6F8FD", fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 7 },
  copy: { color: "#BCC8DA", fontSize: 13, lineHeight: 20, marginTop: 9, maxWidth: 850 },
  grid: { gap: 14 },
  panel: { backgroundColor: "#0F1829", borderWidth: 1, borderColor: "rgba(209,224,255,0.12)", borderRadius: 22, padding: 16 },
  panelHeader: { gap: 10, marginBottom: 12 },
  panelTitle: { color: "#EDF3FF", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  inline: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondary: { minHeight: 42, borderRadius: 13, borderWidth: 1, borderColor: "rgba(232,200,111,0.36)", paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: GOLD, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  canvasShell: { width: "100%", minHeight: 280, position: "relative", backgroundColor: "#070C16", borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  placeholder: { position: "absolute", zIndex: 2, alignItems: "center", padding: 24 },
  placeholderTitle: { color: "#DCE6F8", fontSize: 16, fontWeight: "800" },
  placeholderCopy: { color: "#7F8FA8", fontSize: 12, marginTop: 5 },
  hint: { color: "#8393AD", fontSize: 11, lineHeight: 16, marginTop: 10 },
  label: { color: "#8D9CB4", fontSize: 9, fontWeight: "800", letterSpacing: 1.1, marginTop: 15, marginBottom: 7 },
  input: { minHeight: 116, color: "#F3F6FC", backgroundColor: "#0A1120", borderWidth: 1, borderColor: "rgba(210,225,255,0.12)", borderRadius: 15, padding: 13, textAlignVertical: "top", fontSize: 13, lineHeight: 19 },
  smallInput: { minHeight: 82 },
  primary: { minHeight: 52, borderRadius: 15, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 16 },
  primaryText: { color: "#171820", fontSize: 11, fontWeight: "900", letterSpacing: 0.9 },
  disabled: { opacity: 0.42 },
  error: { color: "#FF8C93", fontSize: 12, lineHeight: 18, marginTop: 11 },
  disclosure: { color: "#7888A1", fontSize: 10, lineHeight: 15, marginTop: 11 },
  resultPanel: { backgroundColor: "#0F1829", borderWidth: 1, borderColor: "rgba(232,200,111,0.28)", borderRadius: 22, padding: 16, marginTop: 14 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  provider: { color: "#6FDFC5", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  mobileCard: { margin: 18, padding: 22, borderRadius: 22, backgroundColor: "#0F1829", borderWidth: 1, borderColor: "rgba(232,200,111,0.3)" },
});
