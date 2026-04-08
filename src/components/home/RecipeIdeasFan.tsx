"use client";

/**
 * Recipe Ideas Fan — stacked fan-style cards inline on home
 * Moved from separate /recipes tab to inline on home screen per new design.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const MOCK_RECIPES = [
  { id: "1", title: "Spinach & Egg Frittata", cookTime: 20, emoji: "🍳", matchReason: "Uses your spinach & eggs" },
  { id: "2", title: "Creamy Pasta", cookTime: 25, emoji: "🍝", matchReason: "Uses your milk & herbs" },
  { id: "3", title: "Quick Stir Fry", cookTime: 15, emoji: "🥘", matchReason: "Uses expiring veg" },
];

export function RecipeIdeasFan() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-section-head text-cubby-charcoal">Recipe Ideas 👩‍🍳</h2>
        <Link href="/recipes" className="text-xs text-cubby-taupe font-semibold flex items-center gap-1">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Fan/stack layout: cards stacked with offset */}
      <div className="relative h-36">
        {MOCK_RECIPES.slice(0, 3).map((recipe, i) => (
          <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
            <div
              className="absolute inset-x-0 cubby-card px-4 py-4 flex items-center gap-4 active:scale-[0.98] transition-all duration-200"
              style={{
                top: `${i * 10}px`,
                zIndex: 3 - i,
                opacity: 1 - i * 0.15,
                transform: `scale(${1 - i * 0.02})`,
              }}
            >
              <span className="text-3xl">{recipe.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-cubby-charcoal text-sm truncate">{recipe.title}</p>
                <p className="text-xs text-cubby-taupe truncate">{recipe.matchReason}</p>
              </div>
              <span className="text-xs text-cubby-taupe flex-shrink-0">{recipe.cookTime}m</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
