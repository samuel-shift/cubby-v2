import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const userId = await getRequiredUserId();

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

  const items = await prisma.inventoryItem.findMany({
    where: {
      userId,
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

  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
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

  const filterContext = [
    filters.maxCookTime ? `Max total cook time: ${filters.maxCookTime} minutes` : null,
    filters.mealType ? `Meal type: ${filters.mealType}` : null,
    filters.difficulty ? `Difficulty: ${filters.difficulty}` : null,
  ]
    .filter(Boolean)
    .join("\n");

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-3-5-haiku-latest",
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
