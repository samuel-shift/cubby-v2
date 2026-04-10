"use client";

/**
 * MealLogClient
 * Used by /log/meal
 *
 * Flow A — Photo: camera capture → Cubby Vision identifies MEAL → shows ingredients
 *           → cross-references inventory → user confirms which items were used → marks EATEN
 *
 * Flow B — Type it in: search/select from pantry → mark as EATEN
 *
 * Phases: "choose" | "camera" | "processing" | "identified" | "saving" | "success" | "manual" | "error"
 */

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  Trash2,
  RefreshCw,
  Utensils,
  KeyboardIcon,
  ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

type Phase = "choose" | "camera" | "processing" | "identified" | "saving" | "success" | "manual" | "error";

interface ExtractedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  selected: boolean;
  inventoryId?: string;
  inventoryLocation?: string;
}

interface PantryItem {
  id: string;
  name: string;
  brand?: string;
  quantity: number;
  unit?: string;
  category: string;
  location?: string;
}

const LOCATION_LABELS: Record<string, string> = {
  FRIDGE: "fridge",
  FREEZER: "freezer",
  COUNTER: "counter",
  CUPBOARD: "cupboard",
  PANTRY: "pantry",
};

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
  const [mealDescription, setMealDescription] = useState("");

  // Meal identification
  const [mealName, setMealName] = useState("");
  const [mealEmoji, setMealEmoji] = useState("🍽️");

  // ─── Load pantry ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "manual" || phase === "identified") {
      fetch("/api/inventory")
        .then((r) => r.json())
        .then((d) => {
          const items = d.items ?? [];
          setPantryItems(items);
          // If we already have ingredients (photo flow), auto-match them
          if (phase === "identified" && ingredients.length > 0) {
            setIngredients((prev) => matchIngredientsToInventory(prev, items));
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function matchIngredientsToInventory(ings: ExtractedIngredient[], pantry: PantryItem[]): ExtractedIngredient[] {
    return ings.map((ing) => {
      const match = pantry.find(
        (p) =>
          p.name.toLowerCase().includes(ing.name.toLowerCase()) ||
          ing.name.toLowerCase().includes(p.name.toLowerCase())
      );
      if (match) {
        return {
          ...ing,
          inventoryId: match.id,
          inventoryLocation: match.location,
          selected: true,
        };
      }
      return { ...ing, selected: false };
    });
  }

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

      // Set meal identification
      setMealName(data.mealName ?? "Your meal");
      setMealEmoji(data.mealEmoji ?? "🍽️");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extracted: ExtractedIngredient[] = (data.extracted as any[]).map((item, i) => ({
        id: `ing-${i}`,
        name: item.name ?? "Unknown",
        quantity: item.quantity ?? 1,
        unit: item.unit,
        category: item.category ?? "other",
        selected: false,
      }));

      setIngredients(extracted);
      setPhase("identified");
    } catch {
      setPhase("error");
    }
  }

  // ─── Review helpers ───────────────────────────────────────────────────────

  function toggleIngredient(id: string) {
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  }

  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  // Split into matched (in Cubby) and unmatched
  const matchedIngredients = ingredients.filter((i) => i.inventoryId);
  const unmatchedIngredients = ingredients.filter((i) => !i.inventoryId);
  const selectedMatchedCount = ingredients.filter((i) => i.selected && i.inventoryId).length;

  // ─── Save: mark pantry items as EATEN ────────────────────────────────────

  async function handleSave() {
    setPhase("saving");
    let count = 0;

    const itemsToMark =
      ingredients.length > 0
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
                ? `${savedCount} item${savedCount !== 1 ? "s" : ""} marked as used from your Cubby`
                : "Nice cooking! Your kitchen is up to date."}
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
                setMealName("");
                setMealEmoji("🍽️");
              }}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
            >
              Log another meal
            </button>
            <Link
              href="/"
              className="block w-full bg-cubby-lime text-cubby-green py-3.5 rounded-2xl font-black text-sm text-center active:scale-[0.97] transition-transform"
            >
              Back to home
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
            Snap a photo and Cubby will figure out what you made.
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
        <div className="px-4 pt-12 text-center space-y-4">
          {previewSrc && (
            <img src={previewSrc} alt="Meal" className="w-full max-w-xs mx-auto rounded-2xl opacity-70" />
          )}
          <div className="w-10 h-10 border-4 border-cubby-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-black text-cubby-charcoal">Figuring out what you made…</p>
          <p className="text-cubby-taupe text-sm">Cubby is identifying your meal</p>
        </div>
      )}

      {/* ── Identified: meal → ingredients → inventory match ── */}
      {phase === "identified" && (
        <div className="px-4 pb-32 space-y-4">
          {/* Meal identification hero */}
          <div className="bg-cubby-cream rounded-card p-5 text-center space-y-2">
            <p className="text-4xl">{mealEmoji}</p>
            <p className="font-black text-cubby-charcoal text-lg">
              Looks like {mealName.match(/^[aeiou]/i) ? "an" : "a"} {mealName}
            </p>
            <p className="text-cubby-taupe text-sm">
              Here&apos;s what Cubby thinks went into it
            </p>
          </div>

          {/* Matched to inventory — these are the "did you use?" items */}
          {matchedIngredients.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black text-cubby-green uppercase tracking-wider px-1">
                <ChefHat className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Did you use these from your Cubby?
              </p>
              <div className="bg-cubby-cream rounded-card divide-y divide-cubby-stone overflow-hidden">
                {matchedIngredients.map((ing) => {
                  const loc = ing.inventoryLocation
                    ? LOCATION_LABELS[ing.inventoryLocation] ?? ing.inventoryLocation
                    : null;
                  return (
                    <button
                      key={ing.id}
                      onClick={() => toggleIngredient(ing.id)}
                      className={cn(
                        "w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors",
                        ing.selected && "bg-cubby-lime/20"
                      )}
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors",
                          ing.selected ? "bg-cubby-green border-cubby-green" : "border-cubby-taupe/40"
                        )}
                      >
                        {ing.selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-cubby-charcoal">{ing.name}</p>
                        {loc && (
                          <p className="text-xs text-cubby-taupe">
                            From your {loc}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-cubby-taupe font-semibold shrink-0">
                        {ing.quantity}{ing.unit ? ` ${ing.unit}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unmatched — not in Cubby */}
          {unmatchedIngredients.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider px-1">
                Not tracked in your Cubby
              </p>
              <div className="bg-cubby-cream rounded-card divide-y divide-cubby-stone overflow-hidden">
                {unmatchedIngredients.map((ing) => (
                  <div key={ing.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg border-2 border-cubby-taupe/20 flex items-center justify-center shrink-0">
                      <span className="text-cubby-taupe/30 text-xs">–</span>
                    </span>
                    <span className="flex-1 font-semibold text-sm text-cubby-taupe">{ing.name}</span>
                    <button
                      onClick={() => removeIngredient(ing.id)}
                      className="text-cubby-taupe/40 hover:text-cubby-urgent transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-cubby-taupe/60 px-1">
                These won&apos;t be deducted — they&apos;re not in your inventory yet.
              </p>
            </div>
          )}

          {/* No matches at all */}
          {matchedIngredients.length === 0 && unmatchedIngredients.length > 0 && (
            <div className="bg-cubby-pastel-yellow/50 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-amber-700">
                None of these ingredients are currently in your Cubby.
              </p>
              <p className="text-xs text-cubby-taupe mt-1">
                Log items when you buy them so Cubby can track what you use!
              </p>
            </div>
          )}

          {/* Sticky save */}
          <div
            className="fixed left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pb-4 pt-3 border-t border-black/5 z-40"
            style={{ bottom: "var(--bottom-nav-height, 80px)" }}
          >
            <button
              onClick={handleSave}
              disabled={selectedMatchedCount === 0}
              className={cn(
                "w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base",
                "flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
                selectedMatchedCount === 0 && "opacity-40"
              )}
            >
              <Utensils className="w-5 h-5" />
              {selectedMatchedCount > 0
                ? `Mark ${selectedMatchedCount} item${selectedMatchedCount !== 1 ? "s" : ""} as used`
                : "Select items you used"}
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
          <div
            className="fixed left-0 right-0 bg-cubby-stone/95 backdrop-blur-sm px-4 pb-4 pt-3 border-t border-black/5 z-40"
            style={{ bottom: "var(--bottom-nav-height, 80px)" }}
          >
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-cubby-cream rounded-card px-8 py-6 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-cubby-green border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-black text-cubby-charcoal">Updating your Cubby…</p>
          </div>
        </div>
      )}
    </div>
  );
}
