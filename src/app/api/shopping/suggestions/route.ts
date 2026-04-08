/**
 * GET /api/shopping/suggestions
 *
 * Returns smart suggestions for the shopping list based on:
 * 1. Frequently added items (from inventory history)
 * 2. Recently consumed/binned items (running low)
 * 3. Items from saved recipes not in pantry
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Suggestion {
  name: string;
  reason: string;
  emoji: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  dairy: "🥛",
  produce: "🥦",
  meat: "🥩",
  bakery: "🍞",
  frozen: "🧊",
  dry: "🥫",
  tinned: "🥫",
  sauces: "🫙",
  condiments: "🫙",
  snacks: "🍪",
  drinks: "🥤",
  spices: "🧂",
  oils: "🫒",
  deli: "🥪",
  household: "🧹",
};

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json([]);
  }

  try {
    const suggestions: Suggestion[] = [];
    const seen = new Set<string>();

    // 1. Recently consumed/binned items — "running low"
    const recentlyUsed = await prisma.inventoryItem.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["EATEN", "THROWN_OUT"] },
        statusUpdatedAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // last 14 days
        },
      },
      select: { name: true, category: true },
      orderBy: { statusUpdatedAt: "desc" },
      take: 20,
    });

    // Check which of these are NOT currently active in inventory
    const activeItems = await prisma.inventoryItem.findMany({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
      select: { name: true },
    });
    const activeNames = new Set(activeItems.map((i) => i.name.toLowerCase()));

    for (const item of recentlyUsed) {
      const lower = item.name.toLowerCase();
      if (!activeNames.has(lower) && !seen.has(lower)) {
        seen.add(lower);
        suggestions.push({
          name: item.name,
          reason: "running low",
          emoji: CATEGORY_EMOJI[item.category] || "🛒",
        });
      }
    }

    // 2. Frequently added items (all time, not currently in stock)
    const frequentItems = await prisma.inventoryItem.groupBy({
      by: ["name"],
      where: { userId: session.user.id },
      _count: { name: true },
      orderBy: { _count: { name: "desc" } },
      take: 30,
    });

    for (const item of frequentItems) {
      const lower = item.name.toLowerCase();
      if (!activeNames.has(lower) && !seen.has(lower) && item._count.name >= 2) {
        seen.add(lower);

        // Look up category for emoji
        const sample = await prisma.inventoryItem.findFirst({
          where: { userId: session.user.id, name: item.name },
          select: { category: true },
        });

        suggestions.push({
          name: item.name,
          reason: "frequently bought",
          emoji: CATEGORY_EMOJI[sample?.category || ""] || "🛒",
        });
      }
    }

    // 3. Recipe ingredients not in pantry
    const savedRecipes = await prisma.savedRecipe.findMany({
      where: { userId: session.user.id },
      select: { ingredients: true },
      take: 10,
    });

    for (const recipe of savedRecipes) {
      const ingredients = recipe.ingredients as Array<{ name: string }>;
      if (!Array.isArray(ingredients)) continue;

      for (const ing of ingredients) {
        const lower = ing.name?.toLowerCase();
        if (lower && !activeNames.has(lower) && !seen.has(lower)) {
          seen.add(lower);
          suggestions.push({
            name: ing.name,
            reason: "recipe ingredient",
            emoji: "📖",
          });
        }
      }
    }

    return NextResponse.json(suggestions.slice(0, 15));
  } catch (err) {
    console.error("[shopping/suggestions] Error:", err);
    return NextResponse.json([]);
  }
}
