"use client";

import Link from "next/link";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";

export function MyKitchenCard() {
  const [itemCount, setItemCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(({ items }) => setItemCount(items.length))
      .catch(() => {});
  }, []);

  return (
    <Link href="/pantry">
      <div className="cubby-card px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cubby-green/10 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-cubby-green" />
          </div>
          <div>
            <p className="font-black text-cubby-charcoal">My Kitchen</p>
            <p className="text-sm text-cubby-taupe">
              {itemCount === null
                ? "Loading…"
                : `${itemCount} ${itemCount === 1 ? "item" : "items"} tracked`}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-cubby-taupe" />
      </div>
    </Link>
  );
}
