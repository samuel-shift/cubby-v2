"use client";

/**
 * ReceiptScannerClient
 * Used by /log/receipt
 *
 * Flow:
 *  1. Camera capture (or file upload fallback)
 *  2. Base64 → POST /api/log/vision?entryType=receipt → extracted items
 *  3. Review screen — edit, remove, confirm storage location
 *  4. POST /api/inventory for each confirmed item
 *
 * Phases: "capture" | "processing" | "review" | "saving" | "success" | "error"
 */

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Camera, Upload, Check, Trash2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

type Phase = "capture" | "processing" | "review" | "saving" | "success" | "error";
type StorageLocation = "FRIDGE" | "FREEZER" | "PANTRY" | "COUNTER" | "CUPBOARD";
type Confidence = "high" | "medium" | "low";

interface ExtractedItem {
  id: string; // client-only id for keying
  name: string;
  brand?: string;
  quantity: number;
  unit?: string;
  category: string;
  estimatedExpiryDays?: number;
  confidence: Confidence;
  location: StorageLocation;
  selected: boolean;
}

const STORAGE_OPTIONS: { id: StorageLocation; label: string; emoji: string }[] = [
  { id: "FRIDGE",   label: "Fridge",   emoji: "🧊" },
  { id: "FREEZER",  label: "Freezer",  emoji: "❄️" },
  { id: "PANTRY",   label: "Pantry",   emoji: "🏪" },
  { id: "COUNTER",  label: "Counter",  emoji: "🍌" },
  { id: "CUPBOARD", label: "Cupboard", emoji: "📦" },
];

function defaultLocation(category: string): StorageLocation {
  const fresh = ["dairy", "meat", "fish", "produce", "fruit", "vegetables", "eggs", "fresh"];
  if (fresh.some((f) => category.toLowerCase().includes(f))) return "FRIDGE";
  if (category.toLowerCase().includes("frozen")) return "FREEZER";
  return "PANTRY";
}

function expiryFromDays(days?: number): string | undefined {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function ReceiptScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("capture");
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<Confidence, boolean>>({
    high: false,
    medium: true,
    low: true,
  });
  const [addedCount, setAddedCount] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // ─── Camera ──────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      // Camera unavailable — file upload will work as fallback
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreviewSrc(dataUrl);
    stopCamera();
    processImage(dataUrl.split(",")[1]); // strip data:image/jpeg;base64,
  }

  // ─── File upload fallback ─────────────────────────────────────────────────

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewSrc(dataUrl);
      processImage(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  // ─── Process image through Claude Vision ─────────────────────────────────

  async function processImage(base64: string) {
    setPhase("processing");
    try {
      const res = await fetch("/api/log/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, entryType: "receipt" }),
      });
      if (!res.ok) throw new Error("Vision API error");
      const data = await res.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extracted: ExtractedItem[] = (data.extracted as any[]).map((item, i) => ({
        id: `item-${i}`,
        name: item.name ?? "Unknown item",
        brand: item.brand,
        quantity: item.quantity ?? 1,
        unit: item.unit,
        category: item.category ?? "other",
        estimatedExpiryDays: item.estimatedExpiryDays,
        confidence: item.confidence ?? "medium",
        location: defaultLocation(item.category ?? ""),
        selected: true,
      }));

      setItems(extracted);
      setPhase("review");
    } catch {
      setPhase("error");
    }
  }

  // ─── Review helpers ───────────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<ExtractedItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function toggleSection(conf: Confidence) {
    setExpandedSections((s) => ({ ...s, [conf]: !s[conf] }));
  }

  // ─── Save to inventory ────────────────────────────────────────────────────

  async function handleSave() {
    const toSave = items.filter((i) => i.selected);
    if (toSave.length === 0) return;
    setPhase("saving");

    let saved = 0;
    await Promise.allSettled(
      toSave.map(async (item) => {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            brand: item.brand,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            location: item.location,
            entryMethod: "RECEIPT",
            expiryDate: expiryFromDays(item.estimatedExpiryDays),
          }),
        });
        if (res.ok) saved++;
      })
    );

    setAddedCount(saved);
    setPhase("success");
  }

  // ─── Grouped items for review ─────────────────────────────────────────────

  const grouped = {
    high:   items.filter((i) => i.confidence === "high"),
    medium: items.filter((i) => i.confidence === "medium"),
    low:    items.filter((i) => i.confidence === "low"),
  };

  const selectedCount = items.filter((i) => i.selected).length;

  const sectionConfig: { key: Confidence; label: string; description: string; color: string }[] = [
    { key: "high",   label: "All good",              description: "Identified confidently",      color: "text-cubby-green" },
    { key: "medium", label: "Quick check",            description: "Worth a glance",              color: "text-amber-600" },
    { key: "low",    label: "Couldn't identify",      description: "Tap × to remove any mistakes",color: "text-cubby-urgent" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  if (phase === "success") {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6">
        <div className="bg-cubby-cream rounded-card p-8 w-full max-w-sm text-center space-y-5 animate-spring-pop">
          <div className="w-16 h-16 bg-cubby-lime rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-cubby-green" strokeWidth={3} />
          </div>
          <div>
            <p className="font-black text-cubby-charcoal text-lg">{addedCount} items added!</p>
            <p className="text-cubby-taupe text-sm mt-1">Your Cubby is looking fuller 🧡</p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => { setPhase("capture"); setItems([]); setPreviewSrc(null); }}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
            >
              Scan another receipt
            </button>
            <Link
              href="/pantry"
              className="block w-full bg-cubby-lime text-cubby-green py-3.5 rounded-2xl font-black text-sm text-center active:scale-[0.97] transition-transform"
            >
              View my kitchen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-cubby-stone">
        <PageHeader title="Scan receipt" backHref="/log" />
        <div className="px-4 pt-12 text-center space-y-4">
          <p className="text-4xl">🧾</p>
          <p className="font-black text-cubby-charcoal text-lg">Couldn&apos;t read that one</p>
          <p className="text-cubby-taupe text-sm">
            Try again in better light with the full receipt flat and in frame.
          </p>
          {previewSrc && (
            <img src={previewSrc} alt="Receipt preview" className="w-full max-w-xs mx-auto rounded-2xl opacity-60" />
          )}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => { setPhase("capture"); setPreviewSrc(null); startCamera(); }}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
            <Link
              href="/log/type"
              className="block bg-cubby-cream text-cubby-charcoal py-3.5 rounded-2xl font-black text-sm text-center"
            >
              Type it in instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Scan receipt" backHref="/log" />

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Capture phase ── */}
      {phase === "capture" && (
        <div className="px-4 space-y-4">
          {!cameraActive ? (
            <div className="space-y-3">
              <button
                onClick={startCamera}
                className="w-full bg-cubby-green text-white py-5 rounded-card flex items-center justify-center gap-3 font-black text-base active:scale-[0.97] transition-transform"
              >
                <Camera className="w-6 h-6" />
                Open camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-cubby-cream text-cubby-charcoal py-4 rounded-card flex items-center justify-center gap-3 font-black text-sm active:scale-[0.97] transition-transform"
              >
                <Upload className="w-5 h-5" />
                Upload from photos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-card overflow-hidden bg-black aspect-[3/4] max-h-[60vh]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs font-black bg-black/50 px-3 py-1.5 rounded-full">
                  Keep receipt flat and fully in frame
                </p>
              </div>
              <button
                onClick={capturePhoto}
                className="w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Camera className="w-5 h-5" /> Take photo
              </button>
              <button
                onClick={stopCamera}
                className="w-full text-cubby-taupe text-sm font-semibold py-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Processing phase ── */}
      {phase === "processing" && (
        <div className="px-4 pt-16 text-center space-y-4">
          {previewSrc && (
            <img src={previewSrc} alt="Receipt" className="w-full max-w-xs mx-auto rounded-2xl opacity-70" />
          )}
          <div className="w-10 h-10 border-4 border-cubby-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-black text-cubby-charcoal">Reading your receipt…</p>
          <p className="text-cubby-taupe text-sm">This takes about 10 seconds</p>
        </div>
      )}

      {/* ── Review phase ── */}
      {phase === "review" && (
        <div className="px-4 pb-32 space-y-3">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider pt-1">
            Found {items.length} items — {selectedCount} selected
          </p>

          {sectionConfig.map(({ key, label, description, color }) => {
            const group = grouped[key];
            if (group.length === 0) return null;
            const expanded = expandedSections[key];

            return (
              <div key={key} className="bg-cubby-cream rounded-card overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full px-4 py-3.5 flex items-center justify-between"
                >
                  <div>
                    <span className={cn("font-black text-sm", color)}>{label}</span>
                    <span className="text-cubby-taupe text-xs ml-2">({group.length})</span>
                    <p className="text-xs text-cubby-taupe mt-0.5">{description}</p>
                  </div>
                  {expanded
                    ? <ChevronUp className="w-4 h-4 text-cubby-taupe" />
                    : <ChevronDown className="w-4 h-4 text-cubby-taupe" />
                  }
                </button>

                {/* Items */}
                {expanded && (
                  <div className="divide-y divide-cubby-stone">
                    {group.map((item) => (
                      <div key={item.id} className={cn("px-4 py-3 space-y-2", !item.selected && "opacity-50")}>
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => updateItem(item.id, { selected: !item.selected })}
                            className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                              item.selected
                                ? "bg-cubby-green border-cubby-green"
                                : "border-cubby-taupe/50"
                            )}
                          >
                            {item.selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </button>

                          {/* Name */}
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                            className="flex-1 font-black text-sm text-cubby-charcoal bg-transparent focus:outline-none border-b border-transparent focus:border-cubby-green"
                          />

                          {/* Remove */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-cubby-taupe/60 hover:text-cubby-urgent transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Storage location chips */}
                        <div className="flex gap-1.5 flex-wrap pl-8">
                          {STORAGE_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => updateItem(item.id, { location: opt.id })}
                              className={cn(
                                "text-xs px-2.5 py-1 rounded-full font-black border transition-all",
                                item.location === opt.id
                                  ? "bg-cubby-green border-cubby-green text-white"
                                  : "border-cubby-stone text-cubby-taupe bg-cubby-stone"
                              )}
                            >
                              {opt.emoji} {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky save bar ── */}
      {phase === "review" && (
        <div className="fixed left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pb-4 pt-3 border-t border-black/5 z-40" style={{ bottom: "var(--bottom-nav-height, 80px)" }}>
          <button
            onClick={handleSave}
            disabled={selectedCount === 0}
            className={cn(
              "w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base",
              "flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
              selectedCount === 0 && "opacity-40"
            )}
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            Add {selectedCount} item{selectedCount !== 1 ? "s" : ""} to Cubby
          </button>
        </div>
      )}

      {/* ── Saving overlay ── */}
      {phase === "saving" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-cubby-cream rounded-card px-8 py-6 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-cubby-green border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-black text-cubby-charcoal">Saving items…</p>
          </div>
        </div>
      )}
    </div>
  );
}
