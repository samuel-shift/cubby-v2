/**
 * GET /api/recipes/generate
 *
 * Generates personalised recipes using Claude based on the user's pantry inventory.
 * Prioritises items expiring soon.
 * Returns recipes with inInventory flags on ingredients for cross-pollination.
 *
 * Query params:
 * - maxCookTime: number (minutes)
 * - mealType: "breakfast" | "lunch" | "dinner" | "snack"
 * - difficulty: "easy" | "medium" | "hard"
 * - fridgeOnly: "true" â only use fridge items
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const maxCookTime = params.get("maxCookTime");
  const mealType = params.get("mealType");
  const difficulty = params.get("difficulty");
  const fridgeOnly = params.get("fridgeOnly") === "true";

  try {
    // Fetch user's active inventory
    const inventoryWhere: Record<string, unknown> = {
      userId: session.user.id,
      status: "ACTIVE",
    };
    if (fridgeOnly) {
      inventoryWhere.location = "FRIDGE";
    }

    const items = await prisma.inventoryItem.findMany({
      where: inventoryWhere,
      select: {
        name: true,
        category: true,
        expiryDate: true,
        location: true,
      },
      orderBy: { expiryDate: "asc" },
    });

    if (items.length === 0) {
      return NextResponse.json({
        recipes: [],
        inventoryCount: 0,
        message: "No items in your kitchen. Add items first to get recipe ideas!",
      });
    }

    // Fetch user dietary preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dietaryNeeds: true, allergens: true },
    });

    // Build inventory summary for Claude
    const now = new Date();
    const itemList = items.map((item) => {
      const daysLeft = item.expiryDate
        ? Math.ceil((item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        name: item.name,
        category: item.category,
        location: item.location,
        daysLeft,
        expiringSoon: daysLeft !== null && daysLeft <= 3,
      };
    });

    const expiringItems = itemList.filter((i) => i.expiringSoon).map((i) => i.name);
    const allItemNames = new Set(itemList.map((i) => i.name.toLowerCase()));

    // Build prompt
    const filterConstraints: string[] = [];
    if (maxCookTime) filterConstraints.push(`Maximum cook time: ${maxCookTime} minutes`);
    if (mealType) filterConstraints.push(`Meal type: ${mealType}`);
    if (difficulty) filterConstraints.push(`Difficulty: ${difficulty}`);
    if (user?.dietaryNeeds?.length) filterConstraints.push(`Dietary needs: ${user.dietaryNeeds.join(", ")}`);
    if (user?.allergens?.length) filterConstraints.push(`Must avoid allergens: ${user.allergens.join(", ")}`);

    const prompt = `You are a creative UK-based home chef. Generate 6 recipe ideas based on the user's current kitchen inventory.

INVENTORY (${items.length} items):
${itemList.map((i) => `- ${i.name} (${i.category}, ${i.location}${i.daysLeft !== null ? `, ${i.daysLeft}d left` : ""})`).join("\n")}

${expiringItems.length > 0 ? `\nPRIORITY â These items expire soon, try to use them: ${expiringItems.join(", ")}` : ""}

${filterConstraints.length > 0 ? `\nCONSTRAINTS:\n${filterConstraints.map((c) => `- ${c}`).join("\n")}` : ""}

Return a JSON array of 6 recipes. Each recipe must have:
{
  "title": "string",
  "description": "short appetising description",
  "cookTime": number (minutes),
  "prepTime": number (minutes),
  "servings": number,
  "difficulty": "easy" | "medium" | "hard",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "cuisine": "string",
  "ingredients": [{"name": "string", "amount": "string", "unit": "string"}],
  "instructions": ["step 1", "step 2", ...],
  "tags": ["string"],
  "usesExpiringItems": boolean,
  "expiringIngredients": ["item names that are expiring"]
}

Rules:
- Prioritise recipes that use expiring items
- Include a mix of quick meals and more involved dishes
- All measurements in metric (g, ml, etc.)
- Keep instructions clear and concise
- Include 2-3 recipes that can be made ENTIRELY from inventory items
- For other recipes, minimise the number of extra ingredients needed
- Return ONLY the JSON array, no other text`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    let recipes: Recipe[];
    try {
      // Try to extract JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      recipes = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[recipes/generate] Failed to parse response:", text);
      return NextResponse.json({ error: "Failed to parse recipes" }, { status: 500 });
    }

    // Enrich recipes with inInventory flags
    const enrichedRecipes = recipes.map((recipe: Recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ing: { name: string; amount: string; unit: string }) => ({
        ...ing,
        inInventory: allItemNames.has(ing.name.toLowerCase()),
      })),
    }));

    return NextResponse.json({
      recipes: enrichedRecipes,
      inventoryCount: items.length,
    });
  } catch (err) {
    console.error("[recipes/generate] Error:", err);
    return NextResponse.json({ error: "Failed to generate recipes" }, { status: 500 });
  }
}

interface Recipe {
  title: string;
  description: string;
  cookTime: number;
  servings: number;
  prepTime?: number;
  difficulty: string;
  mealType: string;
  cuisine?: string;
  ingredients: Array<{ name: string; amount: string; unit: string }>;
  instructions: string[];
  tags: string[];
  usesExpiringItems?: boolean;
  expiringIngredients?: string[];
}
/**
 * POST /api/recipes/generate
 * Streams AI-generated recipe suggestions based on current inventory.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    cookFromFridgeOnly = false,
    filters = {},
    count = 6,
  } = body as {
    cookFromFridgeOnly?: boolean;
    filters?: { maxCookTime?: number; mealType?: string; difficulty?: string };
    count?: number;
  };

  // ── Fetch inventory ──────────────────────────────────────────────────────
  const items = await prisma.inventoryItem.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      ...(cookFromFridgeOnly ? { location: "FRIDGE" } : {}),
    },
    select: { name: true, quantity: true, unit: true, expiryDate: true, location: true },
  });

  if (items.length === 0) {
    return NextResponse.json({ error: "No inventory items" }, { status: 400 });
  }

  const now = new Date();
  const inventoryLines = items.map((item) => {
    const expiringSoon =
      item.expiryDate &&
      (item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 5;
    const qty = [item.quantity, item.unit].filter(Boolean).join(" ");
    return `- ${item.name}${qty ? ` (${qty})` : ""}${expiringSoon ? " ⚠️ expiring soon" : ""}`;
  });

  // ── Fetch user preferences ───────────────────────────────────────────────
  const userProfile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dietaryNeeds: true, allergens: true },
  });

  const dietaryContext = [
    userProfile?.dietaryNeeds?.length
      ? `Dietary needs: ${userProfile.dietaryNeeds.join(", ")}`
      : null,
    userProfile?.allergens?.length
      ? `Allergens to avoid: ${userProfile.allergens.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  // ── Build filter context ─────────────────────────────────────────────────
  const filterContext = [
    filters.maxCookTime ? `Max total cook time: ${filters.maxCookTime} minutes` : null,
    filters.mealType ? `Meal type: ${filters.mealType}` : null,
    filters.difficulty ? `Difficulty: ${filters.difficulty}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // ── Prompt ───────────────────────────────────────────────────────────────
  const prompt = `You are a helpful home cooking assistant. Generate ${count} recipe suggestions based on the user's current pantry inventory.

INVENTORY:
${inventoryLines.join("\n")}

${dietaryContext ? `USER PREFERENCES:\n${dietaryContext}\n` : ""}
${filterContext ? `FILTERS:\n${filterContext}\n` : ""}

IMPORTANT: Items marked with ⚠️ are expiring soon — prioritise recipes that use them.

Return ONLY a JSON array of recipe objects. No markdown, no explanation, just the raw JSON array.

Each recipe object must have exactly this shape:
{
  "title": "Recipe Name",
  "description": "One sentence description",
  "mealType": "breakfast|lunch|dinner|snack",
  "difficulty": "Easy|Medium|Hard",
  "prepTime": 10,
  "cookTime": 20,
  "servings": 4,
  "cuisine": "Italian",
  "dietaryTags": ["vegetarian", "gluten-free"],
  "expiryItemsUsed": ["chicken", "spinach"],
  "ingredients": [
    { "name": "chicken breast", "quantity": "400g", "inInventory": true },
    { "name": "olive oil", "quantity": "2 tbsp", "inInventory": false }
  ],
  "instructions": [
    "Step one instructions here.",
    "Step two instructions here."
  ]
}

Rules:
- Use ingredients from the inventory where possible, marking inInventory: true
- Mark inInventory: false for any ingredient not in the inventory list
- expiryItemsUsed should list names of ⚠️ expiring items used in the recipe
- prepTime and cookTime are integers in minutes
- Return exactly ${count} recipes
- Vary the meal types and difficulty levels`;

  // ── Stream ───────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        console.error("Recipe generation error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  });
}
