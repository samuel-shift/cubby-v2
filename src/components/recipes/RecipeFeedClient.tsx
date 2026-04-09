"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Users,
  Bookmark,
  BookmarkCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedRecipe {
  title: string;
  description?: string;
  difficulty?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  mealType?: string;
  cuisine?: string;
  dietaryTags?: string[];
  expiryItemsUsed?: string[];
  ingredients: { name: string; quantity?: string; amount?: number; unit?: string; inInventory?: boolean }[];
  instructions: string[];
}

interface RecipeCache {
  recipes: GeneratedRecipe[];
  generatedAt: number;
  inventoryHash: string;
}

interface Filters {
  maxCookTime?: number;
  mealType?: string;
  difficulty?: string;
  cookFromFridgeOnly?: boolean;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_KEY = "cubby_recipes_v2";
const FRESH_MS = 45 * 60 * 1000;
const STALE_MS = 4 * 60 * 60 * 1000;

function readCache(): RecipeCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RecipeCache) : null;
  } catch { return null; }
}

function writeCache(recipes: GeneratedRecipe[], inventoryHash: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ recipes, generatedAt: Date.now(), inventoryHash }));
    sessionStorage.setItem("cubby_generated_recipes", JSON.stringify(recipes));
  } catch { /* noop */ }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RecipeCardSkeleton() {
  return (
    <div className="cubby-card p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-cubby-stone rounded-full w-3/4" />
      <div className="h-3 bg-cubby-stone rounded-full w-1/2" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-cubby-stone rounded-full" />
        <div className="h-6 w-16 bg-cubby-stone rounded-full" />
      </div>
    </div>
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

function FilterSheet({ filters, onChange, onClose }: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);
  const timeOptions = [15, 30, 45, 60];
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const difficulties = ["Easy", "Medium", "Hard"];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-cubby-cream rounded-t-3xl w-full max-w-lg p-6 space-y-5 pb-10">
        <div className="flex items-center justify-between">
          <p className="font-black text-cubby-charcoal text-lg">Filter recipes</p>
          <button onClick={onClose} className="w-8 h-8 bg-cubby-stone rounded-xl flex items-center justify-center">
            <X className="w-4 h-4 text-cubby-taupe" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Max time</p>
          <div className="flex gap-2 flex-wrap">
            {timeOptions.map(t => (
              <button key={t} onClick={() => setLocal(l => ({ ...l, maxCookTime: l.maxCookTime === t ? undefined : t }))}
                className={cn("px-3 py-1.5 rounded-full text-xs font-black transition-colors",
                  local.maxCookTime === t ? "bg-cubby-green text-white" : "bg-cubby-stone text-cubby-taupe")}>
                {t}m
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Meal type</p>
          <div className="flex gap-2 flex-wrap">
            {mealTypes.map(m => (
              <button key={m} onClick={() => setLocal(l => ({ ...l, mealType: l.mealType === m ? undefined : m }))}
                className={cn("px-3 py-1.5 rounded-full text-xs font-black capitalize transition-colors",
                  local.mealType === m ? "bg-cubby-green text-white" : "bg-cubby-stone text-cubby-taupe")}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Difficulty</p>
          <div className="flex gap-2 flex-wrap">
            {difficulties.map(d => (
              <button key={d} onClick={() => setLocal(l => ({ ...l, difficulty: l.difficulty === d ? undefined : d }))}
                className={cn("px-3 py-1.5 rounded-full text-xs font-black transition-colors",
                  local.difficulty === d ? "bg-cubby-green text-white" : "bg-cubby-stone text-cubby-taupe")}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-cubby-charcoal">Fridge only</p>
            <p className="text-xs text-cubby-taupe">Only use what&apos;s in the fridge</p>
          </div>
          <button onClick={() => setLocal(l => ({ ...l, cookFromFridgeOnly: !l.cookFromFridgeOnly }))}
            className={cn("w-12 h-6 rounded-full transition-colors relative", local.cookFromFridgeOnly ? "bg-cubby-green" : "bg-cubby-stone")}>
            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
              local.cookFromFridgeOnly ? "translate-x-7" : "translate-x-1")} />
          </button>
        </div>

        <button onClick={() => { onChange(local); onClose(); }}
          className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm">
          Apply filters
        </button>
      </div>
    </div>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({ recipe, index, onSave, savedTitles }: {
  recipe: GeneratedRecipe;
  index: number;
  onSave: (recipe: GeneratedRecipe) => void;
  savedTitles: Set<string>;
}) {
  const router = useRouter();
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
  const hasExpiry = (recipe.expiryItemsUsed?.length ?? 0) > 0;
  const isSaved = savedTitles.has(recipe.title);

  const difficultyColor: Record<string, string> = {
    Easy: "bg-cubby-lime/40 text-cubby-green",
    Medium: "bg-cubby-salmon/30 text-cubby-urgent",
    Hard: "bg-red-100 text-red-600",
  };

  return (
    <div
      className="cubby-card p-4 space-y-3 active:scale-[0.99] transition-transform cursor-pointer"
      onClick={() => router.push(`/recipes/new?idx=${index}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {recipe.difficulty && (
              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", difficultyColor[recipe.difficulty] ?? "bg-cubby-stone text-cubby-taupe")}>
                {recipe.difficulty}
              </span>
            )}
            {hasExpiry && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cubby-salmon/30 text-cubby-urgent flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />Uses expiring items
              </span>
            )}
          </div>
          <p className="font-black text-cubby-charcoal text-base leading-snug">{recipe.title}</p>
          {recipe.description && (
            <p className="text-cubby-taupe text-xs mt-1 line-clamp-2">{recipe.description}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onSave(recipe); }}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-cubby-stone flex items-center justify-center active:scale-90 transition-transform"
        >
          {isSaved
            ? <BookmarkCheck className="w-4 h-4 text-cubby-green" />
            : <Bookmark className="w-4 h-4 text-cubby-taupe" />}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-cubby-taupe">
        {totalTime > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalTime}m</span>}
        {recipe.servings && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>}
        {recipe.mealType && <span className="capitalize">{recipe.mealType}</span>}
        {recipe.cuisine && <span>{recipe.cuisine}</span>}
      </div>

      {(recipe.dietaryTags?.length ?? 0) > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {recipe.dietaryTags!.map(tag => (
            <span key={tag} className="text-[10px] font-semibold bg-cubby-stone text-cubby-taupe px-2 py-0.5 rounded-full capitalize">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {recipe.ingredients.slice(0, 5).map((ing, i) => (
          <span key={i} className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
            ing.inInventory ? "bg-cubby-lime/30 text-cubby-green" : "bg-cubby-stone text-cubby-taupe")}>
            {ing.name}
          </span>
        ))}
        {recipe.ingredients.length > 5 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cubby-stone text-cubby-taupe">
            +{recipe.ingredients.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

export function RecipeFeedClient() {
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (opts: { filters: Filters; force?: boolean }) => {
    if (!opts.force) {
      const cache = readCache();
      if (cache) {
        const age = Date.now() - cache.generatedAt;
        if (age < FRESH_MS) {
          setRecipes(cache.recipes);
          try { sessionStorage.setItem("cubby_generated_recipes", JSON.stringify(cache.recipes)); } catch { /* noop */ }
          return;
        }
        if (age < STALE_MS) {
          setRecipes(cache.recipes);
          try { sessionStorage.setItem("cubby_generated_recipes", JSON.stringify(cache.recipes)); } catch { /* noop */ }
          // fall through to background refresh
        }
      }
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: { maxCookTime: opts.filters.maxCookTime, mealType: opts.filters.mealType, difficulty: opts.filters.difficulty },
          cookFromFridgeOnly: opts.filters.cookFromFridgeOnly ?? false,
          count: 6,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Generation failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed: GeneratedRecipe[] = JSON.parse(jsonMatch[0]);

      writeCache(parsed, "");
      setRecipes(parsed);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Recipe gen error:", err);
      setError("Couldn't generate recipes. Try again?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generate({ filters });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (recipe: GeneratedRecipe) => {
    if (savedTitles.has(recipe.title)) return;
    setSavedTitles(s => new Set([...s, recipe.title]));
    await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: recipe.title,
        description: recipe.description,
        cookTime: recipe.cookTime,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        mealType: recipe.mealType,
        cuisine: recipe.cuisine,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tags: recipe.dietaryTags ?? [],
        source: "ai_generated",
      }),
    });
  };

  const activeFilterCount = [filters.maxCookTime, filters.mealType, filters.difficulty, filters.cookFromFridgeOnly].filter(Boolean).length;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cubby-stone px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <h1 className="font-black text-cubby-charcoal text-xl flex-1">Recipe Ideas 👩‍🍳</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-colors",
              activeFilterCount > 0 ? "bg-cubby-green text-white" : "bg-cubby-cream text-cubby-taupe"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""}` : "Filter"}
          </button>
          <button
            onClick={() => generate({ filters, force: true })}
            disabled={loading}
            className="w-9 h-9 bg-cubby-cream rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
          >
            <RefreshCw className={cn("w-4 h-4 text-cubby-taupe", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3 pt-1">
        {/* Loading */}
        {loading && recipes.length === 0 && (
          <>
            <p className="text-center text-cubby-taupe text-xs py-4 font-semibold">Generating recipes from your ingredients…</p>
            {[...Array(3)].map((_, i) => <RecipeCardSkeleton key={i} />)}
          </>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="cubby-card p-6 text-center space-y-3">
            <p className="text-3xl">😕</p>
            <p className="font-black text-cubby-charcoal text-sm">{error}</p>
            <button onClick={() => generate({ filters, force: true })} className="text-cubby-green text-sm font-black">
              Try again
            </button>
          </div>
        )}

        {/* Cards */}
        {recipes.length > 0 && (
          <>
            {recipes.map((recipe, i) => (
              <RecipeCard
                key={recipe.title + i}
                recipe={recipe}
                index={i}
                onSave={handleSave}
                savedTitles={savedTitles}
              />
            ))}
            <button
              onClick={() => generate({ filters, force: true })}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-cubby-cream text-cubby-taupe text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              {loading ? "Generating…" : "Generate new ideas"}
            </button>
          </>
        )}
      </div>

      {/* Refresh toast */}
      {loading && recipes.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-cubby-charcoal text-white text-xs font-black px-4 py-2 rounded-full flex items-center gap-2 z-20">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Refreshing…
        </div>
      )}

      {showFilters && (
        <FilterSheet
          filters={filters}
          onChange={f => { setFilters(f); generate({ filters: f, force: true }); }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
