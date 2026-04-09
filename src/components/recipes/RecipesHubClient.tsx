"use client";

/**
 * RecipesHubClient — Dual-tab layout for the Recipes page
 *
 * Tab 1: "My Pantry" — full inventory browser (moved from home page)
 * Tab 2: "Recipes"   — AI recipe generation feed
 *
 * Follows the same pattern as ShoppingClient (segmented control tabs).
 */

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UtensilsCrossed, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryHome } from "@/components/home/InventoryHome";
import { RecipeFeedClient } from "@/components/recipes/RecipeFeedClient";

type Tab = "pantry" | "recipes";

export function RecipesHubClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "pantry" ? "pantry" : "recipes";
  const [tab, setTab] = useState<Tab>(initialTab);

  // Sync tab with URL params (e.g. when arriving from QuickStats link)
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab === "pantry" || urlTab === "recipes") {
      setTab(urlTab);
    }
  }, [searchParams]);

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-cubby-stone">
      {/* ── Header with segmented control ── */}
      <div className="bg-cubby-stone px-4 pt-14 pb-3 sticky top-0 z-10">
        <h1 className="font-black text-cubby-charcoal text-2xl mb-3">
          {tab === "pantry" ? "My Pantry" : "Recipe Ideas"} {tab === "pantry" ? "🏠" : "👩‍🍳"}
        </h1>

        {/* Segmented control — same style as Shopping page */}
        <div className="bg-cubby-cream rounded-2xl p-1 flex gap-1">
          {([
            { id: "pantry" as Tab, label: "My Pantry", icon: Package },
            { id: "recipes" as Tab, label: "Recipes", icon: UtensilsCrossed },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all",
                tab === id
                  ? "bg-cubby-green text-white shadow-sm"
                  : "text-cubby-taupe active:scale-[0.97]"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {tab === "pantry" ? (
        <div className="px-4 pb-28 mt-2">
          <InventoryHome />
        </div>
      ) : (
        <RecipeFeedClient />
      )}
    </div>
  );
}
