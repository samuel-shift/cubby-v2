"use client";

/**
 * RecipeDetailClient
 * Shows a single generated recipe (from sessionStorage by ?idx=N)
 * or a saved DB recipe (passed as prop from server component).
 * Includes embedded CookMode with step-through, outcome modal, and inventory updates.
 */

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Clock,
  Users,
  ChefHat,
  CheckCircle2,
  Circle,
  X,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedRecipe } from "./RecipeFeedClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedRecipeShape {
  id: string;
  title: string;
  description?: string | null;
  cookTime?: number | null;
  prepTime?: number | null;
  servings?: number | null;
  difficulty?: string | null;
  mealType?: string | null;
  cuisine?: string | null;
  dietaryTags?: string[];
  ingredients: { name: string; quantity?: string; amount?: number; unit?: string; inInventory?: boolean }[];
  instructions: string[];
}

// ─── Cook Mode ────────────────────────────────────────────────────────────────

function CookMode({
  recipe,
  onClose,
}: {
  recipe: GeneratedRecipe | SavedRecipeShape;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const totalSteps = recipe.instructions.length;

  // Acquire wake lock to keep screen on
  useEffect(() => {
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((lock) => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }
    return () => {
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  const handleFinish = () => setShowOutcome(true);

  const handleOutcome = async (outcome: "eaten" | "some_waste" | "all_waste") => {
    try {
      // Collect all ingredient names from the recipe
      const ingredientNames = recipe.ingredients
        .filter((ing) => (ing as { inInventory?: boolean }).inInventory !== false)
        .map((ing) => ing.name.toLowerCase().trim());

      if (ingredientNames.length > 0) {
        const invRes = await fetch("/api/inventory");
        const { items } = await invRes.json();

        // Case-insensitive fuzzy match: ingredient name contains item name OR vice versa
        const toUpdate = (items as { id: string; name: string }[]).filter((item) => {
          const itemName = item.name.toLowerCase().trim();
          return ingredientNames.some(
            (ing) => ing.includes(itemName) || itemName.includes(ing)
          );
        });

        const newStatus = outcome === "all_waste" ? "THROWN_OUT" : "EATEN";

        await Promise.all(
          toUpdate.map((item) =>
            fetch(`/api/inventory/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            })
          )
        );
      }

      // Log MEAL_COOKED activity
      await fetch("/api/log/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MEAL_COOKED",
          metadata: {
            recipeTitle: recipe.title,
            outcome,
            ingredientsUsed: ingredientNames.length,
          },
        }),
      }).catch(() => {}); // non-critical
    } catch { /* noop */ }

    onClose();
  };

  if (showOutcome) {
    return (
      <div className="fixed inset-0 z-[60] bg-cubby-stone/95 flex items-center justify-center px-4">
        <div className="bg-cubby-cream rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-xl">
          <p className="font-black text-cubby-charcoal text-xl text-center">How did it go? 🍽️</p>
          <p className="text-cubby-taupe text-sm text-center">This helps Cubby learn what to suggest next</p>
          <div className="space-y-3">
            <button
              onClick={() => handleOutcome("eaten")}
              className="w-full p-4 rounded-2xl bg-cubby-lime/30 text-cubby-green font-black text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-black">All eaten — zero waste!</p>
                <p className="text-xs font-normal opacity-70">Brilliant, everything was used up</p>
              </div>
            </button>
            <button
              onClick={() => handleOutcome("some_waste")}
              className="w-full p-4 rounded-2xl bg-cubby-stone text-cubby-charcoal font-black text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">🤏</span>
              <div>
                <p className="text-sm font-black">Some leftovers</p>
                <p className="text-xs font-normal opacity-70">Most was eaten, a bit left over</p>
              </div>
            </button>
            <button
              onClick={() => handleOutcome("all_waste")}
              className="w-full p-4 rounded-2xl bg-cubby-salmon/20 text-cubby-urgent font-black text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">🗑️</span>
              <div>
                <p className="text-sm font-black">Mostly wasted</p>
                <p className="text-xs font-normal opacity-70">Didn&apos;t go as planned</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showExitConfirm) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-6">
        <div className="bg-cubby-cream rounded-3xl p-6 w-full max-w-sm space-y-4">
          <p className="font-black text-cubby-charcoal text-lg text-center">Exit cook mode?</p>
          <p className="text-cubby-taupe text-sm text-center">Your progress won&apos;t be saved</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowExitConfirm(false)}
              className="flex-1 py-3 rounded-2xl bg-cubby-stone text-cubby-taupe font-black text-sm"
            >
              Keep cooking
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-cubby-charcoal text-white font-black text-sm"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-cubby-stone flex flex-col">
      {/* Header */}
      <div className="bg-cubby-cream px-4 py-4 flex items-center justify-between border-b border-cubby-stone">
        <div>
          <p className="font-black text-cubby-charcoal text-sm">Cook Mode</p>
          <p className="text-xs text-cubby-taupe">Step {step + 1} of {totalSteps}</p>
        </div>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="w-9 h-9 bg-cubby-stone rounded-xl flex items-center justify-center"
        >
          <X className="w-4 h-4 text-cubby-taupe" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-cubby-stone">
        <div
          className="h-full bg-cubby-green transition-all duration-500"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-cubby-green text-white font-black text-sm flex items-center justify-center flex-shrink-0">
            {step + 1}
          </div>
          <p className="text-cubby-charcoal font-semibold text-base leading-relaxed pt-1.5">
            {recipe.instructions[step]}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mt-8 flex-wrap">
          {recipe.instructions.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-colors",
                i === step ? "bg-cubby-green" : i < step ? "bg-cubby-lime" : "bg-cubby-stone"
              )}
            />
          ))}
        </div>
      </div>

      {/* Nav buttons */}
      <div className="px-4 pb-10 pt-4 flex gap-3 bg-cubby-cream border-t border-cubby-stone">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex-1 py-4 rounded-2xl bg-cubby-stone text-cubby-taupe font-black text-sm disabled:opacity-30 transition-opacity"
        >
          Back
        </button>
        {step < totalSteps - 1 ? (
          <button
            onClick={() => {
              setStep(s => s + 1);
              if ("vibrate" in navigator) navigator.vibrate(30);
            }}
            className="flex-1 py-4 rounded-2xl bg-cubby-green text-white font-black text-sm"
          >
            Next step
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="flex-1 py-4 rounded-2xl bg-cubby-charcoal text-white font-black text-sm"
          >
            Finish 🎉
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Detail ──────────────────────────────────────────────────────────────

export function RecipeDetailClient({ savedRecipe }: { savedRecipe?: SavedRecipeShape }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<GeneratedRecipe | SavedRecipeShape | null>(savedRecipe ?? null);
  const [cookMode, setCookMode] = useState(false);

  useEffect(() => {
    if (savedRecipe) return;
    const idx = searchParams.get("idx");
    if (idx === null) { router.replace("/recipes"); return; }

    try {
      const raw = sessionStorage.getItem("cubby_generated_recipes");
      if (raw) {
        const recipes: GeneratedRecipe[] = JSON.parse(raw);
        const r = recipes[parseInt(idx, 10)];
        if (r) { setRecipe(r); return; }
      }
      // Fallback: localStorage
      const local = localStorage.getItem("cubby_recipes_v3");
      if (local) {
        const { recipes }: { recipes: GeneratedRecipe[] } = JSON.parse(local);
        const r = recipes[parseInt(idx, 10)];
        if (r) setRecipe(r);
      }
    } catch { /* noop */ }
  }, [searchParams, savedRecipe, router]);

  if (!recipe) {
    return (
      <div className="px-4 pt-8 text-center space-y-3">
        <p className="text-4xl">😕</p>
        <p className="font-black text-cubby-charcoal">Recipe not found</p>
        <button onClick={() => router.push("/recipes")} className="text-cubby-green font-black text-sm">
          Back to recipes
        </button>
      </div>
    );
  }

  const totalTime = ((recipe as GeneratedRecipe).prepTime ?? 0) + (recipe.cookTime ?? 0);
  const hasExpiry = ((recipe as GeneratedRecipe).expiryItemsUsed?.length ?? 0) > 0;
  const inInventoryCount = recipe.ingredients.filter(i => i.inInventory).length;

  return (
    <>
      {cookMode && (
        <CookMode recipe={recipe} onClose={() => setCookMode(false)} />
      )}

      <div className="pb-28">
        {/* Hero block */}
        <div className="px-4 pt-4 space-y-3">
          {hasExpiry && (
            <div className="flex items-center gap-2 bg-cubby-salmon/20 rounded-xl px-3 py-2">
              <Flame className="w-4 h-4 text-cubby-urgent flex-shrink-0" />
              <p className="text-xs font-black text-cubby-urgent">
                Uses expiring: {(recipe as GeneratedRecipe).expiryItemsUsed!.join(", ")}
              </p>
            </div>
          )}

          <h1 className="font-black text-cubby-charcoal text-2xl leading-tight">{recipe.title}</h1>

          {recipe.description && (
            <p className="text-cubby-taupe text-sm">{recipe.description}</p>
          )}

          {/* Meta pills */}
          <div className="flex gap-2 flex-wrap">
            {totalTime > 0 && (
              <span className="flex items-center gap-1.5 bg-cubby-cream px-3 py-1.5 rounded-full text-xs font-black text-cubby-charcoal">
                <Clock className="w-3 h-3" />{totalTime}m
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1.5 bg-cubby-cream px-3 py-1.5 rounded-full text-xs font-black text-cubby-charcoal">
                <Users className="w-3 h-3" />{recipe.servings} servings
              </span>
            )}
            {recipe.difficulty && (
              <span className="flex items-center gap-1.5 bg-cubby-cream px-3 py-1.5 rounded-full text-xs font-black text-cubby-charcoal">
                <ChefHat className="w-3 h-3" />{recipe.difficulty}
              </span>
            )}
            {recipe.mealType && (
              <span className="bg-cubby-cream px-3 py-1.5 rounded-full text-xs font-black text-cubby-charcoal capitalize">{recipe.mealType}</span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-cubby-stone mx-4 my-5" />

        {/* Ingredients */}
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-cubby-charcoal text-lg">Ingredients</h2>
            {inInventoryCount > 0 && (
              <span className="text-xs text-cubby-green font-black">
                {inInventoryCount} in your kitchen ✓
              </span>
            )}
          </div>
          <div className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  ing.inInventory ? "bg-cubby-green" : "bg-cubby-stone"
                )} />
                <span className="text-cubby-charcoal text-sm font-semibold flex-1">{ing.name}</span>
                {ing.quantity && (
                  <span className="text-cubby-taupe text-xs">{ing.quantity}</span>
                )}
                {ing.inInventory && (
                  <span className="text-[10px] text-cubby-green font-black bg-cubby-lime/20 px-2 py-0.5 rounded-full">in kitchen</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-cubby-stone mx-4 my-5" />

        {/* Method */}
        <div className="px-4 space-y-4">
          <h2 className="font-black text-cubby-charcoal text-lg">Method</h2>
          {recipe.instructions.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-cubby-green text-white font-black text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-cubby-charcoal text-sm leading-relaxed pt-1">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cook button — fixed above bottom nav */}
      <div
        className="fixed left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-cubby-stone via-cubby-stone to-transparent pointer-events-none z-40"
        style={{ bottom: "var(--bottom-nav-height, 80px)" }}
      >
        <button
          onClick={() => setCookMode(true)}
          className="w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base shadow-lg pointer-events-auto active:scale-[0.98] transition-transform"
        >
          Start cooking 👨‍🍳
        </button>
      </div>
    </>
  );
}
