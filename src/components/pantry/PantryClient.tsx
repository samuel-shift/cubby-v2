"use client";

/**
 * PantryClient — List/Grid toggle pantry view
 *
 * - List view: information-dense (default when >15 items)
 * - Grid view: 2-column, category emoji (V1), flip-card interaction
 * - Location badge per item
 * - Filter by location / urgency
 * - Search
 */

import { useState } from "react";
import { LayoutList, LayoutGrid, Search } from "lucide-react";
import { cn, getCategoryEmoji, formatExpiryLabel } from "@/lib/utils";
import { ExpiryPill } from "@/components/ui/ExpiryPill";
import { PageHeader } from "@/components/ui/PageHeader";

interface InventoryItem {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  categoryEmoji: string | null;
  location: string;
  expiryDate: string | null;
  purchaseDate?: string | null;
  quantity: number;
  unit: string | null;
  status: string;
  [key: string]: unknown;
}

const LOCATION_LABELS: Record<string, string> = {
  FRIDGE: "Fridge",
  FREEZER: "Freezer",
  COUNTER: "Counter",
  CUPBOARD: "Cupboard",
  PANTRY: "Pantry",
};

export function PantryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const [view, setView] = useState<"list" | "grid">(
    initialItems.length > 15 ? "list" : "grid"
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "urgent" | "fridge" | "freezer">("all");

  const filtered = initialItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());

    if (filter === "urgent") {
      const { urgency } = formatExpiryLabel(item.expiryDate);
      return matchesSearch && (urgency === "critical" || urgency === "expired");
    }
    if (filter === "fridge") return matchesSearch && item.location === "FRIDGE";
    if (filter === "freezer") return matchesSearch && item.location === "FREEZER";
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader
        title="My Kitchen"
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("list")}
              className={cn("w-9 h-9 rounded-xl flex items-center justify-center", view === "list" ? "bg-cubby-green text-white" : "bg-cubby-cream text-cubby-taupe")}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn("w-9 h-9 rounded-xl flex items-center justify-center", view === "grid" ? "bg-cubby-green text-white" : "bg-cubby-cream text-cubby-taupe")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cubby-taupe" />
          <input
            type="search"
            placeholder="Search your kitchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-cubby-cream border border-black/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-cubby-charcoal placeholder:text-cubby-taupe focus:outline-none focus:ring-2 focus:ring-cubby-green/30"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {(["all", "urgent", "fridge", "freezer"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-shrink-0 text-xs font-black px-3.5 py-2 rounded-full transition-colors",
                filter === f ? "bg-cubby-green text-white" : "bg-cubby-cream text-cubby-taupe border border-black/5"
              )}
            >
              {f === "all" ? "All" : f === "urgent" ? "⚠️ Urgent" : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Item count */}
        <p className="text-xs text-cubby-taupe font-semibold">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </p>

        {/* Items */}
        {view === "list" ? (
          <div className="space-y-2 pb-6">
            {filtered.map((item) => (
              <div key={item.id} className="cubby-card px-4 py-3 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">
                  {item.categoryEmoji ?? getCategoryEmoji(item.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-cubby-charcoal text-sm truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-cubby-taupe">
                      📍 {LOCATION_LABELS[item.location] ?? item.location}
                    </span>
                    {item.expiryDate && <ExpiryPill expiryDate={item.expiryDate} />}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-cubby-taupe">
                    {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-6">
            {filtered.map((item) => (
              <div key={item.id} className="cubby-card p-4 flex flex-col items-center gap-2 text-center">
                <span className="text-4xl">
                  {item.categoryEmoji ?? getCategoryEmoji(item.category)}
                </span>
                <p className="font-black text-cubby-charcoal text-sm leading-tight">{item.name}</p>
                <p className="text-[11px] text-cubby-taupe">
                  📍 {LOCATION_LABELS[item.location] ?? item.location}
                </p>
                {item.expiryDate && <ExpiryPill expiryDate={item.expiryDate} />}
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-4xl">🧺</p>
            <p className="font-black text-cubby-charcoal">
              {search ? "Nothing found" : "Your kitchen is empty"}
            </p>
            <p className="text-sm text-cubby-taupe">
              {search ? "Try a different search" : "Tap + Log food to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
