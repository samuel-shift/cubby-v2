"use client";

/**
 * KitchenSnapshotClient
 * Used by /log/snapshot
 *
 * Ported from cubby-v1's proven two-page flow, adapted into a single-page component.
 *
 * Flow:
 *   1. Live camera viewfinder (rear camera, getUserMedia) + gallery fallback
 *   2. User captures one or more photos (max 5) with preview after each
 *   3. All photos sent in one request to /api/inventory/snapshot
 *   4. Review detected items (grouped by confidence threshold)
 *   5. Batch save to /api/inventory
 *
 * Key V1 features preserved:
 *   - Image compression (max 1024px, JPEG 80%)
 *   - All photos sent at once (not one-by-one)
 *   - Numeric confidence (0.0–1.0) with 0.75 threshold
 *   - Vision error codes (TOO_DARK, NO_FOOD, BLURRY)
 *   - Torch/flash toggle
 *   - productName/brand fields (not generic "name")
 *
 * Phases: "camera" | "preview" | "processing" | "review" | "saving" | "success" | "error"
 */

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  Plus,
  RefreshCw,
  X,
  Minus,
  Images,
  Zap,
  ZapOff,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "camera" | "preview" | "processing" | "review" | "saving" | "success" | "error";
type StorageLocation = "FRIDGE" | "FREEZER" | "PANTRY" | "OTHER";

interface CapturedPhoto {
  dataUrl: string; // full data URL — used for display
  base64: string;  // pure base64 (no prefix) — sent to the API
  mimeType: "image/jpeg";
}

interface DetectedItem {
  productName: string;
  brand: string | null;
  category: string;
  storageLocation: StorageLocation;
  quantity: number;
  unit: string | null;
  confidence: number; // 0.0 – 1.0
  estimatedExpiryDays: number | null; // AI-estimated shelf life in days
  included: boolean;  // user toggle for save
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PHOTOS = 5;
const MAX_SIDE_PX = 1024;
const JPEG_QUALITY = 0.8;

const PROCESSING_MESSAGES = ["Identifying your food...", "Looking for items...", "Almost there..."];

const VISION_ERROR_MESSAGES: Record<string, string> = {
  TOO_DARK: "That photo's a bit dark — try turning on the flash or better lighting.",
  NO_FOOD: "We couldn't spot any food in that photo — try a different angle.",
  BLURRY: "The photo's a bit blurry — hold still and try again.",
  default: "Something went wrong processing your photos — please try again.",
};

const STORAGE_OPTIONS: { id: StorageLocation; label: string; emoji: string }[] = [
  { id: "FRIDGE",  label: "Fridge",  emoji: "🧊" },
  { id: "FREEZER", label: "Freezer", emoji: "❄️" },
  { id: "PANTRY",  label: "Pantry",  emoji: "🏪" },
  { id: "OTHER",   label: "Other",   emoji: "📦" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compress a video frame or image onto a canvas, return dataUrl + base64. */
function compressToCanvas(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
): { dataUrl: string; base64: string } {
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1];
  return { dataUrl, base64 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KitchenSnapshotClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingPhotoRef = useRef<CapturedPhoto | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [addedCount, setAddedCount] = useState(0);

  // Camera state
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Processing state
  const [processingMsg, setProcessingMsg] = useState(PROCESSING_MESSAGES[0]);
  const [errorMessage, setErrorMessage] = useState("");

  // Review state

  // ─── Camera initialisation ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // On iOS Safari, onCanPlay may not fire if the video auto-plays
          // before React attaches the handler. Use loadedmetadata + play as fallback.
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setCameraReady(true);
            }).catch(() => {});
          };
          // Also handle already-playing case
          if (videoRef.current.readyState >= 2) {
            setCameraReady(true);
          }
        }

        // Detect torch support
        const track = stream.getVideoTracks()[0];
        try {
          const caps = track.getCapabilities() as Record<string, unknown>;
          if (caps.torch) setTorchSupported(true);
        } catch {
          // getCapabilities not supported on all browsers
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera access denied. Allow camera access and try again, or tap the gallery icon to upload a photo."
          );
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Re-attach stream when returning to camera phase
  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      setCameraReady(false);
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().then(() => {
          setCameraReady(true);
        }).catch(() => {});
      };
      // Already playing
      if (videoRef.current.readyState >= 2) {
        setCameraReady(true);
      }
    }
  }, [phase]);

  // Rotate processing message
  useEffect(() => {
    if (phase !== "processing") return;
    let idx = 0;
    const id = setInterval(() => {
      idx = (idx + 1) % PROCESSING_MESSAGES.length;
      setProcessingMsg(PROCESSING_MESSAGES[idx]);
    }, 2200);
    return () => clearInterval(id);
  }, [phase]);

  // ─── Torch toggle ─────────────────────────────────────────────────────────

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn((v) => !v);
    } catch {
      // Torch not supported on this hardware
    }
  }, [torchOn]);

  // ─── Capture frame from live viewfinder ───────────────────────────────────

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    const { dataUrl, base64 } = compressToCanvas(
      canvas, video, video.videoWidth, video.videoHeight
    );

    const photo: CapturedPhoto = { dataUrl, base64, mimeType: "image/jpeg" };
    pendingPhotoRef.current = photo;
    setPreviewDataUrl(dataUrl);
    setPhase("preview");
  }, [cameraReady]);

  // ─── Gallery / file upload ────────────────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const canvas = canvasRef.current!;
      const { dataUrl, base64 } = compressToCanvas(
        canvas, img, img.naturalWidth, img.naturalHeight
      );
      URL.revokeObjectURL(objectUrl);

      const photo: CapturedPhoto = { dataUrl, base64, mimeType: "image/jpeg" };
      pendingPhotoRef.current = photo;
      setPreviewDataUrl(dataUrl);
      setPhase("preview");
    };

    img.onerror = () => URL.revokeObjectURL(objectUrl);
    img.src = objectUrl;
    e.target.value = "";
  }, []);

  // ─── Preview actions ──────────────────────────────────────────────────────

  const retake = useCallback(() => {
    pendingPhotoRef.current = null;
    setPreviewDataUrl(null);
    setPhase("camera");
  }, []);

  const addAnother = useCallback(() => {
    if (!pendingPhotoRef.current) return;
    setPhotos((prev) => [...prev, pendingPhotoRef.current!]);
    pendingPhotoRef.current = null;
    setPreviewDataUrl(null);
    setPhase("camera");
  }, []);

  const confirmAndProcess = useCallback(() => {
    if (!pendingPhotoRef.current) return;
    const allPhotos = [...photos, pendingPhotoRef.current];
    pendingPhotoRef.current = null;
    setPreviewDataUrl(null);
    setPhotos(allPhotos);
    processPhotos(allPhotos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // Process already-confirmed photos (Done button)
  const handleProcessNow = useCallback(() => {
    processPhotos(photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // ─── Vision API call (all photos at once, like V1) ────────────────────────

  async function processPhotos(photosToProcess: CapturedPhoto[]) {
    setPhase("processing");
    setProcessingMsg(PROCESSING_MESSAGES[0]);

    try {
      const res = await fetch("/api/inventory/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: photosToProcess.map((p) => ({
            data: p.base64,
            mimeType: p.mimeType,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Processing failed");
      }

      // Handle vision-level errors (dark, no food, blurry)
      if (data.error) {
        setErrorMessage(VISION_ERROR_MESSAGES[data.error] ?? VISION_ERROR_MESSAGES.default);
        setPhase("error");
        return;
      }

      const detected: DetectedItem[] = (data.items ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => ({
          productName: item.productName ?? "Unknown",
          brand: item.brand ?? null,
          category: item.category ?? "Other",
          storageLocation: item.storageLocation ?? "PANTRY",
          quantity: item.quantity ?? 1,
          unit: item.unit ?? null,
          confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
          estimatedExpiryDays: typeof item.estimatedExpiryDays === "number" ? item.estimatedExpiryDays : null,
          included: true,
        })
      );

      if (detected.length === 0) {
        setErrorMessage(VISION_ERROR_MESSAGES.NO_FOOD);
        setPhase("error");
        return;
      }

      setItems(detected);
      setPhase("review");
    } catch {
      setErrorMessage(VISION_ERROR_MESSAGES.default);
      setPhase("error");
    }
  }

  // ─── Review helpers ───────────────────────────────────────────────────────

  function toggleItem(index: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, included: !item.included } : item))
    );
  }

  function updateField(index: number, field: string, value: unknown) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const includedCount = items.filter((i) => i.included).length;

  // ─── Save to inventory ────────────────────────────────────────────────────

  async function handleSave() {
    const toSave = items.filter((i) => i.included);
    if (toSave.length === 0) return;
    setPhase("saving");

    let saved = 0;
    await Promise.allSettled(
      toSave.map(async (item) => {
        // Calculate expiry date from estimated days
        let expiryDate: string | undefined;
        if (item.estimatedExpiryDays && item.estimatedExpiryDays > 0) {
          const d = new Date();
          d.setDate(d.getDate() + item.estimatedExpiryDays);
          expiryDate = d.toISOString();
        }

        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            location: item.storageLocation === "OTHER" ? "PANTRY" : item.storageLocation,
            entryMethod: "SNAPSHOT",
            ...(expiryDate && { expiryDate }),
          }),
        });
        if (res.ok) saved++;
      })
    );

    setAddedCount(saved);
    setPhase("success");
  }

  // ─── Render: Success ──────────────────────────────────────────────────────

  if (phase === "success") {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6">
        <div className="bg-cubby-cream rounded-card p-8 w-full max-w-sm text-center space-y-5 animate-spring-pop">
          <div className="w-16 h-16 bg-cubby-lime rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-cubby-green" strokeWidth={3} />
          </div>
          <div>
            <p className="font-black text-cubby-charcoal text-lg">{addedCount} items added!</p>
            <p className="text-cubby-taupe text-sm mt-1">Your kitchen is in Cubby</p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setPhase("camera");
                setPhotos([]);
                setItems([]);
                setCameraReady(false);
              }}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
            >
              <Camera className="w-4 h-4 inline mr-2" />
              Take another photo
            </button>
            <Link
              href="/recipes?tab=pantry"
              className="block w-full bg-cubby-lime text-cubby-green py-3.5 rounded-2xl font-black text-sm text-center active:scale-[0.97] transition-transform"
            >
              View my kitchen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Error ────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-cubby-stone">
        <PageHeader title="Kitchen snapshot" backHref="/log" />
        <div className="px-4 pt-12 text-center space-y-4">
          <p className="text-4xl">📷</p>
          <p className="font-black text-cubby-charcoal text-lg">Couldn't process photo</p>
          <p className="text-cubby-taupe text-sm">{errorMessage}</p>
          <button
            onClick={() => {
              setPhase("camera");
              setPhotos([]);
            }}
            className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/log/type"
            className="block text-sm text-cubby-taupe underline underline-offset-2"
          >
            Type it in instead
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render: Processing ───────────────────────────────────────────────────

  if (phase === "processing") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-black">
        {photos.length > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[photos.length - 1].dataUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-25 blur-2xl"
          />
        )}
        <div className="relative z-10 mx-8 rounded-card bg-cubby-cream px-8 py-10 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-cubby-green" />
          <p className="font-black text-cubby-charcoal">{processingMsg}</p>
          <p className="text-cubby-taupe text-sm mt-1">This usually takes a few seconds</p>
        </div>
      </div>
    );
  }

  // ─── Render: Preview ──────────────────────────────────────────────────────

  if (phase === "preview" && previewDataUrl) {
    return (
      <div className="relative flex min-h-screen flex-col bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewDataUrl}
          alt="Captured photo preview"
          className="absolute inset-0 h-full w-full object-contain"
        />

        {/* Photo counter */}
        {photos.length > 0 && (
          <div className="absolute left-1/2 top-14 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-black text-white backdrop-blur-sm">
            Photo {photos.length + 1} of {photos.length + 1}
          </div>
        )}

        {/* Bottom gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/90 to-transparent" />

        {/* Actions */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-28">
          <div className="flex gap-3">
            <button
              onClick={retake}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/30 py-3.5 text-sm font-black text-white backdrop-blur-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Retake
            </button>

            {photos.length < MAX_PHOTOS - 1 && (
              <button
                onClick={addAnother}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/30 py-3.5 text-sm font-black text-white backdrop-blur-sm"
              >
                <Plus className="h-4 w-4" />
                Add another
              </button>
            )}

            <button
              onClick={confirmAndProcess}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cubby-lime py-3.5 text-sm font-black text-cubby-green"
            >
              <Check className="h-4 w-4" />
              Use photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Review ───────────────────────────────────────────────────────

  if (phase === "review") {
    return (
      <div className="min-h-screen bg-cubby-stone" style={{ paddingBottom: "calc(var(--bottom-nav-height, 80px) + 80px)" }}>
        <PageHeader title="Kitchen snapshot" backHref="/log" />

        {/* Headline */}
        <div className="px-4 pb-4 flex items-center gap-4">
          {photos.length > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photos[0].dataUrl}
              alt="Kitchen snapshot"
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          )}
          <div>
            <p className="font-black text-cubby-charcoal text-lg">
              We spotted <span className="text-cubby-green">{items.length}</span> {items.length === 1 ? "item" : "items"}
            </p>
            <p className="text-xs text-cubby-taupe">
              Review below, then add them to your Cubby.
            </p>
          </div>
        </div>

        {/* Unified item list — no collapsible sections */}
        <div className="px-4 space-y-3">
          {items.map((item, i) => (
            <div
              key={item.productName + i}
              className={cn(
                "cubby-card p-4 space-y-3 transition-opacity",
                !item.included && "opacity-40"
              )}
            >
              {/* Row 1: Checkbox + Name + Delete */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleItem(i)}
                  className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    item.included ? "bg-cubby-green border-cubby-green" : "border-cubby-taupe/40"
                  )}
                >
                  {item.included && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-cubby-charcoal leading-tight">{item.productName}</p>
                  {item.brand && (
                    <p className="text-xs text-cubby-taupe mt-0.5">{item.brand}</p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(i)}
                  className="text-cubby-taupe/40 active:text-cubby-urgent transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {item.included && (
                <>
                  {/* Row 2: Category badge + Quantity stepper */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="bg-cubby-stone rounded-full px-3 py-1 text-xs font-black text-cubby-taupe">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5 bg-cubby-stone rounded-xl px-3 py-1.5">
                      <button
                        onClick={() => updateField(i, "quantity", Math.max(0.5, item.quantity - 1))}
                        className="w-7 h-7 rounded-lg bg-cubby-cream flex items-center justify-center text-cubby-charcoal active:scale-90 transition-transform"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-black text-cubby-charcoal">
                        {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}
                      </span>
                      <button
                        onClick={() => updateField(i, "quantity", item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-cubby-green flex items-center justify-center text-white active:scale-90 transition-transform"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Row 3: Storage location */}
                  <div className="flex gap-2 flex-wrap">
                    {STORAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => updateField(i, "storageLocation", opt.id)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full font-black transition-all active:scale-95",
                          item.storageLocation === opt.id
                            ? "bg-cubby-green text-white"
                            : "bg-cubby-stone text-cubby-taupe"
                        )}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Row 4: Estimated expiry */}
                  {item.estimatedExpiryDays !== null && item.estimatedExpiryDays > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-cubby-taupe">⏰</span>
                      <span className={cn(
                        "text-xs font-black",
                        item.estimatedExpiryDays <= 3 ? "text-cubby-salmon" : "text-cubby-taupe"
                      )}>
                        ~{item.estimatedExpiryDays}d shelf life
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Sticky save bar — sits above bottom nav */}
        <div
          className="fixed left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pt-3 pb-4 border-t border-black/5 z-20"
          style={{ bottom: "var(--bottom-nav-height, 80px)" }}
        >
          <button
            onClick={handleSave}
            disabled={includedCount === 0}
            className={cn(
              "w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base",
              "flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
              includedCount === 0 && "opacity-40"
            )}
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            Add {includedCount} item{includedCount !== 1 ? "s" : ""} to Cubby
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Saving overlay ───────────────────────────────────────────────

  if (phase === "saving") {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-cubby-cream rounded-card px-8 py-6 text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-cubby-green mx-auto" />
          <p className="font-black text-cubby-charcoal">Saving items…</p>
        </div>
      </div>
    );
  }

  // ─── Render: Camera viewfinder ────────────────────────────────────────────

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      {/* Hidden utilities */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Live video stream */}
      {!cameraError && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          onCanPlay={() => setCameraReady(true)}
        />
      )}

      {/* Camera unavailable fallback */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <Camera className="mb-4 h-12 w-12 text-white/40" />
          <p className="text-sm leading-relaxed text-white/70">{cameraError}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 rounded-2xl bg-cubby-lime px-6 py-3 text-sm font-black text-cubby-green"
          >
            Upload from gallery
          </button>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Top bar: Close · Photo count · Torch */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 pt-14">
        <Link
          href="/log"
          className="rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </Link>

        {photos.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-cubby-lime/90 px-3 py-1.5 text-xs font-black text-cubby-green">
            <Camera className="h-3.5 w-3.5" />
            {photos.length} {photos.length === 1 ? "photo" : "photos"} captured
          </div>
        )}

        {torchSupported ? (
          <button
            onClick={toggleTorch}
            className="rounded-full bg-black/40 p-2.5 backdrop-blur-sm"
            aria-label={torchOn ? "Turn off flash" : "Turn on flash"}
          >
            {torchOn ? (
              <Zap className="h-5 w-5 text-cubby-lime" />
            ) : (
              <ZapOff className="h-5 w-5 text-white" />
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Instructions */}
      <div className="absolute left-0 right-0 top-28 z-10 px-6 text-center">
        <p className="text-xl font-black text-white drop-shadow-md">Capture your kitchen</p>
        <p className="mt-1 text-sm text-white/80 drop-shadow">
          {photos.length === 0
            ? "Take a photo of your fridge, pantry, or countertop"
            : "Take another photo, or tap Done to process"}
        </p>
      </div>

      {/* Privacy note */}
      <div className="absolute bottom-52 left-0 right-0 z-10 px-6 text-center">
        <p className="text-xs text-white/40">
          Your photo is analysed and then discarded — it&apos;s never stored.
        </p>
      </div>

      {/* Bottom controls: Gallery · Shutter · Done */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-8 pb-28">
        {/* Gallery */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full bg-black/40 p-3.5 text-white backdrop-blur-sm"
          aria-label="Upload from gallery"
        >
          <Images className="h-6 w-6" />
        </button>

        {/* Shutter */}
        {!cameraError && (
          <button
            onClick={handleCapture}
            disabled={!cameraReady}
            aria-label="Take photo"
            className="h-16 w-16 rounded-full border-4 border-white bg-white/90 transition-transform active:scale-95 disabled:opacity-40"
          />
        )}

        {/* Done / spacer */}
        {photos.length > 0 ? (
          <button
            onClick={handleProcessNow}
            className="flex flex-col items-center gap-0.5 rounded-2xl bg-cubby-lime px-4 py-2.5 text-cubby-green"
          >
            <Check className="h-5 w-5" />
            <span className="text-xs font-black">Done</span>
          </button>
        ) : (
          <div className="w-14" />
        )}
      </div>
    </div>
  );
}

// ReviewItemCard removed — review UI is now inline in the review phase render
