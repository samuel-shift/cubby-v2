"use client";

/**
 * RecipeFeedClient
 * Full recipe generation feed with:
 * - localStorage cache (45min fresh / 4h stale-while-revalidate)
 * - Inventory hash soft-invalidation
 * - Filter sheet (maxCookTime, mealType, difficulty)
 * - Streaming generation via /api/recipes/generate
 * - Save to DB via /api/recipes
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Clock,
  Users,
  ChefHat,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Flame,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedRecipe {
  title: string;
  description?: string;
  mealType?: string;
  difficulty?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
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
  filters: FilterState;
}

interface FilterState {
  maxCookTime?: number;
  mealType?: string;
  difficulty?: string;
  cookFromFridgeOnly?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_KEY = "cubby_recipes_v2";
const FRESH_MS = 45 * 60 * 1000;   // 45 min
const STALE_MS = 4 * 60 * 60 * 1000; // 4 h

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const COOK_TIMES = [15, 30, 45, 60];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashInventory(items: { name: string }[]): string {
  return items
    .map((i) => i.name)
    .sort()
    .join("|");
}

function loadCache(): RecipeCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RecipeCache;
  } catch {
    return null;
  }
}

function saveCache(cache: RecipeCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* noop */ }
}

function saveToSession(recipes: GeneratedRecipe[]) {
  try {
    sessionStorage.setItem("cubby_generated_recipes", JSON.stringify(recipes));
  } catch { /* noop */ }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RecipeCardSkeleton() {
  return (
    <div className="cubby-card p-5 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-cubby-stone rounded w-16" />
          <div className="h-5 bg-cubby-stone rounded w-3/4" />
          <div className="h-3 bg-cubby-stone rounded w-full" />
        </div>
        <div className="w-8 h-8 bg-cubby-stone rounded-xl ml-3 flex-shrink-0" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 bg-cubby-stone rounded w-12" />
        <div className="h-3 bg-cubby-stone rounded w-16" />
        <div className="h-3 bg-cubby-stone rounded w-10" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 bg-cubby-stone rounded-full w-16" />
        <div className="h-5 bg-cubby-stone rounded-full w-20" />
      </div>
    </div>
  );
}

// ── Recipe Card ───────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  idx,
  onSave,
  isSaved,
}: {
  recipe: GeneratedRecipe;
  idx: number;
  onSave: (recipe: GeneratedRecipe) => Promise<void>;
  isSaved: boolean;
}) {
  const router = useRouter();
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
  const hasExpiry = (recipe.expiryItemsUsed?.length ?? 0) > 0;

  const difficultyColor =
    recipe.difficulty === "Easy"
      ? "bg-cubby-lime/40 text-cubby-green"
      : recipe.difficulty === "Hard"
      ? "bg-cubby-salmon/40 text-cubby-urgent"
      : "bg-cubby-stone text-cubby-taupe";

  return (
    <div
      className="cubby-card p-5 space-y-3 active:scale-[0.99] transition-transform cursor-pointer"
      onClick={() => router.push(`/recipes/new?idx=${idx}`)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {recipe.mealType && (
            <span className="text-[10px] font-black text-cubby-taupe uppercase tracking-wider">
              {recipe.mealType}
            </span>
          )}
          <h3 className="font-black text-cubby-charcoal text-base leading-tight mt-0.5 truncate">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-cubby-taupe text-xs mt-1 line-clamp-2">{recipe.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {recipe.difficulty && (
            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", difficultyColor)}>
              {recipe.difficulty}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(recipe);
            }}
            className="w-8 h-8 rounded-xl bg-cubby-stone flex items-center justify-center active:scale-90 transition-transform"
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-cubby-green" />
            ) : (
              <Bookmark className="w-4 h-4 text-cubby-taupe" />
            )}
          </button>
        </div>
      </div>

      {/* Expiry warning */}
      {hasExpiry && (
        <div className="flex items-center gap-1.5 bg-cubby-salmon/20 rounded-xl px-3 py-1.5">
          <Flame className="w-3 h-3 text-cubby-urgent flex-shrink-0" />
          <p className="text-[11px] font-black text-cubby-urgent">
            Uses expiring: {recipe.expiryItemsUsed!.join(", ")}
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-cubby-taupe">
        {totalTime > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{totalTime}m
          </span>
        )}
        {recipe.servings && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />{recipe.servings} servings
          </span>
        )}
        {recipe.cuisine && (
          <span className="flex items-center gap-1">
            <ChefHat className="w-3 h-3" />{recipe.cuisine}
          </span>
        )}
      </div>

      {/* Dietary tags */}
      {(recipe.dietaryTags?.length ?? 0) > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {recipe.dietaryTags!.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-semibold bg-cubby-stone text-cubby-taupe px-2 py-0.5 rounded-full capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Ingredient chips */}
      <div className="flex gap-1.5 flex-wrap">
        {recipe.ingredients.slice(0, 5).map((ing) => (
          <span
            key={ing.name}
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              ing.inInventory
                ? "bg-cubby-lime/30 text-cubby-green"
                : "bg-cubby-stone text-cubby-taupe"
            )}
          >
            {ing.name}
          </span>
        ))}
        {recipe.ingredients.length > 5 && (
          <span className="text-[10px] font-semibold bg-cubby-stone text-cubby-taupe px-2 py-0.5 rounded-full">
            +{recipe.ingredients.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

// ── Filter Sheet ──────────────────────────────────────────────────────────────

function FilterSheet({
  filters,
  onChange,
  onClose,
  onApply,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-cubby-cream rounded-t-3xl w-full max-w-lg p-6 space-y-5 pb-10">
        <div className="flex items-center justify-between">
          <p className="font-black text-cubby-charcoal text-lg">Filter recipes</p>
          <button onClick={onClose} className="w-8 h-8 bg-cubby-stone rounded-xl flex items-center justify-center">
            <X className="w-4 h-4 text-cubby-taupe" />
          </button>
        </div>

        {/* Cook time */}
        <div className="space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Max cook time</p>
          <div className="flex gap-2 flex-wrap">
            {COOK_TIMES.map((t) => (
              <button
                key={t}
                onClick={() => onChange({ ...filters, maxCookTime: filters.maxCookTime === t ? undefined : t })}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-black transition-colors",
                  filters.maxCookTime === t
                    ? "bg-cubby-green text-white"
                    : "bg-cubby-stone text-cubby-taupe"
                )}
              >
                {t}m
              </button>
            ))}
          </div>
        </div>

        {/* Meal type */}
        <div className="space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Meal type</p>
          <div className="flex gap-2 flex-wrap">
            {MEAL_TYPES.map((m) => (
              <button
                key={m}
                onClick={() => onChange({ ...filters, mealType: filters.mealType === m ? undefined : m })}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-black capitalize transition-colors",
                  filters.mealType === m
                    ? "bg-cubby-green text-white"
                    : "bg-cubby-stone text-cubby-taupe"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Difficulty</p>
          <div className="flex gap-2 flex-wrap">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => onChange({ ...filters, difficulty: filters.difficulty === d ? undefined : d })}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-black transition-colors",
                  filters.difficulty === d
                    ? "bg-cubby-green text-white"
                    : "bg-cubby-stone text-cubby-taupe"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Fridge only toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-cubby-charcoal">Fridge items only</p>
            <p className="text-xs text-cubby-taupe">Only use what&apos;s in the fridge</p>
          </div>
          <button
            onClick={() => onChange({ ...filters, cookFromFridgeOnly: !filters.cookFromFridgeOnly })}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              filters.cookFromFridgeOnly ? "bg-cubby-green" : "bg-cubby-stone"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
              filters.cookFromFridgeOnly ? "translate-x-7" : "translate-x-1"
            )} />
          </button>
        </div>

        <button
          onClick={onApply}
          className="w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RecipeFeedClient() {
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Finding recipes…");
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [pendingFilters, setPendingFilters] = useState<FilterState>({});
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (opts: { filters: FilterState; force?: boolean }) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLoading(true);
    setError(null);
    setLoadingMsg("Checking your pantry…");

    try {
      // Check cache
      if (!opts.force) {
        const cache = loadCache();
        if (cache) {
          const age = Date.now() - cache.generatedAt;
          const filtersMatch = JSON.stringify(cache.filters) === JSON.stringify(opts.filters);
          if (age < FRESH_MS && filtersMatch) {
            setRecipes(cache.recipes);
            saveToSession(cache.recipes);
            setLoading(false);
            return;
          }
          // Stale — show cached immediately, refresh in background
          if (age < STALE_MS && filtersMatch) {
            setRecipes(cache.recipes);
            saveToSession(cache.recipes);
          }
        }
      }

      setLoadingMsg("Generating ideas with AI…");

      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            maxCookTime: opts.filters.maxCookTime,
            mealType: opts.filters.mealType,
            difficulty: opts.filters.difficulty,
          },
          cookFromFridgeOnly: opts.filters.cookFromFridgeOnly ?? false,
          count: 6,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to generate recipes");
      }

      // Read stream and accumulate
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      const parsed: GeneratedRecipe[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        // Try to extract complete JSON objects progressively
        // The model returns a JSON array — extract complete objects as they arrive
        const arrayMatch = accumulated.match(/\[\s*([\s\S]*)/);
        if (arrayMatch) {
          const inner = arrayMatch[1];
          // Count complete objects by matching balanced braces
          let depth = 0;
          let start = -1;
          const newParsed: GeneratedRecipe[] = [];

          for (let i = 0; i < inner.length; i++) {
            if (inner[i] === "{") {
              if (depth === 0) start = i;
              depth++;
            } else if (inner[i] === "}") {
              depth--;
              if (depth === 0 && start !== -1) {
                try {
                  const obj = JSON.parse(inner.slice(start, i + 1));
                  newParsed.push(obj as GeneratedRecipe);
                } catch { /* incomplete */ }
                start = -1;
              }
            }
          }

          if (newParsed.length > parsed.length) {
            parsed.splice(0, parsed.length, ...newParsed);
            setRecipes([...parsed]);
            saveToSession([...parsed]);
          }
        }
      }

      // Final parse of complete response
      try {
        const match = accumulated.match(/\[[\s\S]*\]/);
        if (match) {
          const final: GeneratedRecipe[] = JSON.parse(match[0]);
          setRecipes(final);
          saveToSession(final);

          // Fetch inventory hash for cache
          const invRes = await fetch("/api/inventory").catch(() => null);
          const invHash = invRes
            ? hashInventory((await invRes.json()).items ?? [])
            : "";

          saveCache({
            recipes: final,
            generatedAt: Date.now(),
            inventoryHash: invHash,
            filters: opts.filters,
          });
        }
      } catch { /* noop */ }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setError("Couldn't generate recipes. Try again?");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    generate({ filters: {} });
  }, [generate]);

  const handleSave = async (recipe: GeneratedRecipe, idx: number) => {
    if (savedIds.has(idx)) return;
    setSavedIds((prev) => new Set([...prev, idx]));
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

  const activeFilterCount = [
    filters.maxCookTime,
    filters.mealType,
    filters.difficulty,
    filters.cookFromFridgeOnly,
  ].filter(
