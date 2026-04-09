"use client";

/**
 * ExpiryBanners — Embedded on home screen (NOT behind a tap)
 *
 * Gap analysis critical note: "Returning users need to see '3 items expiring soon'
 * within 2 seconds of opening the app. This is the retention hook."
 *
 * Shows urgent/critical items directly on the home screen.
 * Each banner has TWO CTAs: "Get recipe" (primary) and "Use it" (secondary).
 * Red banners for expired, amber for expiring soon.
 */

import { AlertTriangle, BookOpen } from "lucide-react";
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

  const expiredCount = urgentItems.filter((i) => i.daysLeft < 0).length;
  const soonCount = urgentItems.filter((i) => i.daysLeft >= 0).length;

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-cubby-urgent" />
          <span className="text-sm font-black text-cubby-urgent">
            {expiredCount > 0 && `${expiredCount} expired`}
            {expiredCount > 0 && soonCount > 0 && " · "}
            {soonCount > 0 &&
              `${soonCount} ${soonCount === 1 ? "item" : "items"} expiring soon`}
          </span>
        </div>
        <Link
          href="/recipes"
          className="flex items-center gap-1 text-xs text-cubby-green font-black"
        >
          <BookOpen className="w-3 h-3" />
          Get recipes →
        </Link>
      </div>

      {/* Expiry banners — red for expired, amber for expiring soon */}
      {urgentItems.map((item) => {
        const isExpired = item.daysLeft < 0;
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
              isExpired
                ? "bg-cubby-urgent/8 border-cubby-urgent/25"
                : "bg-amber-50 border-amber-300/30"
            }`}
          >
            <span className="text-2xl">{item.categoryEmoji ?? "📦"}</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-cubby-charcoal text-sm truncate">
                {item.name}
              </p>
              <p
                className={`text-xs font-semibold ${
                  isExpired ? "text-cubby-urgent" : "text-amber-600"
                }`}
              >
                {item.daysLeft < 0
                  ? `Expired ${Math.abs(item.daysLeft)}d ago`
                  : item.daysLeft === 0
                  ? "Expires today!"
                  : item.daysLeft === 1
                  ? "Expires tomorrow"
                  : `${item.daysLeft} days left`}
              </p>
            </div>
            <Link
              href={`/recipes?highlight=${encodeURIComponent(item.name)}`}
              className="text-[11px] font-black text-cubby-green bg-cubby-lime/30 px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              🍳 Recipe
            </Link>
          </div>
        );
      })}
    </div>
  );
}
