"use client";

/**
 * MealLogClient
 * Used by /log/meal
 *
 * Flow A — Photo: camera capture → Claude Vision identifies ingredients
 *           → review list → mark items as EATEN in inventory
 *
 * Flow B — Type it in: search/select from pantry → mark as EATEN
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
  ChevronDown,
  ChevronUp,
  Utensils,
  KeyboardIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

type Phase = "choose" | "camera" | "processing" | "review" | "saving" | "success" | "manual" | "error";

interface ExtractedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  selected: boolean;
  // matched pantry item id (if found)
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

export function MealLogClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("choose");
  const [ingredients, setIngredients] = useState<ExtractedIngredient[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [selectedPantryIds, setSelectedPantryIds] = useState<Set<string>>(new Set());
  const [savedCount, setSavedCount] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({ matched: true, unmatched: true });
  const [mealDescription, setMealDescription] = useState("");

  // ─── Load pantry for manual flow ─────────────────────────────────────────

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
        body: JSON.stringify({ imageBase64: base64, entryType: "meal" }),
      });
      if (!res.ok) throw new Error("Vision API error");
      const data = await res.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extracted: ExtractedIngredient[] = (data.extracted as any[]).map((item, i) => ({
        id: `ing-${i}`,
        name: item.name ?? "Unknown",
        quantity: item.quantity ?? 1,
        unit: item.unit,
        category: item.category ?? "other",
        selected: true,
      }));

      setIngredients(extracted);
      setPhase("review");
    } catch {
      setPhase("error");
    }
  }

  // ─── Review helpers ───────────────────────────────────────────────────────

  function updateIngredient(id: string, patch: Partial<ExtractedIngredient>) {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  // ─── Match ingredients to pantry items ───────────────────────────────────

  const matched = ingredients.filter((ing) => {
    return pantryItems.some(
      (p) => p.name.toLowerCase().includes(ing.name.toLowerCase()) ||
             ing.name.toLowerCase().includes(p.name.toLowerCase())
    );
  }).map((ing) => {
    const pantryMatch = pantryItems.find(
      (p) => p.name.toLowerCase().includes(ing.name.toLowerCase()) ||
             ing.name.toLowerCase().includes(p.name.toLowerCase())
    );
    return { ...ing, inventoryId: pantryMatch?.id };
  });

  const unmatched = ingredients.filter((ing) =>
    !pantryItems.some(
      (p) => p.name.toLowerCase().includes(ing.name.toLowerCase()) ||
             ing.name.toLowerCase().includes(p.name.toLowerCase())
    )
  );

  // ─── Save: mark pantry items as EATEN ────────────────────────────────────

  async function handleSave() {
    setPhase("saving");
    let count = 0;

    // Mark matched pantry items as EATEN
    const itemsToMark = phase === "review"
      ? ingredients.filter((i) => i.selected && i.inventoryId).map((i) => i.inventoryId!)
      : Array.from(selectedPantryIds);

    await Promise.allSettled(
      itemsToMark.map(async (id) => {
        const res = await fetch(`/api/inventory/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "EATEN" }),
        });
        if (res.ok) count++;
      })
    );

    setSavedCount(count);
    setPhase("success");
  }

  // ─── Manual flow: pantry search + select ─────────────────────────────────

  const filteredPantry = manualSearch.trim()
    ? pantryItems.filter((p) =>
        p.name.toLowerCase().includes(manualSearch.toLowerCase())
      )
    : pantryItems;

  function togglePantrySelect(id: string) {
    setSelectedPantryIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (phase === "success") {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6">
        <div className="bg-cubby-cream rounded-card p-8 w-full max-w-sm text-center space-y-5 animate-spring-pop">
          <div className="w-16 h-16 bg-cubby-lime rounded-full flex items-center justify-center mx-auto">
            <Utensils className="w-8 h-8 text-cubby-green" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-black text-cubby-charcoal text-lg">Meal logged!</p>
            <p className="text-cubby-taupe text-sm mt-1">
              {savedCount > 0
                ? `${savedCount} item${savedCount !== 1 ? "s" : ""} marked as eaten 🍽️`
                : "Nice cooking! Ingredients updated."}
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setPhase("choose");
                setIngredients([]);
                setPreviewSrc(null);
                setSelectedPantryIds(new Set());
                setMealDescription("");
              }}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
            >
              Log another meal
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
        <PageHeader title="Log a meal" backHref="/log" />
        <div className="px-4 pt-12 text-center space-y-4">
          <p className="text-4xl">🍽️</p>
          <p className="font-black text-cubby-charcoal text-lg">Couldn&apos;t read that</p>
          <p className="text-cubby-taupe text-sm">Try a clearer photo or type your ingredients instead.</p>
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
      <PageHeader title="Log a meal" backHref="/log" />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Choose flow ── */}
      {phase === "choose" && (
        <div className="px-4 pt-2 space-y-3">
          <p className="text-cubby-taupe text-sm font-semibold pb-1">
            What did you cook? We&apos;ll mark the ingredients as used.
          </p>

          {/* Meal description */}
          <div className="bg-cubby-cream rounded-card p-4 space-y-2">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
              What did you make? <span className="text-cubby-taupe/50 normal-case font-semibold">(optional)</span>
            </p>
            <input
              type="text"
              placeholder="e.g. Chicken stir fry, pasta bake…"
              value={mealDescription}
              onChange={(e) => setMealDescription(e.target.value)}
              className="w-full bg-cubby-stone rounded-xl px-4 py-3 text-cubby-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-cubby-green text-base placeholder:text-cubby-taupe/50"
            />
          </div>

          <button
            onClick={() => setPhase("camera")}
            className="w-full bg-cubby-green text-white py-5 rounded-card flex items-center justify-center gap-3 font-black text-base active:scale-[0.97] transition-transform"
          >
            <Camera className="w-6 h-6" />
            Photo of the dish
          </button>

          <button
            onClick={() => setPhase("manual")}
            className="w-full bg-cubby-cream text-cubby-charcoal py-4 rounded-card flex items-center justify-center gap-3 font-black text-sm active:scale-[0.97] transition-transform"
          >
            <KeyboardIcon className="w-5 h-5" />
            Pick from my pantry
          </button>
        </div>
      )}

      {/* ── Camera phase ── */}
      {phase === "camera" && (
        <div className="px-4 space-y-3">
          <div className="relative rounded-card overflow-hidden bg-black aspect-[4/3] max-h-[55vh]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs font-black bg-black/50 px-3 py-1.5 rounded-full whitespace-nowrap">
              Point at your finished dish
            </p>
          </div>
          <button
            onClick={capturePhoto}
            className="w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
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
            <img src={previewSrc} alt="Meal" className="w-full max-w-xs mx-auto rounded-2xl opacity-70" />
          )}
          <div className="w-10 h-10 border-4 border-cubby-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-black text-cubby-charcoal">Identifying ingredients…</p>
          <p className="text-cubby-taupe text-sm">Claude is working it out</p>
        </div>
      )}

      {/* ── Review (photo flow) ── */}
      {phase === "review" && (
        <div className="px-4 pb-32 space-y-3">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider pt-1">
            Spotted {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}
          </p>

          {/* Matched to pantry */}
          {matched.length > 0 && (
            <div className="bg-cubby-cream rounded-card overflow-hidden">
              <button
                onClick={() => setExpandedSections((s) => ({ ...s, matched: !s.matched }))}
                className="w-full px-4 py-3.5 flex items-center justify-between"
              >
                <div>
                  <span className="font-black text-sm text-cubby-green">In your pantry</span>
                  <span className="text-cubby-taupe text-xs ml-2">({matched.length})</span>
                  <p className="text-xs text-cubby-taupe mt-0.5">Will be marked as eaten</p>
                </div>
                {expandedSections.matched
                  ? <ChevronUp className="w-4 h-4 text-cubby-taupe" />
                  : <ChevronDown className="w-4 h-4 text-cubby-taupe" />}
              </button>
              {expandedSections.matched && (
                <div className="divide-y divide-cubby-stone">
                  {matched.map((ing) => (
                    <div key={ing.id} className={cn("px-4 py-3 flex items-center gap-3", !ing.selected && "opacity-50")}>
                      <button
                        onClick={() => updateIngredient(ing.id, { selected: !ing.selected })}
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                          ing.selected ? "bg-cubby-green border-cubby-green" : "border-cubby-taupe/50"
                        )}
                      >
                        {ing.selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                      <span className="flex-1 font-black text-sm text-cubby-charcoal">{ing.name}</span>
                      <button onClick={() => removeIngredient(ing.id)} className="text-cubby-taupe/60 hover:text-cubby-urgent transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Not in pantry */}
          {unmatched.length > 0 && (
            <div className="bg-cubby-cream rounded-card overflow-hidden">
              <button
                onClick={() => setExpandedSections((s) => ({ ...s, unmatched: !s.unmatched }))}
                className="w-full px-4 py-3.5 flex items-center justify-between"
              >
                <div>
                  <span className="font-black text-sm text-cubby-taupe">Not in pantry</span>
                  <span className="text-cubby-taupe text-xs ml-2">({unmatched.length})</span>
                  <p className="text-xs text-cubby-taupe mt-0.5">No pantry record to update</p>
                </div>
                {expandedSections.unmatched
                  ? <ChevronUp className="w-4 h-4 text-cubby-taupe" />
                  : <ChevronDown className="w-4 h-4 text-cubby-taupe" />}
              </button>
              {expandedSections.unmatched && (
                <div className="divide-y divide-cubby-stone">
                  {unmatched.map((ing) => (
                    <div key={ing.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md border-2 border-cubby-taupe/30 flex items-center justify-center shrink-0">
                        <span className="text-cubby-taupe/40 text-xs">–</span>
                      </span>
                      <span className="flex-1 font-black text-sm text-cubby-taupe">{ing.name}</span>
                      <button onClick={() => removeIngredient(ing.id)} className="text-cubby-taupe/60 hover:text-cubby-urgent transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sticky save */}
          <div className="fixed left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pb-4 pt-3 border-t border-black/5 z-40" style={{ bottom: "var(--bottom-nav-height, 80px)" }}>
            <button
              onClick={handleSave}
              disabled={ingredients.filter((i) => i.selected && i.inventoryId).length === 0}
              className={cn(
                "w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base",
                "flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
                ingredients.filter((i) => i.selected && i.inventoryId).length === 0 && "opacity-40"
              )}
            >
              <Utensils className="w-5 h-5" />
              Mark as eaten
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
            className="w-full bg-cubby-cream rounded-xl px-4 py-3 text-cubby-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-cubby-green text-base placeholder:text-cubby-taupe/50"
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
                      isSelected && "bg-cubby-lime/30"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-cubby-green border-cubby-green" : "border-cubby-taupe/40"
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
          <div className="fixed left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pb-4 pt-3 border-t border-black/5 z-40" style={{ bottom: "var(--bottom-nav-height, 80px)" }}>
            <button
              onClick={handleSave}
              disabled={selectedPantryIds.size === 0}
              className={cn(
                "w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base",
                "flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
                selectedPantryIds.size === 0 && "opacity-40"
              )}
            >
              <Utensils className="w-5 h-5" />
              Mark {selectedPantryIds.size > 0 ? selectedPantryIds.size : ""} as eaten
            </button>
          </div>
        </div>
      )}

      {/* Saving overlay */}
      {phase === "saving" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-cubby-cream rounded-card px-8 py-6 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-cubby-green border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-black text-cubby-charcoal">Updating your pantry…</p>
          </div>
        </div>
      )}
    </div>
  );
}
