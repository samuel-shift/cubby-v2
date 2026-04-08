"use client";

/**
 * ExpiryBanners — Embedded on home screen (NOT behind a tap)
 *
 * Gap analysis critical note: "Returning users need to see '3 items expiring soon'
 * within 2 seconds of opening the app. This is the retention hook."
 *
 * Shows urgent/critical items directly on the home screen.
 * Links through to /pantry for the full list.
 */

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ExpiryItem {
  id: string;
  name: string;
  categoryEmoji: string | null;
  expiryDate: string | null;
  daysLeft: number;
}

export function ExpiryBanners() {
  const [urgentItems, setUrgentItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(({ items }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const urgent = items
          .filter((item: { expiryDate: string | null }) => item.expiryDate)
          .map((item: { id: string; name: string; categoryEmoji: string | null; expiryDate: string }) => {
            const exp = new Date(item.expiryDate);
            exp.setHours(0, 0, 0, 0);
            const daysLeft = Math.round((exp.getTime() - today.getTime()) / 86400000);
            return { ...item, daysLeft };
          })
          .filter((item: ExpiryItem) => item.daysLeft <= 3)
          .sort((a: ExpiryItem, b: ExpiryItem) => a.daysLeft - b.daysLeft)
          .slice(0, 3);

        setUrgentItems(urgent);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || urgentItems.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-cubby-urgent" />
          <span className="text-sm font-black text-cubby-urgent">
            {urgentItems.length} {urgentItems.length === 1 ? "item" : "items"} expiring soon
          </span>
        </div>
        <Link href="/pantry" className="text-xs text-cubby-taupe font-semibold">
          See all →
        </Link>
      </div>

      {/* Expiry banners */}
      {urgentItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 bg-cubby-urgent/5 border border-cubby-urgent/20 rounded-2xl px-4 py-3"
        >
          <span className="text-2xl">{item.categoryEmoji ?? "📦"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-cubby-charcoal text-sm truncate">{item.name}</p>
            <p className="text-xs text-cubby-urgent font-semibold">
              {item.daysLeft < 0
                ? "Expired"
                : item.daysLeft === 0
                ? "Expires today!"
                : item.daysLeft === 1
                ? "Expires tomorrow"
                : `${item.daysLeft} days left`}
            </p>
          </div>
          <Link
            href="/swipe"
            className="text-xs font-black text-cubby-green bg-cubby-lime/30 px-3 py-1.5 rounded-full"
          >
            Use it
          </Link>
        </div>
      ))}
    </div>
  );
}
