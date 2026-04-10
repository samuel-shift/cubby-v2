"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Plus, Trash2, X, ChefHat, ShoppingCart, RefreshCw, Sparkles, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Typeahead } from "@/components/ui/Typeahead";
import { GROCERY_SUGGESTIONS, detectAisleOrder, detectCategory } from "@/lib/grocery-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "list" | "cookbook";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  aisleOrder?: number;
  checked: boolean;
  addedFromRecipe?: string;
}

interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
}

interface RecipeIngredient {
  name: string;
  amount?: number;
  unit?: string;
}

interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  cookTime?: number;
  servings?: number;
  ingredients: RecipeIngredient[];
  tags: string[];
}

interface GeneratedItem {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  reason: string;
  included: boolean;
}

// ─── Aisle grouping ───────────────────────────────────────────────────────────

const AISLE_ORDER: Record<string, number> = {
  produce: 1, fruit: 1, vegetables: 1, veg: 1,
  meat: 2, fish: 2, seafood: 2, poultry: 2,
  dairy: 3, eggs: 3, cheese: 3,
  bakery: 4, bread: 4,
  frozen: 5,
  "ambient dry": 6, pasta: 6, rice: 6, cereal: 6, tinned: 6, canned: 6, dry: 6,
  sauce: 7, condiment: 7, condiments: 7,
  snacks: 8,
  drinks: 9, beverage: 9,
  household: 10,
  other: 11,
};

const AISLE_LABELS: Record<number, string> = {
  1: "🥦 Fresh Produce", 2: "🥩 Meat & Fish", 3: "🥛 Dairy & Eggs",
  4: "🍞 Bakery", 5: "❄️ Frozen", 6: "🥫 Dry & Tinned",
  7: "🧴 Sauces", 8: "🍿 Snacks", 9: "🧃 Drinks",
  10: "🧹 Household", 11: "🛒 Other",
};

const CATEGORY_EMOJI: Record<string, string> = {
  produce: "🥦", meat: "🥩", dairy: "🥛", bakery: "🍞", frozen: "❄️",
  dry: "🥫", condiments: "🧴", snacks: "🍿", drinks: "🧃",
  household: "🧹", other: "🛒",
};

function getAisleOrder(category?: string): number {
  if (!category) return 11;
  const key = Object.keys(AISLE_ORDER).find((k) =>
    category.toLowerCase().includes(k)
  );
  return key ? AISLE_ORDER[key] : 11;
}

function groupByAisle(items: ShoppingItem[]): Map<number, ShoppingItem[]> {
  const map = new Map<number, ShoppingItem[]>();
  items.forEach((item) => {
    const aisle = item.aisleOrder ?? getAisleOrder(item.category);
    if (!map.has(aisle)) map.set(aisle, []);
    map.get(aisle)!.push(item);
  });
  return new Map([...map.entries()].sort(([a], [b]) => a - b));
}

// ─── Loading messages ─────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Checking what's in your kitchen…",
  "Analysing your eating habits…",
  "Spotting what you're running low on…",
  "Checking your favourite recipes…",
  "Building your personalised shop…",
  "Nearly there…",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ShoppingClient() {
  const [tab, setTab] = useState<Tab>("list");
  const [list, setList] = useState<ShoppingList | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [addedRecipeId, setAddedRecipeId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[] | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [addingGenerated, setAddingGenerated] = useState(false);

  // ─── Load data ───────────────────────────────────────────────────────────

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/shopping");
      if (!res.ok) return;
      const data = await res.json();
      setList(data.list);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecipes = useCallback(async () => {
    try {
      const res = await fetch("/api/recipes");
      if (!res.ok) return;
      const data = await res.json();
      setRecipes(data.recipes ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadList();
    loadRecipes();
  }, [loadList, loadRecipes]);

  useEffect(() => {
    if (showAddForm) setTimeout(() => inputRef.current?.focus(), 100);
  }, [showAddForm]);

  // Cycle loading messages during generation
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [generating]);

  // ─── AI Generation ──────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    setLoadingMsgIdx(0);
    try {
      const res = await fetch("/api/shopping/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      if (Array.isArray(data.items)) {
        setGeneratedItems(data.items.map((item: Omit<GeneratedItem, "included">) => ({
          ...item,
          included: true,
        })));
      }
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setGenerating(false);
    }
  }

  function handleToggleGenerated(idx: number) {
    setGeneratedItems((prev) =>
      prev?.map((item, i) => i === idx ? { ...item, included: !item.included } : item) ?? null
    );
  }

  async function handleAddGeneratedToList() {
    if (!generatedItems) return;
    const toAdd = generatedItems.filter((i) => i.included);
    if (toAdd.length === 0) return;

    setAddingGenerated(true);
    try {
      const results = await Promise.allSettled(
        toAdd.map((item) =>
          fetch("/api/shopping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              category: item.category,
              aisleOrder: detectAisleOrder(item.name) || getAisleOrder(item.category),
            }),
          }).then((r) => r.json())
        )
      );

      const newItems: ShoppingItem[] = results
        .filter((r) => r.status === "fulfilled")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r) => (r as any).value.item)
        .filter(Boolean);

      setList((prev) =>
        prev ? { ...prev, items: [...prev.items, ...newItems] } : prev
      );
      setGeneratedItems(null);
    } catch {
      // silent
    } finally {
      setAddingGenerated(false);
    }
  }

  // ─── Manual Actions ─────────────────────────────────────────────────────

  function handleSelectSuggestion(val: string) {
    setNewItemName(val);
    const detectedCat = detectCategory(val);
    if (detectedCat !== "Other") setNewItemCategory(detectedCat);
  }

  async function handleAddItem() {
    if (!newItemName.trim()) return;
    setAddingItem(true);
    try {
      const name = newItemName.trim();
      const category = newItemCategory.trim() || detectCategory(name);
      const aisleOrder = detectAisleOrder(name);
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          quantity: newItemQty,
          category: category !== "Other" ? category : undefined,
          aisleOrder,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setList((prev) =>
        prev ? { ...prev, items: [...prev.items, data.item] } : prev
      );
      setNewItemName("");
      setNewItemQty(1);
      setNewItemCategory("");
      inputRef.current?.focus();
    } catch {
      // silent
    } finally {
      setAddingItem(false);
    }
  }

  async function handleToggleCheck(item: ShoppingItem) {
    setList((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i) }
        : prev
    );
    try {
      await fetch(`/api/shopping/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !item.checked }),
      });
    } catch {
      setList((prev) =>
        prev
          ? { ...prev, items: prev.items.map((i) => i.id === item.id ? { ...i, checked: item.checked } : i) }
          : prev
      );
    }
  }

  async function handleDeleteItem(id: string) {
    setList((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev
    );
    try {
      await fetch(`/api/shopping/${id}`, { method: "DELETE" });
    } catch {
      // silent
    }
  }

  async function handleClearChecked() {
    const checked = list?.items.filter((i) => i.checked) ?? [];
    if (checked.length === 0) return;
    setList((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => !i.checked) } : prev
    );
    await Promise.allSettled(
      checked.map((item) =>
        fetch(`/api/shopping/${item.id}`, { method: "DELETE" })
      )
    );
  }

  async function handleAddRecipeToList(recipe: Recipe) {
    setAddingRecipeId(recipe.id);
    try {
      const results = await Promise.allSettled(
        recipe.ingredients.map((ing) =>
          fetch("/api/shopping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: ing.name,
              quantity: ing.amount ?? 1,
              unit: ing.unit,
              addedFromRecipe: recipe.id,
            }),
          }).then((r) => r.json())
        )
      );
      const newItems: ShoppingItem[] = results
        .filter((r) => r.status === "fulfilled")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r) => (r as any).value.item)
        .filter(Boolean);
      setList((prev) =>
        prev ? { ...prev, items: [...prev.items, ...newItems] } : prev
      );
      setAddedRecipeId(recipe.id);
      setTimeout(() => setAddedRecipeId(null), 2000);
      setTimeout(() => setTab("list"), 800);
    } catch {
      // silent
    } finally {
      setAddingRecipeId(null);
    }
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  const uncheckedItems = list?.items.filter((i) => !i.checked) ?? [];
  const checkedItems = list?.items.filter((i) => i.checked) ?? [];
  const aisleGroups = groupByAisle(uncheckedItems);
  const totalItems = list?.items.length ?? 0;
  const checkedCount = checkedItems.length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cubby-stone">

      {/* ── Header ── */}
      <div className="bg-cubby-stone px-4 pt-14 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-black text-cubby-charcoal text-2xl">Shopping</h1>
          {tab === "list" && checkedCount > 0 && (
            <button
              onClick={handleClearChecked}
              className="text-xs font-black text-cubby-taupe flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear {checkedCount} done
            </button>
          )}
        </div>

        {/* Segmented control */}
        <div className="bg-cubby-cream rounded-2xl p-1 flex gap-1">
          {([
            { id: "list",     label: "My List",  icon: ShoppingCart },
            { id: "cookbook", label: "Cookbook", icon: ChefHat },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all",
                tab === id
                  ? "bg-cubby-green text-white shadow-sm"
                  : "text-cubby-taupe active:scale-[0.97]"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════ MY LIST TAB ══════════════════ */}
      {tab === "list" && (
        <div className="px-4 pb-32 space-y-4 mt-2">
          {loading ? (
            <div className="pt-16 text-center">
              <div className="w-8 h-8 border-4 border-cubby-green border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : generating ? (
            /* ── AI Generation Loading ── */
            <div className="pt-16 flex flex-col items-center text-center space-y-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-cubby-lime/30 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-cubby-lime/20 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-cubby-green animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-black text-cubby-charcoal text-lg">Building your shop</p>
                <p className="text-cubby-taupe text-sm font-semibold animate-pulse">
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </p>
              </div>
            </div>
          ) : generatedItems ? (
            /* ── AI Review Screen ── */
            <div className="space-y-4">
              <div className="text-center space-y-1 pt-2">
                <p className="font-black text-cubby-charcoal text-lg">
                  Your smart shop
                </p>
                <p className="text-cubby-taupe text-sm">
                  {generatedItems.filter((i) => i.included).length} items selected · tap to remove
                </p>
              </div>

              <div className="space-y-2">
                {generatedItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleToggleGenerated(idx)}
                    className={cn(
                      "w-full cubby-card px-4 py-3.5 flex items-center gap-3 text-left transition-all active:scale-[0.98]",
                      !item.included && "opacity-40"
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(
                      "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                      item.included ? "bg-cubby-green border-cubby-green" : "border-cubby-taupe/30"
                    )}>
                      {item.included && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>

                    {/* Emoji */}
                    <span className="text-xl shrink-0">{CATEGORY_EMOJI[item.category] ?? "🛒"}</span>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-black text-sm text-cubby-charcoal leading-tight",
                        !item.included && "line-through"
                      )}>
                        {item.name}
                      </p>
                      <p className="text-xs text-cubby-taupe mt-0.5">
                        {item.quantity}{item.unit ? ` ${item.unit}` : ""} · {item.reason}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleAddGeneratedToList}
                  disabled={addingGenerated || generatedItems.filter((i) => i.included).length === 0}
                  className={cn(
                    "w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
                    (addingGenerated || generatedItems.filter((i) => i.included).length === 0) && "opacity-50"
                  )}
                >
                  {addingGenerated ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Adding to list…
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Add {generatedItems.filter((i) => i.included).length} items to my list
                    </>
                  )}
                </button>
                <button
                  onClick={() => setGeneratedItems(null)}
                  className="w-full text-cubby-taupe py-2 font-black text-sm active:scale-[0.97] transition-transform"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Fill My Trolley CTA (when list is empty or as secondary action) ── */}
              {totalItems === 0 && !showAddForm ? (
                <div className="pt-8 text-center space-y-5">
                  <div className="w-20 h-20 mx-auto rounded-full bg-cubby-lime/20 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-cubby-green" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-cubby-charcoal text-xl">Ready to shop?</p>
                    <p className="text-cubby-taupe text-sm leading-relaxed max-w-xs mx-auto">
                      Cubby learns what you buy, cook, and waste — then builds your perfect weekly shop.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="bg-cubby-green text-white px-8 py-4 rounded-2xl font-black text-base flex items-center gap-3 mx-auto active:scale-95 transition-transform shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    Fill my trolley
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="text-cubby-taupe font-black text-sm active:scale-95 transition-transform"
                  >
                    or add items manually
                  </button>
                </div>
              ) : (
                <>
                  {/* Smart refill button when list has items */}
                  {totalItems > 0 && (
                    <button
                      onClick={handleGenerate}
                      className="w-full cubby-card px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                    >
                      <div className="w-10 h-10 rounded-xl bg-cubby-lime/25 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-cubby-green" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-cubby-charcoal text-sm">Top up my list</p>
                        <p className="text-xs text-cubby-taupe">AI suggests what you need this week</p>
                      </div>
                    </button>
                  )}

                  {/* Aisle-grouped unchecked items */}
                  {[...aisleGroups.entries()].map(([aisleNum, items]) => (
                    <div key={aisleNum} className="space-y-1">
                      <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider px-1">
                        {AISLE_LABELS[aisleNum] ?? "Other"}
                      </p>
                      <div className="bg-cubby-cream rounded-card divide-y divide-cubby-stone overflow-hidden">
                        {items.map((item) => (
                          <ShoppingItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => handleToggleCheck(item)}
                            onDelete={() => handleDeleteItem(item.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Checked items */}
                  {checkedItems.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider px-1">
                        ✓ Done ({checkedItems.length})
                      </p>
                      <div className="bg-cubby-cream/60 rounded-card divide-y divide-cubby-stone/50 overflow-hidden">
                        {checkedItems.map((item) => (
                          <ShoppingItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => handleToggleCheck(item)}
                            onDelete={() => handleDeleteItem(item.id)}
                            dimmed
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Add item form */}
          {showAddForm && (
            <div className="bg-cubby-cream rounded-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Add item</p>
                <button onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4 text-cubby-taupe" />
                </button>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Item name…"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  className="w-full bg-cubby-stone rounded-xl px-4 py-3 text-cubby-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-cubby-green text-base placeholder:text-cubby-taupe/50"
                  autoComplete="off"
                />
                <Typeahead
                  value={newItemName}
                  suggestions={GROCERY_SUGGESTIONS}
                  onSelect={handleSelectSuggestion}
                  maxResults={5}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex items-center gap-2 bg-cubby-stone rounded-xl px-3 py-2">
                  <button
                    onClick={() => setNewItemQty((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-cubby-cream flex items-center justify-center font-black text-cubby-charcoal active:scale-90 transition-transform"
                  >
                    −
                  </button>
                  <span className="font-black text-cubby-charcoal w-6 text-center text-sm">{newItemQty}</span>
                  <button
                    onClick={() => setNewItemQty((q) => q + 1)}
                    className="w-7 h-7 rounded-lg bg-cubby-green flex items-center justify-center font-black text-white active:scale-90 transition-transform"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Category (optional)"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="flex-1 bg-cubby-stone rounded-xl px-4 py-2 text-cubby-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-cubby-green text-sm placeholder:text-cubby-taupe/50"
                />
              </div>

              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim() || addingItem}
                className={cn(
                  "w-full bg-cubby-green text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all",
                  (!newItemName.trim() || addingItem) && "opacity-50"
                )}
              >
                <Plus className="w-4 h-4" />
                {addingItem ? "Adding…" : "Add to list"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ COOKBOOK TAB ══════════════════ */}
      {tab === "cookbook" && (
        <div className="px-4 pb-28 space-y-3 mt-2">
          {recipes.length === 0 ? (
            <div className="pt-12 text-center space-y-4">
              <p className="text-5xl">📖</p>
              <p className="font-black text-cubby-charcoal text-lg">No saved recipes yet</p>
              <p className="text-cubby-taupe text-sm leading-relaxed">
                Save recipes from the home screen and they&apos;ll appear here — then add all their ingredients to your list in one tap.
              </p>
            </div>
          ) : (
            recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onAddToList={() => handleAddRecipeToList(recipe)}
                isAdding={addingRecipeId === recipe.id}
                isAdded={addedRecipeId === recipe.id}
              />
            ))
          )}
        </div>
      )}

      {/* ── Floating add button (list tab, only when not generating/reviewing) ── */}
      {tab === "list" && !showAddForm && !generating && !generatedItems && totalItems > 0 && (
        <div className="fixed bottom-24 right-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-14 h-14 bg-cubby-green rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={3} />
          </button>
        </div>
      )}

      {/* ── Refresh button ── */}
      {!generating && !generatedItems && (
        <div className="fixed bottom-24 left-4">
          <button
            onClick={() => { setLoading(true); loadList(); loadRecipes(); }}
            className="w-10 h-10 bg-cubby-cream rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4 text-cubby-taupe" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
  dimmed = false,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
  dimmed?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5 transition-opacity", dimmed && "opacity-50")}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        className={cn(
          "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all active:scale-90",
          item.checked ? "bg-cubby-green border-cubby-green" : "border-cubby-taupe/40"
        )}
      >
        {item.checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-black text-sm text-cubby-charcoal leading-tight",
          item.checked && "line-through text-cubby-taupe"
        )}>
          {item.name}
        </p>
        {(item.quantity > 1 || item.unit) && (
          <p className="text-xs text-cubby-taupe mt-0.5">
            {item.quantity}{item.unit ? ` ${item.unit}` : ""}
          </p>
        )}
      </div>
      {item.addedFromRecipe && (
        <span className="text-[10px] font-black text-cubby-taupe/60 bg-cubby-stone px-2 py-0.5 rounded-full shrink-0">
          recipe
        </span>
      )}
      <button
        onClick={onDelete}
        className="text-cubby-taupe/40 hover:text-cubby-urgent transition-colors active:scale-90 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function RecipeCard({
  recipe,
  onAddToList,
  isAdding,
  isAdded,
}: {
  recipe: Recipe;
  onAddToList: () => void;
  isAdding: boolean;
  isAdded: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-cubby-cream rounded-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-4 py-4 flex items-start gap-3 text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-cubby-pastel-yellow flex items-center justify-center shrink-0 text-2xl">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            "🍳"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-cubby-charcoal leading-tight">{recipe.title}</p>
          {recipe.description && (
            <p className="text-xs text-cubby-taupe mt-0.5 line-clamp-2">{recipe.description}</p>
          )}
          <div className="flex gap-3 mt-1.5">
            {recipe.cookTime && (
              <span className="text-xs text-cubby-taupe font-semibold">⏱ {recipe.cookTime}min</span>
            )}
            <span className="text-xs text-cubby-taupe font-semibold">
              {recipe.ingredients.length} ingredients
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-2 space-y-1">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider mb-2">Ingredients</p>
          <div className="space-y-1.5">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cubby-taupe/40 shrink-0" />
                <span className="text-sm text-cubby-charcoal font-semibold">
                  {ing.amount ? `${ing.amount}${ing.unit ? ` ${ing.unit}` : ""} ` : ""}{ing.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-4 pt-2">
        <button
          onClick={onAddToList}
          disabled={isAdding}
          className={cn(
            "w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]",
            isAdded ? "bg-cubby-lime text-cubby-green" : "bg-cubby-green text-white",
            isAdding && "opacity-60"
          )}
        >
          {isAdded ? (
            <><Check className="w-4 h-4" strokeWidth={3} /> Added to list!</>
          ) : isAdding ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Adding…
            </>
          ) : (
            <><Plus className="w-4 h-4" /> Add all to my list</>
          )}
        </button>
      </div>
    </div>
  );
}
