"use client";

/**
 * QuickStats — Compact inventory summary for the home dashboard
 *
 * Shows total items, items by storage location, and a CTA to view full pantry.
 * Replaces the full inventory list that used to dominate the home screen.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface StatsData {
  total: number;
  fridge: number;
  freezer: number;
  pantry: number;
  expiringSoon: number;
}

export function QuickStats() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(({ items }) => {
        if (!Array.isArray(items)) return;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const expiringSoon = items.filter((item: { expiryDate: string | null }) => {
          if (!item.expiryDate) return false;
          const exp = new Date(item.expiryDate);
          exp.setHours(0, 0, 0, 0);
          const daysLeft = Math.round((exp.getTime() - now.getTime()) / 86400000);
          return daysLeft <= 3;
        }).length;

        setStats({
          total: items.length,
          fridge: items.filter((i: { location: string }) => i.location === "FRIDGE").length,
          freezer: items.filter((i: { location: string }) => i.location === "FREEZER").length,
          pantry: items.filter((i: { location: string }) => ["PANTRY", "CUPBOARD", "COUNTER"].includes(i.location)).length,
          expiringSoon,
        });
      })
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="cubby-card p-4 animate-pulse">
        <div className="h-16 bg-cubby-stone rounded-2xl" />
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <Link href="/log" className="cubby-card p-4 flex items-center gap-3 active:scale-[0.99] transition-transform">
        <span className="text-3xl">🧺</span>
        <div className="flex-1">
          <p className="font-black text-cubby-charcoal text-sm">Your kitchen is empty</p>
          <p className="text-xs text-cubby-taupe mt-0.5">Log your first items to get started</p>
        </div>
        <ChevronRight className="w-4 h-4 text-cubby-taupe" />
      </Link>
    );
  }

  const locations = [
    { emoji: "❄️", label: "Fridge", count: stats.fridge },
    { emoji: "🧊", label: "Freezer", count: stats.freezer },
    { emoji: "🫙", label: "Pantry", count: stats.pantry },
  ].filter((l) => l.count > 0);

  return (
    <Link
      href="/recipes?tab=pantry"
      className="cubby-card p-4 active:scale-[0.99] transition-transform block"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏠</span>
          <p className="font-black text-cubby-charcoal text-sm">
            {stats.total} {stats.total === 1 ? "item" : "items"} in your kitchen
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-black text-cubby-green">
          View pantry
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex gap-2">
        {locations.map((loc) => (
          <div
            key={loc.label}
            className="flex-1 bg-cubby-stone rounded-2xl py-2.5 px-3 text-center"
          >
            <p className="text-lg leading-none">{loc.emoji}</p>
            <p className="font-black text-cubby-charcoal text-sm mt-1">{loc.count}</p>
            <p className="text-[10px] text-cubby-taupe font-semibold">{loc.label}</p>
          </div>
        ))}
        {stats.expiringSoon > 0 && (
          <div className="flex-1 bg-cubby-salmon/10 rounded-2xl py-2.5 px-3 text-center border border-cubby-salmon/20">
            <p className="text-lg leading-none">⚠️</p>
            <p className="font-black text-cubby-urgent text-sm mt-1">{stats.expiringSoon}</p>
            <p className="text-[10px] text-cubby-urgent font-semibold">Expiring</p>
          </div>
        )}
      </div>
    </Link>
  );
}
