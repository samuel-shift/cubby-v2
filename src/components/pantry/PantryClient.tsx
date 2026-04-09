"use client";

/**
 * PantryClient — List/Grid toggle pantry view
 *
 * - List view: information-dense (default when >15 items)
 * - Grid view: 2-column, category emoji (V1), flip-card interaction
 * - Location badge per item
 * - Filter by location / urgency
 * - Search
 * - Tap any item → bottom sheet detail/edit view
 */

import { useState, useCallback } from "react";
import { LayoutList, LayoutGrid, Search, X, ChevronDown, Trash2, Check, Pencil } from "lucide-react";
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

const LOCATIONS = ["FRIDGE", "FREEZER", "COUNTER", "CUPBOARD", "PANTRY"] as const;

// ─── Item Detail Sheet ────────────────────────────────────────────────────────

function ItemDetailSheet({
  item,
  onClose,
  onUpdate,
  onRemove,
}: {
  item: InventoryItem;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<InventoryItem>) => void;
  onRemove: (id: string) => void;
}) {
  const emoji = item.categoryEmoji ?? getCategoryEmoji(item.category);
  const [saving, setSaving] = useState(false);
  const [editingExpiry, setEditingExpiry] = useState(false);
  const [editingQty, setEditingQty] = useState(false);

  const [location, setLocation] = useState(item.location);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [expiryDate, setExpiryDate] = useState(
    item.expiryDate ? item.expiryDate.split("T")[0] : ""
  );

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      const { item: updated } = await res.json();
      onUpdate(item.id, updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleLocationChange(loc: string) {
    setLocation(loc);
    await patch({ location: loc });
  }

  async function handleQtySave() {
    const num = parseFloat(quantity);
    if (isNaN(num) || num <= 0) return;
    setEditingQty(false);
    await patch({ quantity: num });
  }

  async function handleExpirySave() {
    setEditingExpiry(false);
    if (!expiryDate) return;
    await patch({ expiryDate: new Date(expiryDate).toISOString() });
  }

  async function handleStatus(status: "EATEN" | "THROWN_OUT") {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      onRemove(item.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const { label: expiryLabel, urgency } = formatExpiryLabel(item.expiryDate);
  const expiryColor = urgency === "critical" || urgency === "expired"
    ? "text-cubby-urgent"
    : urgency === "warning"
    ? "text-amber-500"
    : "text-cubby-taupe";

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-cubby-cream rounded-t-3xl pb-safe">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-black/10" />
        </div>

        <div className="flex items-start justify-between px-5 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{emoji}</span>
            <div>
              <p className="font-black text-cubby-charcoal text-lg leading-tight">{item.name}</p>
              {item.brand && <p className="text-xs text-cubby-taupe">{item.brand}</p>}
              <p className="text-xs text-cubby-taupe mt-0.5">{item.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-cubby-stone flex items-center justify-center"
          >
            <X className="w-4 h-4 text-cubby-taupe" />
          </button>
        </div>

        <div className="px-5 space-y-4 pb-6">
          {/* Expiry */}
          <div className="cubby-card px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider mb-1">Expiry</p>
                {editingExpiry ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="text-sm font-semibold text-cubby-charcoal bg-cubby-stone rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cubby-green/30"
                    />
                    <button
                      onClick={handleExpirySave}
                      className="w-8 h-8 bg-cubby-green rounded-xl flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <p className={cn("text-sm font-semibold", expiryColor)}>
                    {item.expiryDate ? expiryLabel : "No expiry set"}
                  </p>
                )}
              </div>
              {!editingExpiry && (
                <button
                  onClick={() => setEditingExpiry(true)}
                  className="w-8 h-8 bg-cubby-stone rounded-xl flex items-center justify-center"
                >
                  <Pencil className="w-3.5 h-3.5 text-cubby-taupe" />
                </button>
              )}
            </div>
          </div>

          {/* Quantity + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="cubby-card px-4 py-3">
              <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider mb-1">Qty</p>
              {editingQty ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={quantity}
                    min="0.1"
                    step="0.1"
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-16 text-sm font-semibold text-cubby-charcoal bg-cubby-stone rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cubby-green/30"
                    autoFocus
                  />
                  <button
                    onClick={handleQtySave}
                    className="w-7 h-7 bg-cubby-green rounded-lg flex items-center justify-center"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditingQty(true)} className="flex items-center gap-1 group">
                  <span className="text-sm font-semibold text-cubby-charcoal">
                    {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                  </span>
                  <Pencil className="w-3 h-3 text-cubby-taupe opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            <div className="cubby-card px-4 py-3">
              <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider mb-1">Location</p>
              <div className="relative">
                <select
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="text-sm font-semibold text-cubby-charcoal bg-transparent appearance-none pr-5 focus:outline-none w-full"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{LOCATION_LABELS[loc]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cubby-taupe pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Outcome actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStatus("EATEN")}
              disabled={saving}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-cubby-green text-white font-black text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              <span>✅</span> Used it
            </button>
            <button
              onClick={() => handleStatus("THROWN_OUT")}
              disabled={saving}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-cubby-salmon/20 text-cubby-urgent font-black text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Binned it
            </button>
          </div>

          {saving && <p className="text-center text-xs text-cubby-taupe">Saving…</p>}
        </div>
      </div>
    </>
  );
}

// ─── Main PantryClient ────────────────────────────────────────────────────────

export function PantryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [view, setView] = useState<"list" | "grid">(
    initialItems.length > 15 ? "list" : "grid"
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "urgent" | "fridge" | "freezer">("all");
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const handleUpdate = useCallback((id: string, patch: Partial<InventoryItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const filtered = items.filter((item) => {
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

        <p className="text-xs text-cubby-taupe font-semibold">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </p>

        {view === "list" ? (
          <div className="space-y-2 pb-24">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="cubby-card px-4 py-3 flex items-center gap-3 w-full text-left active:scale-[0.99] transition-transform"
              >
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
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-24">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="cubby-card p-4 flex flex-col items-center gap-2 text-center active:scale-[0.98] transition-transform"
              >
                <span className="text-4xl">
                  {item.categoryEmoji ?? getCategoryEmoji(item.category)}
                </span>
                <p className="font-black text-cubby-charcoal text-sm leading-tight">{item.name}</p>
                <p className="text-[11px] text-cubby-taupe">
                  📍 {LOCATION_LABELS[item.location] ?? item.location}
                </p>
                {item.expiryDate && <ExpiryPill expiryDate={item.expiryDate} />}
              </button>
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

      {selected && (
        <ItemDetailSheet
          item={selected}
          onClose={() => setSelected(null)}
          onUpdate={(id, patch) => {
            handleUpdate(id, patch);
            setSelected((prev) => prev ? { ...prev, ...patch } : null);
          }}
          onRemove={(id) => {
            handleRemove(id);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
