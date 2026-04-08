"use client";

/**
 * Eat Me Soon Carousel
 *
 * Horizontal scroll carousel of flippable tiles.
 * Front: food emoji + name + days left
 * Back: waste cost estimate + "Used it" / "Gone" CTAs
 *
 * Data: real inventory items expiring within 5 days, ordered soonest first.
 */

import { useEffect, useState } from "react";
import { cn, getCategoryEmoji, formatMoney } from "@/lib/utils";

interface EatMeSoonItem {
  id: string;
  name: string;
  category: string;
  daysLeft: number;
  wastedCostEstimate?: number;
}

// Rough cost estimates by category (£)
const CATEGORY_COST: Record<string, number> = {
  meat: 4.5,
  poultry: 4.0,
  fish: 3.5,
  seafood: 3.5,
  dairy: 1.2,
  produce: 1.5,
  bakery: 1.0,
  deli: 2.5,
  leftovers: 2.0,
  default: 1.5,
};

function estimateCost(category: string): number {
  const key = category.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_COST)) {
    if (key.includes(k)) return v;
  }
  return CATEGORY_COST.default;
}

function EatMeSoonTile({
  item,
  onAction,
}: {
  item: EatMeSoonItem;
  onAction: (id: string, action: "eaten" | "binned") => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      onClick={() => setFlipped(!flipped)}
      className="w-36 flex-shrink-0 h-48 relative"
      style={{ perspective: "600px" }}
    >
      <div
        className="w-full h-full relative transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 cubby-card flex flex-col items-center justify-center gap-2 p-3"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-4xl">{getCategoryEmoji(item.category)}</span>
          <p className="font-black text-cubby-charcoal text-sm text-center leading-tight line-clamp-2">
            {item.name}
          </p>
          <span
            className={cn(
              "text-xs font-black px-2 py-0.5 rounded-full",
              item.daysLeft <= 0
                ? "bg-cubby-urgent/10 text-cubby-urgent"
                : item.daysLeft === 1
                ? "bg-cubby-urgent/10 text-cubby-urgent"
                : "bg-cubby-salmon/10 text-cubby-salmon"
            )}
          >
            {item.daysLeft <= 0
              ? "Today!"
              : item.daysLeft === 1
              ? "Tomorrow"
              : `${item.daysLeft}d left`}
          </span>
          <p className="text-[10px] text-cubby-taupe">Tap to flip</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 cubby-card bg-cubby-green flex flex-col items-center justify-between p-4"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="text-center">
            <p className="text-white text-xs font-semibold opacity-70">Worth</p>
            <p className="text-white font-black text-lg">
              {formatMoney(item.wastedCostEstimate ?? 1.5)}
            </p>
          </div>
          <div className="w-full space-y-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(item.id, "eaten");
              }}
              className="w-full bg-cubby-lime text-cubby-green font-black text-sm py-2 rounded-full"
            >
              ✓ Used it!
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(item.id, "binned");
              }}
              className="w-full bg-white/20 text-white font-semibold text-xs py-2 rounded-full"
            >
              Gone 😔
            </button>
          </div>
        </div>
      </div>
    </button>
  );
}

export function EatMeSoonCarousel() {
  const [items, setItems] = useState<EatMeSoonItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(({ items: raw }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const soon: EatMeSoonItem[] = (raw ?? [])
          .filter((item: { expiryDate: string | null }) => item.expiryDate)
          .map((item: { id: string; name: string; category: string; expiryDate: string }) => {
            const exp = new Date(item.expiryDate);
            exp.setHours(0, 0, 0, 0);
            const daysLeft = Math.round((exp.getTime() - today.getTime()) / 86400000);
            return {
              id: item.id,
              name: item.name,
              category: item.category ?? "default",
              daysLeft,
              wastedCostEstimate: estimateCost(item.category ?? ""),
            };
          })
          .filter((item: EatMeSoonItem) => item.daysLeft <= 5)
          .sort((a: EatMeSoonItem, b: EatMeSoonItem) => a.daysLeft - b.daysLeft);

        setItems(soon);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, action: "eaten" | "binned") => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action === "eaten" ? "EATEN" : "THROWN_OUT" }),
    });
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-section-head text-cubby-charcoal">Eat Me Soon 🍽️</h2>
        <span className="text-xs text-cubby-taupe font-semibold">{items.length} items</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {items.map((item) => (
          <EatMeSoonTile key={item.id} item={item} onAction={handleAction} />
        ))}
      </div>
    </div>
  );
}
