"use client";

/**
 * WasteLogClient
 * Used by /log/waste
 *
 * Flow A — Photo: camera capture → Claude Vision identifies wasted items + cost
 *           → review → mark items as THROWN_OUT in inventory
 *
 * Flow B — Type it in: select from pantry → mark as THROWN_OUT
 *
 * Phases: "choose" | "camera" | "processing" | "review" | "saving" | "success" | "manual" | "error"
 */

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  Trash2,
  RefreshCw,
  KeyboardIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

type Phase = "choose" | "camera" | "processing" | "review" | "saving" | "success" | "manual" | "error";

interface WastedItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  estimatedCost?: number;
  selected: boolean;
  inventoryId?: string;
}

interface PantryItem {
  id: string;
  name: string;
  brand?: string;
  quantity: number;
  unit?: string;
  category: string;
}

export function WasteLogClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("choose");
  const [wastedItems, setWastedItems] = useState<WastedItem[]>([]);
  const [totalWaste, setTotalWaste] = useState<number>(0);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [selectedPantryIds, setSelectedPantryIds] = useState<Set<string>>(new Set());
  const [savedCount, setSavedCount] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // ─── Load pantry ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === "manual" || phase === "review") {
      fetch("/api/inventory")
        .then((r) => r.json())
        .then((d) => setPantryItems(d.items ?? []))
        .catch(() => {});
    }
  }, [phase]);

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
      }
    } catch {
      setPhase("error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (phase === "camera") startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [phase, startCamera, stopCamera]);

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
    processImage(dataUrl.split(",")[1]);
  }

  // ─── Vision processing ────────────────────────────────────────────────────

  async function processImage(base64: string) {
    setPhase("processing");
    try {
      const res = await fetch("/api/log/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, entryType: "waste" }),
      });
      if (!res.ok) throw new Error("Vision API error");
      const data = await res.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extracted = data.extracted as any;

      // Vision returns { items: [...], totalEstimatedWaste }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawItems: any[] = Array.isArray(extracted) ? extracted : (extracted?.items ?? []);
      const total: number = extracted?.totalEstimatedWaste ?? 0;

      const items: WastedItem[] = rawItems.map((item, i) => ({
        id: `waste-${i}`,
        name: item.name ?? "Unknown",
        quantity: item.quantity ?? 1,
        unit: item.unit,
        category: item.category ?? "other",
        estimatedCost: item.estimatedCost,
        selected: true,
      }));

      setWastedItems(items);
      setTotalWaste(total);
      setPhase("review");
    } catch {
      setPhase("error");
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<WastedItem>) {
    setWastedItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeItem(id: string) {
    setWastedItems((prev) => prev.filter((i) => i.id !== id));
  }

  function togglePantrySelect(id: string) {
    setSelectedPantryIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ─── Save: mark as THROWN_OUT ─────────────────────────────────────────────

  async function handleSave() {
    setPhase("saving");
    let count = 0;

    if (phase === "review") {
      // Match wasted items to pantry and mark THROWN_OUT
      const idsToMark: string[] = [];
      for (const item of wastedItems.filter((i) => i.selected)) {
        const match = pantryItems.find(
          (p) =>
            p.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(p.name.toLowerCase())
        );
        if (match) idsToMark.push(match.id);
      }

      await Promise.allSettled(
        idsToMark.map(async (id) => {
          const res = await fetch(`/api/inventory/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "THROWN_OUT" }),
          });
          if (res.ok) count++;
        })
      );
    } else {
      // Manual flow
      await Promise.allSettled(
        Array.from(selectedPantryIds).map(async (id) => {
          const res = await fetch(`/api/inventory/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "THROWN_OUT" }),
          });
          if (res.ok) count++;
        })
      );
    }

    setSavedCount(count);
    setPhase("success");
  }

  const filteredPantry = manualSearch.trim()
    ? pantryItems.filter((p) => p.name.toLowerCase().includes(manualSearch.toLowerCase()))
    : pantryItems;

  const selectedCount = phase === "review"
    ? wastedItems.filter((i) => i.selected).length
    : selectedPantryIds.size;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (phase === "success") {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6">
        <div className="bg-cubby-cream rounded-card p-8 w-full max-w-sm text-center space-y-5 animate-spring-pop">
          <div className="w-16 h-16 bg-cubby-salmon/20 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-cubby-salmon" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-black text-cubby-charcoal text-lg">Waste logged</p>
            <p className="text-cubby-taupe text-sm mt-1">
              {savedCount > 0
                ? `${savedCount} item${savedCount !== 1 ? "s" : ""} marked as thrown out`
                : "Items logged as waste."}
            </p>
            {totalWaste > 0 && (
              <p className="text-cubby-urgent font-black text-base mt-2">
                ~£{totalWaste.toFixed(2)} wasted
              </p>
            )}
            <p className="text-cubby-taupe text-xs mt-2">
              We&apos;ll use this to help you waste less next time 💚
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setPhase("choose");
                setWastedItems([]);
                setPreviewSrc(null);
                setSelectedPantryIds(new Set());
                setTotalWaste(0);
              }}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
            >
              Log more waste
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
        <PageHeader title="Log waste" backHref="/log" />
        <div className="px-4 pt-12 text-center space-y-4">
          <p className="text-4xl">🗑️</p>
          <p className="font-black text-cubby-charcoal text-lg">Couldn&apos;t read that</p>
          <p className="text-cubby-taupe text-sm">Try a clearer photo or select items manually.</p>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setPhase("choose")}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
            <button
              onClick={() => setPhase("manual")}
              className="w-full bg-cubby-cream text-cubby-charcoal py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
            >
              <KeyboardIcon className="w-4 h-4" /> Select from pantry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Log waste" backHref="/log" />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Choose flow ── */}
      {phase === "choose" && (
        <div className="px-4 pt-2 space-y-3">
          <p className="text-cubby-taupe text-sm font-semibold pb-1">
            Throwing something out? Log it so we can help reduce waste next time.
          </p>

          <button
            onClick={() => setPhase("camera")}
            className="w-full bg-cubby-salmon text-white py-5 rounded-card flex items-center justify-center gap-3 font-black text-base active:scale-[0.97] transition-transform"
          >
            <Camera className="w-6 h-6" />
            Photo of the waste
          </button>

          <button
            onClick={() => setPhase("manual")}
            className="w-full bg-cubby-cream text-cubby-charcoal py-4 rounded-card flex items-center justify-center gap-3 font-black text-sm active:scale-[0.97] transition-transform"
          >
            <KeyboardIcon className="w-5 h-5" />
            Pick from my pantry
          </button>

          {/* Why it matters */}
          <div className="bg-cubby-cream rounded-card px-4 py-4 mt-2">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider mb-2">Why log waste?</p>
            <p className="text-sm text-cubby-taupe leading-relaxed">
              Tracking what you bin helps Cubby spot patterns — like buying too much of something — and nudge you to buy less next time. Small wins add up 💚
            </p>
          </div>
        </div>
      )}

      {/* ── Camera phase ── */}
      {phase === "camera" && (
        <div className="px-4 space-y-3">
          <div className="relative rounded-card overflow-hidden bg-black aspect-[4/3] max-h-[55vh]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs font-black bg-black/50 px-3 py-1.5 rounded-full whitespace-nowrap">
              Point at the food you&apos;re throwing away
            </p>
          </div>
          <button
            onClick={capturePhoto}
            className="w-full bg-cubby-salmon text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Camera className="w-5 h-5" /> Take photo
          </button>
          <button
            onClick={() => setPhase("choose")}
            className="w-full text-cubby-taupe text-sm font-semibold py-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Processing ── */}
      {phase === "processing" && (
        <div className="px-4 pt-16 text-center space-y-4">
          {previewSrc && (
            <img src={previewSrc} alt="Waste" className="w-full max-w-xs mx-auto rounded-2xl opacity-70" />
          )}
          <div className="w-10 h-10 border-4 border-cubby-salmon border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-black text-cubby-charcoal">Identifying wasted items…</p>
          <p className="text-cubby-taupe text-sm">Estimating the cost too</p>
        </div>
      )}

      {/* ── Review (photo flow) ── */}
      {phase === "review" && (
        <div className="px-4 pb-32 space-y-3">
          {/* Cost summary */}
          {totalWaste > 0 && (
            <div className="bg-cubby-urgent/10 border border-cubby-urgent/20 rounded-card px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-black text-cubby-charcoal">Estimated waste value</p>
              <p className="text-lg font-black text-cubby-urgent">~£{totalWaste.toFixed(2)}</p>
            </div>
          )}

          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider pt-1">
            {wastedItems.length} item{wastedItems.length !== 1 ? "s" : ""} identified
          </p>

          <div className="bg-cubby-cream rounded-card divide-y divide-cubby-stone overflow-hidden">
            {wastedItems.map((item) => (
              <div key={item.id} className={cn("px-4 py-3 flex items-center gap-3", !item.selected && "opacity-50")}>
                <button
                  onClick={() => updateItem(item.id, { selected: !item.selected })}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                    item.selected ? "bg-cubby-salmon border-cubby-salmon" : "border-cubby-taupe/50"
                  )}
                >
                  {item.selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-cubby-charcoal">{item.name}</p>
                  {item.estimatedCost && (
                    <p className="text-xs text-cubby-taupe">~£{item.estimatedCost.toFixed(2)}</p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-cubby-taupe/60 hover:text-cubby-urgent transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Sticky save */}
          <div className="fixed bottom-0 left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pb-6 pt-3 border-t border-black/5">
            <button
              onClick={handleSave}
              disabled={selectedCount === 0}
              className={cn(
                "w-full bg-cubby-salmon text-white py-4 rounded-2xl font-black text-base",
                "flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
                selectedCount === 0 && "opacity-40"
              )}
            >
              <Trash2 className="w-5 h-5" />
              Log {selectedCount > 0 ? selectedCount : ""} as waste
            </button>
          </div>
        </div>
      )}

      {/* ── Manual: pick from pantry ── */}
      {phase === "manual" && (
        <div className="px-4 pb-32 space-y-3">
          <input
            type="text"
            placeholder="Search your pantry…"
            value={manualSearch}
            onChange={(e) => setManualSearch(e.target.value)}
            className="w-full bg-cubby-cream rounded-xl px-4 py-3 text-cubby-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-cubby-salmon text-base placeholder:text-cubby-taupe/50"
          />

          {filteredPantry.length === 0 ? (
            <div className="text-center pt-8 space-y-2">
              <p className="text-4xl">🥡</p>
              <p className="font-black text-cubby-charcoal">Nothing found</p>
              <p className="text-cubby-taupe text-sm">Your pantry might be empty, or try a different search.</p>
            </div>
          ) : (
            <div className="bg-cubby-cream rounded-card divide-y divide-cubby-stone overflow-hidden">
              {filteredPantry.map((item) => {
                const isSelected = selectedPantryIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => togglePantrySelect(item.id)}
                    className={cn(
                      "w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors",
                      isSelected && "bg-cubby-salmon/10"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-cubby-salmon border-cubby-salmon" : "border-cubby-taupe/40"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-cubby-charcoal truncate">{item.name}</p>
                      {item.brand && <p className="text-xs text-cubby-taupe">{item.brand}</p>}
                    </div>
                    <span className="text-xs text-cubby-taupe font-semibold shrink-0 capitalize">{item.category}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sticky save */}
          <div className="fixed bottom-0 left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pb-6 pt-3 border-t border-black/5">
            <button
              onClick={handleSave}
              disabled={selectedPantryIds.size === 0}
              className={cn(
                "w-full bg-cubby-salmon text-white py-4 rounded-2xl font-black text-base",
                "flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
                selectedPantryIds.size === 0 && "opacity-40"
              )}
            >
              <Trash2 className="w-5 h-5" />
              Log {selectedPantryIds.size > 0 ? selectedPantryIds.size : ""} as waste
            </button>
          </div>
        </div>
      )}

      {/* Saving overlay */}
      {phase === "saving" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-cubby-cream rounded-card px-8 py-6 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-cubby-salmon border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-black text-cubby-charcoal">Logging waste…</p>
          </div>
        </div>
      )}
    </div>
  );
}
