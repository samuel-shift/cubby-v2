"use client";

import { Coffee } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// Coffee goal — £3.50 per coffee, 20 coffees = £70 goal
const COFFEE_GOAL = 70;
const COFFEE_COST = 3.5;

export function MoneySavedTracker() {
  const [moneySaved] = useState(12.4); // TODO: fetch from user data
  const [animated, setAnimated] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const coffeeCount = Math.floor(moneySaved / COFFEE_COST);
  const progress = Math.min((moneySaved / COFFEE_GOAL) * 100, 100);

  // Animate on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="cubby-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
            Money saved
          </p>
          <p className="text-section-head text-cubby-charcoal">
            {formatMoney(moneySaved)}
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-cubby-pastel-yellow flex items-center justify-center">
          <Coffee className="w-6 h-6 text-amber-600" />
        </div>
      </div>

      {/* Progress bar toward coffee goal */}
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded-full bg-cubby-stone overflow-hidden">
          <div
            ref={barRef}
            className="h-full rounded-full bg-cubby-lime transition-all duration-1000 ease-out"
            style={{ width: animated ? `${progress}%` : "0%" }}
          />
        </div>
        <p className="text-xs text-cubby-taupe">
          {coffeeCount === 0
            ? "Keep going — your first free coffee is coming!"
            : `That's ${coffeeCount} free coffee${coffeeCount > 1 ? "s" : ""} ☕`}
          {" "}
          <span className="text-cubby-charcoal font-semibold">
            {formatMoney(COFFEE_GOAL - moneySaved)} to go
          </span>
        </p>
      </div>
    </div>
  );
}
