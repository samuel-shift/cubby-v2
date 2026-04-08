"use client";

/**
 * Recipe Ideas Fan — stacked fan-style cards inline on home
 * Reads from sessionStorage (generated recipes) then localStorage cache.
 * Falls back to a prompt card if no recipes cached yet.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, AlertTriangle } from "lucide-react";

interface CachedRecipe {
  title: string;
  cookTime?: number;
  prepTime?: number;
  mealType?: string;
  expiryItemsUsed?: string[];
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

export function RecipeIdeasFan() {
  const [recipes, setRecipes] = useState<CachedRecipe[]>([]);

  useEffect(() => {
    // Try sessionStorage first (freshest — just generated this session)
    try {
      const session = sessionStorage.getItem("cubby_generated_recipes");
      if (session) {
        const parsed: CachedRecipe[] = JSON.parse(session);
        if (parsed.length > 0) {
          setRecipes(parsed.slice(0, 3));
          return;
        }
      }
    } catch { /* noop */ }

    // Fallback: localStorage cache
    try {
      const local = localStorage.getItem("cubby_recipes_v2");
      if (local) {
        const { recipes: cached }: { recipes: CachedRecipe[] } = JSON.parse(local);
        if (cached?.length > 0) {
          setRecipes(cached.slice(0, 3));
        }
      }
    } catch { /* noop */ }
  }, []);

  if (recipes.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-section-head text-cubby-charcoal">Recipe Ideas 👩‍🍳</h2>
        </div>
        <Link href="/recipes" className="cubby-card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
          <span className="text-3xl">👩‍🍳</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-cubby-charcoal text-sm">Generate recipe ideas</p>
            <p className="text-xs text-cubby-taupe">Based on what&apos;s in your kitchen</p>
          </div>
          <ArrowRight className="w-4 h-4 text-cubby-taupe flex-shrink-0" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-section-head text-cubby-charcoal">Recipe Ideas 👩‍🍳</h2>
        <Link href="/recipes" className="text-xs text-cubby-taupe font-semibold flex items-center gap-1">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Fan/stack layout */}
      <div className="relative" style={{ height: `${80 + (recipes.length - 1) * 10}px` }}>
        {recipes.map((recipe, i) => {
          const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
          const emoji = MEAL_EMOJI[recipe.mealType ?? ""] ?? "🍽️";
          const hasExpiry = (recipe.expiryItemsUsed?.length ?? 0) > 0;

          return (
            <Link key={i} href={`/recipes/new?idx=${i}`}>
              <div
                className="absolute inset-x-0 cubby-card px-4 py-4 flex items-center gap-3 active:scale-[0.98] transition-all duration-200"
                style={{
                  top: `${i * 10}px`,
                  zIndex: recipes.length - i,
                  opacity: 1 - i * 0.12,
                  transform: `scale(${1 - i * 0.02})`,
                }}
              >
                <span className="text-2xl flex-shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-cubby-charcoal text-sm truncate">{recipe.title}</p>
                  {hasExpiry ? (
                    <p className="text-[11px] text-cubby-urgent font-semibold flex items-center gap-1 truncate">
                      <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                      Uses expiring items
                    </p>
                  ) : (
                    <p className="text-xs text-cubby-taupe capitalize">{recipe.mealType ?? "recipe"}</p>
                  )}
                </div>
                {totalTime > 0 && (
                  <span className="text-xs text-cubby-taupe flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{totalTime}m
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
