"use client";

/**
 * Eat Me Soon Carousel — ENTIRELY NEW, major feature
 *
 * Horizontal scroll carousel of flippable tiles.
 * Front: food emoji + name + days left
 * Back: waste cost estimate + "Use it" / "Gone" CTAs + "Why not?" prompt
 *
 * Note: Product photos deferred to V2. Using category emoji for V1.
 */

import { useState } from "react";
import { cn, getCategoryEmoji, formatMoney } from "@/lib/utils";

interface EatMeSoonItem {
  id: string;
  name: string;
  category: string;
  daysLeft: number;
  wastedCostEstimate?: number;
}

// TODO: Replace with real data from API
const MOCK_ITEMS: EatMeSoonItem[] = [
  { id: "1", name: "Spinach", category: "produce", daysLeft: 1, wastedCostEstimate: 1.8 },
  { id: "2", name: "Whole milk", category: "dairy", daysLeft: 2, wastedCostEstimate: 1.2 },
  { id: "3", name: "Chicken breast", category: "meat", daysLeft: 1, wastedCostEstimate: 4.5 },
];

function EatMeSoonTile({ item, onAction }: { item: EatMeSoonItem; onAction: (id: string, action: "eaten" | "binned") => void }) {
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
          <p className="font-black text-cubby-charcoal text-sm text-center leading-tight">{item.name}</p>
          <span className={cn(
            "text-xs font-black px-2 py-0.5 rounded-full",
            item.daysLeft <= 1 ? "bg-cubby-urgent/10 text-cubby-urgent" : "bg-cubby-salmon/10 text-cubby-salmon"
          )}>
            {item.daysLeft === 0 ? "Today!" : item.daysLeft === 1 ? "Tomorrow" : `${item.daysLeft}d`}
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
              {item.wastedCostEstimate ? formatMoney(item.wastedCostEstimate) : "~£1.50"}
            </p>
          </div>

          <div className="w-full space-y-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAction(item.id, "eaten"); }}
              className="w-full bg-cubby-lime text-cubby-green font-black text-sm py-2 rounded-full"
            >
              ✓ Used it!
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAction(item.id, "binned"); }}
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
  const [items, setItems] = useState(MOCK_ITEMS);

  const handleAction = (id: string, action: "eaten" | "binned") => {
    // TODO: Call PATCH /api/inventory/[id] with status
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-section-head text-cubby-charcoal">Eat Me Soon 🍽️</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {items.map((item) => (
          <EatMeSoonTile key={item.id} item={item} onAction={handleAction} />
        ))}
      </div>
    </div>
  );
}
