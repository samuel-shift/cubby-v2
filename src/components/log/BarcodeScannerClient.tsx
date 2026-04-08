"use client";

/**
 * BarcodeScannerClient
 * Used by /log/barcode
 *
 * Flow: camera live view → BarcodeDetector API → /api/barcode/[code] lookup
 *       → review/confirm screen → POST /api/inventory
 *
 * Phases: "scanning" | "looking_up" | "review" | "not_found" | "error" | "success"
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScanLine, Zap, Check, RefreshCw, KeyboardIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

type Phase = "scanning" | "looking_up" | "review" | "not_found" | "error" | "success";
type StorageLocation = "FRIDGE" | "FREEZER" | "PANTRY" | "COUNTER" | "CUPBOARD";

interface ProductData {
  name: string;
  brand?: string;
  quantity: number;
  unit?: string;
  category: string;
  barcode: string;
}

const STORAGE_OPTIONS: { id: StorageLocation; label: string; emoji: string }[] = [
  { id: "FRIDGE",   label: "Fridge",   emoji: "🧊" },
  { id: "FREEZER",  label: "Freezer",  emoji: "❄️" },
  { id: "PANTRY",   label: "Pantry",   emoji: "🏪" },
  { id: "COUNTER",  label: "Counter",  emoji: "🍌" },
  { id: "CUPBOARD", label: "Cupboard", emoji: "📦" },
];

export function BarcodeScannerClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("scanning");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [location, setLocation] = useState<StorageLocation>("FRIDGE");
  const [qty, setQty] = useState(1);
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [lastAdded, setLastAdded] = useState("");

  // ─── Camera setup ─────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for torch
      const track = stream.getVideoTracks()[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caps = track.getCapabilities?.() as any;
      if (caps?.torch) setHasTorch(true);

      // Init BarcodeDetector
      if ("BarcodeDetector" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BD = (window as any).BarcodeDetector;
        detectorRef.current = new BD({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        scanLoop();
      } else {
        // BarcodeDetector not supported — go straight to manual
        setPhase("not_found");
      }
    } catch {
      setCameraError(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ─── Scan loop ────────────────────────────────────────────────────────────

  const scanLoop = useCallback(() => {
    if (!videoRef.current || !detectorRef.current || scannedRef.current) return;

    const detect = async () => {
      if (scannedRef.current) return;
      try {
        const barcodes = await detectorRef.current!.detect(videoRef.current!);
        if (barcodes.length > 0) {
          scannedRef.current = true;
          stopCamera();
          await lookupBarcode(barcodes[0].rawValue);
          return;
        }
      } catch {
        // continue scanning
      }
      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);
  }, [stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Barcode lookup ───────────────────────────────────────────────────────

  async function lookupBarcode(code: string) {
    setPhase("looking_up");
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`);
      if (res.status === 404) {
        setPhase("not_found");
        return;
      }
      if (!res.ok) throw new Error("lookup failed");
      const data = await res.json();
      setProduct(data);
      setPhase("review");
    } catch {
      setPhase("error");
    }
  }

  // ─── Torch toggle ─────────────────────────────────────────────────────────

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
    setTorchOn(next);
  }

  // ─── Reset scanner ────────────────────────────────────────────────────────

  function resetScanner() {
    scannedRef.current = false;
    setProduct(null);
    setLocation("FRIDGE");
    setQty(1);
    setExpiryDate("");
    setPhase("scanning");
    startCamera();
  }

  // ─── Add to inventory ─────────────────────────────────────────────────────

  async function handleAdd() {
    if (!product) return;
    setSubmitting(true);
    try {
      const payload = {
        name: product.name,
        brand: product.brand,
        quantity: qty,
        unit: product.unit,
        category: product.category,
        location,
        entryMethod: "BARCODE",
        barcode: product.barcode,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      };

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to add");
      setLastAdded(product.name);
      setPhase("success");
    } catch {
      alert("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // Success
  if (phase === "success") {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6">
        <div className="bg-cubby-cream rounded-card p-8 w-full max-w-sm text-center space-y-5 animate-spring-pop">
          <div className="w-16 h-16 bg-cubby-lime rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-cubby-green" strokeWidth={3} />
          </div>
          <div>
            <p className="font-black text-cubby-charcoal text-lg">{lastAdded} added!</p>
            <p className="text-cubby-taupe text-sm mt-1">It&apos;s in your Cubby 🧡</p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={resetScanner}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
            >
              Scan another
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

  // Camera error fallback
  if (cameraError) {
    return (
      <div className="min-h-screen bg-cubby-stone">
        <PageHeader title="Scan barcode" backHref="/log" />
        <div className="px-4 pt-16 text-center space-y-4">
          <p className="text-4xl">📷</p>
          <p className="font-black text-cubby-charcoal text-lg">Camera not available</p>
          <p className="text-cubby-taupe text-sm">Allow camera access or type the item in manually.</p>
          <Link
            href="/log/type"
            className="inline-flex items-center gap-2 bg-cubby-green text-white px-6 py-3.5 rounded-2xl font-black text-sm mt-4"
          >
            <KeyboardIcon className="w-4 h-4" />
            Type it in instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Scan barcode" backHref="/log" />

      {/* ── Scanning phase — live camera ── */}
      {(phase === "scanning" || phase === "looking_up") && (
        <div className="relative">
          {/* Video */}
          <div className="relative mx-4 mt-2 rounded-card overflow-hidden bg-black aspect-[3/4] max-h-[55vh]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Scan target overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-56 h-36">
                {/* Corner markers */}
                {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => (
                  <div
                    key={corner}
                    className={cn(
                      "absolute w-8 h-8 border-cubby-lime",
                      corner === "top-left" && "top-0 left-0 border-t-4 border-l-4 rounded-tl-lg",
                      corner === "top-right" && "top-0 right-0 border-t-4 border-r-4 rounded-tr-lg",
                      corner === "bottom-left" && "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg",
                      corner === "bottom-right" && "bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg",
                    )}
                  />
                ))}
                {/* Scan line */}
                {phase === "scanning" && (
                  <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-cubby-lime/70 animate-pulse" />
                )}
              </div>
            </div>

            {/* Looking up overlay */}
            {phase === "looking_up" && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center text-white space-y-2">
                  <div className="w-10 h-10 border-4 border-cubby-lime border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-black text-sm">Looking it up…</p>
                </div>
              </div>
            )}

            {/* Torch button */}
            {hasTorch && phase === "scanning" && (
              <button
                onClick={toggleTorch}
                className={cn(
                  "absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center",
                  torchOn ? "bg-cubby-lime" : "bg-white/20 backdrop-blur-sm"
                )}
              >
                <Zap className={cn("w-5 h-5", torchOn ? "text-cubby-green" : "text-white")} />
              </button>
            )}
          </div>

          <p className="text-center text-cubby-taupe text-sm font-semibold mt-4">
            Point camera at a barcode
          </p>

          {/* Manual fallback */}
          <div className="px-4 mt-4">
            <Link
              href="/log/type"
              className="flex items-center justify-center gap-2 bg-cubby-cream rounded-2xl px-4 py-3 text-cubby-charcoal font-black text-sm active:scale-[0.97] transition-transform"
            >
              <KeyboardIcon className="w-4 h-4" />
              Type it in instead
            </Link>
          </div>
        </div>
      )}

      {/* ── Not found phase ── */}
      {phase === "not_found" && (
        <div className="px-4 pt-8 text-center space-y-4">
          <p className="text-4xl">🔍</p>
          <p className="font-black text-cubby-charcoal text-lg">Product not found</p>
          <p className="text-cubby-taupe text-sm">We couldn&apos;t match that barcode. Try typing it in instead.</p>
          <div className="space-y-3 pt-2">
            <button
              onClick={resetScanner}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <RefreshCw className="w-4 h-4" /> Scan again
            </button>
            <Link
              href="/log/type"
              className="flex items-center justify-center gap-2 bg-cubby-cream rounded-2xl px-4 py-3.5 text-cubby-charcoal font-black text-sm active:scale-[0.97] transition-transform"
            >
              <KeyboardIcon className="w-4 h-4" /> Type it in
            </Link>
          </div>
        </div>
      )}

      {/* ── Error phase ── */}
      {phase === "error" && (
        <div className="px-4 pt-8 text-center space-y-4">
          <p className="text-4xl">⚠️</p>
          <p className="font-black text-cubby-charcoal text-lg">Something went wrong</p>
          <p className="text-cubby-taupe text-sm">Couldn&apos;t look that up. Check your connection and try again.</p>
          <button
            onClick={resetScanner}
            className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      )}

      {/* ── Review phase — confirm & add ── */}
      {phase === "review" && product && (
        <div className="px-4 space-y-4 pb-10">
          {/* Product card */}
          <div className="bg-cubby-cream rounded-card p-5 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black text-cubby-charcoal text-lg leading-tight">{product.name}</p>
                {product.brand && (
                  <p className="text-cubby-taupe text-sm font-semibold mt-0.5">{product.brand}</p>
                )}
              </div>
              <span className="bg-cubby-lime text-cubby-green text-xs font-black px-3 py-1 rounded-full shrink-0">
                Found ✓
              </span>
            </div>
            <p className="text-cubby-taupe text-xs mt-2 capitalize">{product.category}</p>
          </div>

          {/* Storage location */}
          <div className="bg-cubby-cream rounded-card p-4 space-y-3">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Where does it live?</p>
            <div className="flex gap-2 flex-wrap">
              {STORAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLocation(opt.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 transition-all font-black text-sm",
                    location === opt.id
                      ? "bg-cubby-green border-cubby-green text-white"
                      : "bg-cubby-stone border-transparent text-cubby-charcoal active:scale-95"
                  )}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-cubby-cream rounded-card p-4 space-y-3">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Quantity</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-11 h-11 rounded-2xl bg-cubby-stone flex items-center justify-center active:scale-90 transition-transform font-black text-xl text-cubby-charcoal"
              >
                −
              </button>
              <span className="text-3xl font-black text-cubby-charcoal w-10 text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-11 h-11 rounded-2xl bg-cubby-green flex items-center justify-center active:scale-90 transition-transform font-black text-xl text-white"
              >
                +
              </button>
            </div>
          </div>

          {/* Expiry date */}
          <div className="bg-cubby-cream rounded-card p-4 space-y-2">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
              Expiry date <span className="text-cubby-taupe/50 normal-case font-semibold">(optional)</span>
            </p>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-cubby-stone rounded-xl px-4 py-3 text-cubby-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-cubby-green text-base"
            />
          </div>

          {/* Actions */}
          <button
            onClick={handleAdd}
            disabled={submitting}
            className={cn(
              "w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base",
              "flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
              submitting && "opacity-60"
            )}
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            {submitting ? "Adding…" : "Add to Cubby"}
          </button>

          <button
            onClick={resetScanner}
            className="w-full bg-cubby-cream text-cubby-charcoal py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <ScanLine className="w-4 h-4" /> Scan another
          </button>
        </div>
      )}
    </div>
  );
}
