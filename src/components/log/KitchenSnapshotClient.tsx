"use client";

/**
 * KitchenSnapshotClient
 * Used by /log/snapshot
 *
 * Flow: take up to 5 photos of different parts of your kitchen
 *       → send each to Claude Vision (entryType: "snapshot")
 *       → merge all extracted items → review → batch save to inventory
 *
 * Phases: "capture" | "processing" | "review" | "saving" | "success" | "error"
 */

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

type Phase = "capture" | "processing" | "review" | "saving" | "success" | "error";
type StorageLocation = "FRIDGE" | "FREEZER" | "PANTRY" | "COUNTER" | "CUPBOARD";
type Confidence = "high" | "medium" | "low";

interface SnapshotItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  location: StorageLocation;
  confidence: Confidence;
  selected: boolean;
  sourcePhoto: number; // which photo index it came from
}

interface CapturedPhoto {
  dataUrl: string;
  label: string; // e.g. "Fridge", "Cupboard", "Counter"
}

const PHOTO_LABELS = ["Fridge", "Cupboard", "Counter", "Freezer", "Pantry"];

const STORAGE_OPTIONS: { id: StorageLocation; label: string; emoji: string }[] = [
  { id: "FRIDGE",   label: "Fridge",   emoji: "🧊" },
  { id: "FREEZER",  label: "Freezer",  emoji: "❄️" },
  { id: "PANTRY",   label: "Pantry",   emoji: "🏪" },
  { id: "COUNTER",  label: "Counter",  emoji: "🍌" },
  { id: "CUPBOARD", label: "Cupboard", emoji: "📦" },
];

function inferLocation(storageLocation?: string): StorageLocation {
  if (!storageLocation) return "PANTRY";
  const s = storageLocation.toLowerCase();
  if (s.includes("fridge") || s.includes("refrigerator")) return "FRIDGE";
  if (s.includes("freezer")) return "FREEZER";
  if (s.includes("counter")) return "COUNTER";
  if (s.includes("cupboard") || s.includes("cabinet")) return "CUPBOARD";
  return "PANTRY";
}

const sectionConfig: { key: Confidence; label: string; description: string; color: string }[] = [
  { key: "high",   label: "Identified",        description: "High confidence",        color: "text-cubby-green" },
  { key: "medium", label: "Worth checking",     description: "Tap to review",         color: "text-amber-600" },
  { key: "low",    label: "Not sure about these", description: "Remove if wrong",     color: "text-cubby-urgent" },
];

export function KitchenSnapshotClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [items, setItems] = useState<SnapshotItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<Confidence, boolean>>({
    high: false, medium: true, low: true,
  });
  const [addedCount, setAddedCount] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

  const MAX_PHOTOS = 5;

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
      // Camera unavailable — file upload fallback available
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
    const dataUrl = canvas.toDataURL("image/jpeg", 0.80);
    const label = PHOTO_LABELS[photos.length] ?? `Photo ${photos.length + 1}`;
    setPhotos((prev) => [...prev, { dataUrl, label }]);
    stopCamera();
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── File upload fallback ─────────────────────────────────────────────────

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - photos.length;
    files.slice(0, remaining).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const label = PHOTO_LABELS[photos.length + i] ?? `Photo ${photos.length + i + 1}`;
        setPhotos((prev) => [...prev, { dataUrl, label }]);
      };
      reader.readAsDataURL(file);
    });
    // reset so same file can be re-selected
    e.target.value = "";
  }

  // ─── Process all photos ───────────────────────────────────────────────────

  async function processPhotos() {
    if (photos.length === 0) return;
    setPhase("processing");
    const allItems: SnapshotItem[] = [];

    for (let i = 0; i < photos.length; i++) {
      setProcessingStatus(`Scanning photo ${i + 1} of ${photos.length}…`);
      try {
        const base64 = photos[i].dataUrl.split(",")[1];
        const res = await fetch("/api/log/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, entryType: "snapshot" }),
        });
        if (!res.ok) continue;
        const data = await res.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extracted = Array.isArray(data.extracted) ? data.extracted : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extracted.forEach((item: any, j: number) => {
          allItems.push({
            id: `snap-${i}-${j}`,
            name: item.name ?? "Unknown",
            quantity: item.quantity ?? 1,
            unit: item.unit,
            category: item.category ?? "other",
            location: inferLocation(item.storageLocation),
            confidence: item.confidence ?? "medium",
            selected: true,
            sourcePhoto: i,
          });
        });
      } catch {
        // skip failed photo, continue with others
      }
    }

    // Deduplicate by name (case-insensitive)
    const seen = new Set<string>();
    const deduped = allItems.filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (deduped.length === 0) {
      setPhase("error");
      return;
    }

    setItems(deduped);
    setPhase("review");
  }

  // ─── Review helpers ───────────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<SnapshotItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function toggleSection(conf: Confidence) {
    setExpandedSections((s) => ({ ...s, [conf]: !s[conf] }));
  }

  const grouped = {
    high:   items.filter((i) => i.confidence === "high"),
    medium: items.filter((i) => i.confidence === "medium"),
    low:    items.filter((i) => i.confidence === "low"),
  };

  const selectedCount = items.filter((i) => i.selected).length;

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
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            location: item.location,
            entryMethod: "SNAPSHOT",
          }),
        });
        if (res.ok) saved++;
      })
    );

    setAddedCount(saved);
    setPhase("success");
  }

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
            <p className="text-cubby-taupe text-sm mt-1">Your kitchen is in Cubby 🧡</p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => { setPhase("capture"); setPhotos([]); setItems([]); }}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
            >
              Scan another area
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
        <PageHeader title="Kitchen snapshot" backHref="/log" />
        <div className="px-4 pt-12 text-center space-y-4">
          <p className="text-4xl">📷</p>
          <p className="font-black text-cubby-charcoal text-lg">Couldn&apos;t spot anything</p>
          <p className="text-cubby-taupe text-sm">Try photos in brighter light, or get closer to the shelves.</p>
          <button
            onClick={() => { setPhase("capture"); setPhotos([]); }}
            className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Kitchen snapshot" backHref="/log" />
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ── Capture phase ── */}
      {phase === "capture" && (
        <div className="px-4 space-y-4 pb-10">
          <p className="text-cubby-taupe text-sm font-semibold">
            Take up to {MAX_PHOTOS} photos of different parts of your kitchen — fridge, cupboards, counter, anywhere food lives.
          </p>

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden aspect-square bg-black">
                  <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                    <p className="text-white text-[10px] font-black truncate">{photo.label}</p>
                  </div>
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}

              {/* Add more button */}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={startCamera}
                  className="aspect-square rounded-2xl border-2 border-dashed border-cubby-taupe/30 flex flex-col items-center justify-center gap-1 text-cubby-taupe active:scale-95 transition-transform"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-[10px] font-black">Add photo</span>
                </button>
              )}
            </div>
          )}

          {/* Camera live view */}
          {cameraActive && (
            <div className="space-y-3">
              <div className="relative rounded-card overflow-hidden bg-black aspect-[4/3] max-h-[50vh]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs font-black bg-black/50 px-3 py-1.5 rounded-full whitespace-nowrap">
                  {PHOTO_LABELS[photos.length] ?? "Another area"}
                </p>
              </div>
              <button
                onClick={capturePhoto}
                className="w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Camera className="w-5 h-5" /> Take photo
              </button>
              <button onClick={stopCamera} className="w-full text-cubby-taupe text-sm font-semibold py-2">
                Cancel
              </button>
            </div>
          )}

          {/* Initial state — no photos yet */}
          {photos.length === 0 && !cameraActive && (
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
                Upload from photos
              </button>
            </div>
          )}

          {/* Upload more / scan */}
          {photos.length > 0 && !cameraActive && (
            <div className="space-y-3">
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-cubby-cream text-cubby-charcoal py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                >
                  <Plus className="w-4 h-4" /> Upload more photos
                </button>
              )}

              <button
                onClick={processPhotos}
                className="w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Check className="w-5 h-5" strokeWidth={3} />
                Scan {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}

          {/* Tips */}
          <div className="bg-cubby-cream rounded-card px-4 py-4 space-y-2">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Tips for best results</p>
            <ul className="space-y-1.5 text-sm text-cubby-taupe">
              <li>📸 Good light and close-up shots work best</li>
              <li>🧊 Open your fridge for a clear view</li>
              <li>📦 Get the front of cupboard shelves</li>
              <li>🔢 Up to {MAX_PHOTOS} photos per scan</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Processing phase ── */}
      {phase === "processing" && (
        <div className="px-4 pt-16 text-center space-y-6">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {photos.slice(0, 3).map((p, i) => (
              <img key={i} src={p.dataUrl} alt={p.label} className="rounded-2xl aspect-square object-cover opacity-60" />
            ))}
          </div>
          <div className="w-10 h-10 border-4 border-cubby-green border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <p className="font-black text-cubby-charcoal">{processingStatus || "Scanning your kitchen…"}</p>
            <p className="text-cubby-taupe text-sm mt-1">This takes about 10–15 seconds</p>
          </div>
        </div>
      )}

      {/* ── Review phase ── */}
      {phase === "review" && (
        <div className="px-4 pb-32 space-y-3">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider pt-1">
            Found {items.length} items across {photos.length} photo{photos.length !== 1 ? "s" : ""} — {selectedCount} selected
          </p>

          {sectionConfig.map(({ key, label, description, color }) => {
            const group = grouped[key];
            if (group.length === 0) return null;
            const expanded = expandedSections[key];

            return (
              <div key={key} className="bg-cubby-cream rounded-card overflow-hidden">
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
                    : <ChevronDown className="w-4 h-4 text-cubby-taupe" />}
                </button>

                {expanded && (
                  <div className="divide-y divide-cubby-stone">
                    {group.map((item) => (
                      <div key={item.id} className={cn("px-4 py-3 space-y-2", !item.selected && "opacity-50")}>
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => updateItem(item.id, { selected: !item.selected })}
                            className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                              item.selected ? "bg-cubby-green border-cubby-green" : "border-cubby-taupe/50"
                            )}
                          >
                            {item.selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </button>
                          <span className="flex-1 font-black text-sm text-cubby-charcoal leading-tight">{item.name}</span>
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

          {/* Sticky save bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pb-6 pt-3 border-t border-black/5">
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
        </div>
      )}

      {/* Saving overlay */}
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
