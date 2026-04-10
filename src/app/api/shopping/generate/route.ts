/**
 * POST /api/shopping/generate — AI-powered smart shopping list generator
 *
 * Analyses the user's inventory history, consumption patterns, expiry data,
 * and saved recipes to generate a personalised weekly shopping list.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;

const anthropic = new Anthropic();

export async function POST() {
  const userId = await getRequiredUserId();

  try {
    // ── 1. Gather all the data Claude needs ──────────────────────────────

    // Currently in kitchen (active inventory)
    const activeItems = await prisma.inventoryItem.findMany({
      where: { userId, status: "ACTIVE" },
      select: { name: true, quantity: true, unit: true, category: true, expiryDate: true, location: true },
    });

    // Consumption history — last 30 days (eaten + thrown out)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const consumedItems = await prisma.inventoryItem.findMany({
      where: {
        userId,
        status: { in: ["EATEN", "THROWN_OUT"] },
        statusUpdatedAt: { gte: thirtyDaysAgo },
      },
      select: { name: true, quantity: true, unit: true, category: true, status: true, statusUpdatedAt: true, purchaseDate: true },
      orderBy: { statusUpdatedAt: "desc" },
    });

    // Purchase frequency — all-time repeat purchases
    const purchaseFrequency = await prisma.inventoryItem.groupBy({
      by: ["name"],
      where: { userId },
      _count: { name: true },
      orderBy: { _count: { name: "desc" } },
      take: 50,
    });

    // Saved recipes
    const savedRecipes = await prisma.savedRecipe.findMany({
      where: { userId },
      select: { title: true, ingredients: true },
      take: 10,
    });

    // Current shopping list (so we don't duplicate)
    const existingList = await prisma.shoppingList.findFirst({
      where: { userId },
      include: { items: { where: { checked: false }, select: { name: true } } },
    });
    const alreadyOnList = existingList?.items.map((i) => i.name) ?? [];

    // ── 2. Build the prompt ──────────────────────────────────────────────

    const activeStr = activeItems.length > 0
      ? activeItems.map((i) => {
          const expiry = i.expiryDate
            ? `expires ${i.expiryDate.toISOString().split("T")[0]}`
            : "no expiry";
          return `- ${i.name} (${i.quantity}${i.unit ? " " + i.unit : ""}, ${i.location?.toLowerCase() ?? "unknown"}, ${expiry})`;
        }).join("\n")
      : "Kitchen is empty.";

    // Compute consumption patterns
    const consumptionMap = new Map<string, { eaten: number; wasted: number; lastUsed: string }>();
    for (const item of consumedItems) {
      const key = item.name.toLowerCase();
      const existing = consumptionMap.get(key) ?? { eaten: 0, wasted: 0, lastUsed: "" };
      if (item.status === "EATEN") existing.eaten++;
      if (item.status === "THROWN_OUT") existing.wasted++;
      if (!existing.lastUsed && item.statusUpdatedAt) {
        existing.lastUsed = item.statusUpdatedAt.toISOString().split("T")[0];
      }
      consumptionMap.set(key, existing);
    }

    const consumptionStr = consumptionMap.size > 0
      ? [...consumptionMap.entries()].map(([name, data]) => {
          const parts = [`${name}: eaten ${data.eaten}x`];
          if (data.wasted > 0) parts.push(`wasted ${data.wasted}x`);
          parts.push(`last: ${data.lastUsed}`);
          return `- ${parts.join(", ")}`;
        }).join("\n")
      : "No consumption history yet.";

    const frequencyStr = purchaseFrequency.length > 0
      ? purchaseFrequency.filter((p) => p._count.name >= 2).map((p) =>
          `- ${p.name}: bought ${p._count.name}x`
        ).join("\n") || "No repeat purchases yet."
      : "No purchase data yet.";

    const recipesStr = savedRecipes.length > 0
      ? savedRecipes.map((r) => {
          const ings = (r.ingredients as Array<{ name: string; amount?: number; unit?: string }>)
            ?.map((i) => i.name).join(", ");
          return `- ${r.title}: ${ings}`;
        }).join("\n")
      : "No saved recipes.";

    const alreadyOnListStr = alreadyOnList.length > 0
      ? alreadyOnList.join(", ")
      : "Empty.";

    const prompt = `You are a smart shopping assistant for a UK household. Based on the user's kitchen data, generate a personalised weekly shopping list.

## Current Kitchen Inventory
${activeStr}

## Consumption Patterns (Last 30 Days)
${consumptionStr}

## Purchase Frequency (All-Time)
${frequencyStr}

## Saved Recipes (Favourites)
${recipesStr}

## Already On Shopping List
${alreadyOnListStr}

## Instructions
1. Suggest items the user needs to RESTOCK based on consumption rate and what's running low or missing
2. DEPRIORITISE items they waste often — suggest smaller quantities or skip entirely
3. Include staples they buy regularly but don't currently have
4. Check their saved recipes and include missing ingredients for 2-3 of them
5. DON'T suggest items already in their kitchen or already on their shopping list
6. Suggest realistic UK supermarket quantities (e.g. "1kg chicken breast" not "500g chicken")
7. Include a mix of categories (produce, protein, dairy, dry goods, etc.)
8. Aim for 8-15 items — a realistic weekly shop, not an overwhelming list

Return a JSON array of objects. Each object must have:
- "name": item name (string, capitalised, e.g. "Chicken Breast")
- "quantity": number (e.g. 1)
- "unit": unit string or null (e.g. "kg", "pack", "pint", null for individual items)
- "category": one of: "produce", "meat", "dairy", "bakery", "frozen", "dry", "condiments", "snacks", "drinks", "household", "other"
- "reason": brief reason this was suggested (max 8 words, e.g. "You use 1kg/week", "Low — expires tomorrow", "For your Chicken Stir Fry recipe")

Return ONLY the JSON array, no markdown, no explanation.`;

    // ── 3. Call Claude ───────────────────────────────────────────────────

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[shopping/generate] No JSON array found in response:", text);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const items = JSON.parse(jsonMatch[0]) as Array<{
      name: string;
      quantity: number;
      unit: string | null;
      category: string;
      reason: string;
    }>;

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[shopping/generate] Error:", err);
    return NextResponse.json({ error: "Failed to generate shopping list" }, { status: 500 });
  }
}
