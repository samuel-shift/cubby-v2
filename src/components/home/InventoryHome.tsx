"use client";

/**
 * InventoryHome — Full inventory system for the Home tab
 *
 * Features:
 * - Storage tabs (All / Fridge / Freezer / Pantry / Cupboard) with count badges
 * - Urgency grouping: Expired → Use Soon (1–3 days) → Looking Good (4+) → No Expiry
 * - Sort controls: Expiring Soonest (default), Recently Added, A–Z, Category
 * - Inventory item cards with:
 *   - Category emoji, product name, quantity badge
 *   - Brand/category/storage meta row
 *   - Expiry progress bar with days-remaining label
 *   - Tap-to-expand with quick actions: "Used ✓", "Wasted 🗑"
 *   - Swipe-left gestures for Used/Wasted actions
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  ArrowDownUp,
  Trash2,
  Check,
} from "lucide-react";
import { cn, getCategoryEmoji, formatExpiryLabel } from "@/lib/utils";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface InventoryItem {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  categoryEmoji: string | null;
  location: string;
  expiryDate: string | null;
  openedDate: string | null;
  purchaseDate: string | null;
  quantity: number;
  unit: string | null;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

type StorageTab = "ALL" | "FRIDGE" | "FREEZER" | "PANTRY" | "CUPBOARD" | "COUNTER";
type SortMode = "expiry" | "recent" | "alpha" | "category";
type UrgencyGroup = "expired" | "useSoon" | "lookingGood" | "noExpiry";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const STORAGE_TABS: { key: StorageTab; label: string; emoji: string }[] = [
  { key: "ALL", label: "All", emoji: "🏠" },
  { key: "FRIDGE", label: "Fridge", emoji: "❄️" },
  { key: "FREEZER", label: "Freezer", emoji: "🧊" },
  { key: "PANTRY", label: "Pantry", emoji: "🫙" },
  { key: "CUPBOARD", label: "Cupboard", emoji: "🗄️" },
  { key: "COUNTER", label: "Counter", emoji: "🍌" },
];

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "expiry", label: "Expiring soonest" },
  { key: "recent", label: "Recently added" },
  { key: "alpha", label: "A–Z" },
  { key: "category", label: "Category" },
];

const URGENCY_HEADERS: Record<UrgencyGroup, { label: string; color: string; emoji: string }> = {
  expired: { label: "Expired", color: "text-cubby-urgent", emoji: "🔴" },
  useSoon: { label: "Use Soon", color: "text-cubby-salmon", emoji: "🟠" },
  lookingGood: { label: "Looking Good", color: "text-cubby-green", emoji: "🟢" },
  noExpiry: { label: "No Expiry Set", color: "text-cubby-taupe", emoji: "⚪" },
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getDaysLeft(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

function getUrgencyGroup(daysLeft: number | null): UrgencyGroup {
  if (daysLeft === null) return "noExpiry";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "useSoon";
  return "lookingGood";
}

/** Expiry progress: 0 = just added, 1 = expired. Based on typical shelf life. */
function getExpiryProgress(item: InventoryItem): number {
  if (!item.expiryDate) return 0;
  const now = new Date();
  const exp = new Date(item.expiryDate);
  // Use purchase date or created date as the start reference
  const start = item.purchaseDate ? new Date(item.purchaseDate) : new Date(item.createdAt);
  const total = exp.getTime() - start.getTime();
  if (total <= 0) return 1;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

function getProgressColor(progress: number): string {
  if (progress >= 1) return "bg-cubby-urgent";
  if (progress >= 0.75) return "bg-cubby-salmon";
  if (progress >= 0.5) return "bg-amber-400";
  return "bg-cubby-lime";
}

/* ─── Swipeable Item Card ─────────────────────────────────────────────────── */

function SwipeableItemCard({
  item,
  isExpanded,
  onToggle,
  onAction,
}: {
  item: InventoryItem;
  isExpanded: boolean;
  onToggle: () => void;
  onAction: (id: string, action: "EATEN" | "THROWN_OUT") => void;
}) {
  const emoji = item.categoryEmoji ?? getCategoryEmoji(item.category);
  const daysLeft = getDaysLeft(item.expiryDate);
  const { label: expiryLabel, urgency } = formatExpiryLabel(item.expiryDate);
  const progress = getExpiryProgress(item);
  const progressColor = getProgressColor(progress);

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startXRef.current;
    // Only allow left swipe (negative values)
    setSwipeX(Math.min(0, Math.max(-140, diff)));
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (swipeX < -100) {
      // Keep swiped open to show action buttons
      setSwipeX(-140);
    } else {
      setSwipeX(0);
    }
  };

  const resetSwipe = () => setSwipeX(0);

  return (
    <div className="relative overflow-hidden rounded-card">
      {/* Swipe-revealed action buttons */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-0">
        <button
          onClick={() => {
            onAction(item.id, "EATEN");
            resetSwipe();
          }}
          className="w-[70px] bg-cubby-green flex flex-col items-center justify-center gap-1 text-white"
        >
          <Check className="w-5 h-5" />
          <span className="text-[10px] font-black">Used</span>
        </button>
        <button
          onClick={() => {
            onAction(item.id, "THROWN_OUT");
            resetSwipe();
          }}
          className="w-[70px] bg-cubby-urgent flex flex-col items-center justify-center gap-1 text-white"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px] font-black">Wasted</span>
        </button>
      </div>

      {/* Main card content — slides left on swipe */}
      <div
        ref={cardRef}
        className="relative z-10 bg-cubby-cream border border-black/5 rounded-card transition-transform"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={() => {
            if (swipeX !== 0) {
              resetSwipe();
              return;
            }
            onToggle();
          }}
          className="w-full text-left px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-black text-cubby-charcoal text-sm truncate">
                  {item.name}
                </p>
                {item.quantity > 1 && (
                  <span className="flex-shrink-0 bg-cubby-green/10 text-cubby-green text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    ×{item.quantity}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-cubby-taupe">
                {item.brand && <span>{item.brand}</span>}
                {item.brand && <span>·</span>}
                <span>{item.category}</span>
                <span>·</span>
                <span>
                  {STORAGE_TABS.find((t) => t.key === item.location)?.label ?? item.location}
                </span>
              </div>

              {/* Expiry progress bar */}
              {item.expiryDate && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                      style={{ width: `${Math.min(100, progress * 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-black flex-shrink-0",
                      urgency === "expired" || urgency === "critical"
                        ? "text-cubby-urgent"
                        : urgency === "warning"
                        ? "text-cubby-salmon"
                        : "text-cubby-green"
                    )}
                  >
                    {daysLeft !== null && daysLeft < 0
                      ? `${Math.abs(daysLeft)}d overdue`
                      : daysLeft === 0
                      ? "Today!"
                      : daysLeft === 1
                      ? "Tomorrow"
                      : daysLeft !== null
                      ? `${daysLeft}d left`
                      : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 ml-1">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-cubby-taupe" />
              ) : (
                <ChevronDown className="w-4 h-4 text-cubby-taupe" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded quick actions */}
        {isExpanded && (
          <div className="px-4 pb-3 pt-1 border-t border-black/5">
            <div className="flex gap-2">
              <button
                onClick={() => onAction(item.id, "EATEN")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-cubby-green text-white font-black text-sm active:scale-95 transition-transform"
              >
                <Check className="w-4 h-4" />
                Used ✓
              </button>
              <button
                onClick={() => onAction(item.id, "THROWN_OUT")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-cubby-salmon/15 text-cubby-urgent font-black text-sm active:scale-95 transition-transform"
              >
                <Trash2 className="w-4 h-4" />
                Wasted 🗑
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main InventoryHome Component ────────────────────────────────────────── */

export function InventoryHome() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StorageTab>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("expiry");
  const [sortOpen, setSortOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch inventory
  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(({ items: data }) => {
        setItems(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Count per tab
  const tabCounts: Record<StorageTab, number> = {
    ALL: items.length,
    FRIDGE: items.filter((i) => i.location === "FRIDGE").length,
    FREEZER: items.filter((i) => i.location === "FREEZER").length,
    PANTRY: items.filter((i) => i.location === "PANTRY").length,
    CUPBOARD: items.filter((i) => i.location === "CUPBOARD").length,
    COUNTER: items.filter((i) => i.location === "COUNTER").length,
  };

  // Filter by tab
  const filtered = activeTab === "ALL" ? items : items.filter((i) => i.location === activeTab);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortMode) {
      case "expiry": {
        // Items with no expiry go last
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
      case "recent":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "alpha":
        return a.name.localeCompare(b.name);
      case "category":
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Group by urgency (only when sorting by expiry)
  const grouped = sortMode === "expiry"
    ? groupByUrgency(sorted)
    : { all: sorted };

  function groupByUrgency(itemList: InventoryItem[]): Record<string, InventoryItem[]> {
    const groups: Record<UrgencyGroup, InventoryItem[]> = {
      expired: [],
      useSoon: [],
      lookingGood: [],
      noExpiry: [],
    };
    for (const item of itemList) {
      const daysLeft = getDaysLeft(item.expiryDate);
      const group = getUrgencyGroup(daysLeft);
      groups[group].push(item);
    }
    return groups;
  }

  // Actions
  const handleAction = useCallback(async (id: string, status: "EATEN" | "THROWN_OUT") => {
    // Optimistic removal
    setItems((prev) => prev.filter((item) => item.id !== id));
    setExpandedId(null);

    await fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3 px-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="cubby-card h-20 animate-pulse bg-cubby-cream" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3 px-4">
        <p className="text-5xl">🧺</p>
        <p className="font-black text-cubby-charcoal text-lg">Your kitchen is empty</p>
        <p className="text-sm text-cubby-taupe">
          Tap the <span className="font-black text-cubby-green">+</span> button to add your first items
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Storage Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {STORAGE_TABS.filter((tab) => tab.key === "ALL" || tabCounts[tab.key] > 0).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-full transition-colors",
              activeTab === tab.key
                ? "bg-cubby-green text-white"
                : "bg-cubby-cream text-cubby-taupe border border-black/5"
            )}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            <span
              className={cn(
                "text-[10px] ml-0.5 px-1.5 py-0.5 rounded-full font-black",
                activeTab === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-black/5 text-cubby-taupe"
              )}
            >
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Sort control */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-cubby-taupe font-semibold">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </p>
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1 text-xs font-black text-cubby-green"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            {SORT_OPTIONS.find((s) => s.key === sortMode)?.label}
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 bg-cubby-cream border border-black/10 rounded-2xl overflow-hidden min-w-[160px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSortMode(opt.key);
                      setSortOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors",
                      sortMode === opt.key
                        ? "bg-cubby-green/10 text-cubby-green font-black"
                        : "text-cubby-charcoal hover:bg-cubby-stone"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Item list — grouped by urgency when sorting by expiry */}
      <div className="space-y-4 pb-8">
        {sortMode === "expiry" ? (
          // Render urgency groups
          (Object.entries(grouped) as [UrgencyGroup, InventoryItem[]][])
            .filter(([, groupItems]) => groupItems.length > 0)
            .map(([groupKey, groupItems]) => {
              const header = URGENCY_HEADERS[groupKey as UrgencyGroup];
              if (!header) return null;
              return (
                <div key={groupKey}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{header.emoji}</span>
                    <span className={cn("text-xs font-black", header.color)}>
                      {header.label}
                    </span>
                    <span className="text-[10px] text-cubby-taupe font-semibold">
                      ({groupItems.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {groupItems.map((item) => (
                      <SwipeableItemCard
                        key={item.id}
                        item={item}
                        isExpanded={expandedId === item.id}
                        onToggle={() => toggleExpand(item.id)}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                </div>
              );
            })
        ) : (
          // Flat list for other sort modes
          <div className="space-y-2">
            {sorted.map((item) => (
              <SwipeableItemCard
                key={item.id}
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={() => toggleExpand(item.id)}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
