/**
 * GET /api/shopping/suggestions
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  const nextAuth = await auth().catch(() => null);
  if (nextAuth?.user?.id) return nextAuth.user.id;
  const custom = await getSession();
  return custom?.userId ?? null;
}

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
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json([]);
  }

  try {
    const suggestions: Suggestion[] = [];
    const seen = new Set<string>();

    // 1. Recently consumed/binned items — "running low"
    const recentlyUsed = await prisma.inventoryItem.findMany({
      where: {
        userId,
        status: { in: ["EATEN", "THROWN_OUT"] },
        statusUpdatedAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      select: { name: true, category: true },
      orderBy: { statusUpdatedAt: "desc" },
      take: 20,
    });

    const activeItems = await prisma.inventoryItem.findMany({
      where: { userId, status: "ACTIVE" },
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
      where: { userId },
      _count: { name: true },
      orderBy: { _count: { name: "desc" } },
      take: 30,
    });

    for (const item of frequentItems) {
      const lower = item.name.toLowerCase();
      if (!activeNames.has(lower) && !seen.has(lower) && item._count.name >= 2) {
        seen.add(lower);

        const sample = await prisma.inventoryItem.findFirst({
          where: { userId, name: item.name },
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
      where: { userId },
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
