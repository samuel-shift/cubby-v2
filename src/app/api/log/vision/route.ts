/**
 * POST /api/log/vision
 *
 * Claude Vision endpoint — accepts an image (base64 or URL) and entry type,
 * returns extracted inventory items.
 *
 * entryType: "receipt" | "snapshot" | "meal" | "waste"
 */
import { NextRequest, NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/auth-helpers";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPTS: Record<string, string> = {
  receipt: `You are a grocery receipt parser. Extract all food items from the receipt image.
For each item return: name, brand (if visible), quantity (number), unit (if applicable), category.
Estimate expiry days based on typical shelf life: dairy ~7d, produce ~5d, meat ~3d, bread ~5d, canned ~365d, frozen ~90d.
Return ONLY a valid JSON array, no explanation: [{name, brand, quantity, unit, category, estimatedExpiryDays, confidence: "high"|"medium"|"low"}]`,

  snapshot: `You are a kitchen inventory scanner. Look at this kitchen photo and list every visible food item.
Be thorough — check shelves, fridge contents, counters, any packaging visible.
For each item return: name (specific product name), quantity (number estimate), unit (g/ml/items), category (produce/dairy/meat/bakery/frozen/canned/condiment/snacks/drinks/other), storageLocation (fridge/freezer/counter/cupboard/pantry), confidence (high/medium/low).
Return ONLY a valid JSON array with no explanation or markdown: [{name, quantity, unit, category, storageLocation, confidence}]`,

  meal: `You are a smart meal identifier for a kitchen inventory app called Cubby. Given a photo of a cooked meal:

1. First, identify WHAT the meal is (e.g. "Spaghetti Bolognese", "Chicken Stir Fry", "Lamb Kofta with Rice")
2. Then list the likely raw ingredients that went into making it, with realistic UK household quantities

Return ONLY valid JSON with no explanation or markdown:
{
  "mealName": "Name of the identified meal",
  "mealEmoji": "single emoji representing the meal",
  "confidence": "high" | "medium" | "low",
  "ingredients": [{"name": "Ingredient Name", "quantity": 1, "unit": "kg", "category": "meat|produce|dairy|dry|condiments|other"}]
}

Be specific with ingredient names (e.g. "Chicken Breast" not just "chicken", "Minced Beef" not just "beef").
Use realistic UK cooking quantities (e.g. 500g minced beef, 1 onion, 2 cloves garlic).
Category must be one of: meat, produce, dairy, bakery, dry, condiments, frozen, snacks, drinks, other.`,

  waste: `You are a food waste logger. Given a photo of food being thrown away, identify the wasted items.
Estimate the approximate monetary value wasted (GBP).
Return ONLY valid JSON, no explanation: {items: [{name, quantity, unit, category, estimatedCost}], totalEstimatedWaste}`,
};

// Use faster haiku model for snapshot (speed > accuracy for inventory scan)
// Use opus for receipt (accuracy critical for line-item parsing)
const MODEL_MAP: Record<string, string> = {
  receipt:  "claude-sonnet-4-6",
  snapshot: "claude-sonnet-4-6",
  meal:     "claude-sonnet-4-6",
  waste:    "claude-sonnet-4-6",
};

export async function POST(req: NextRequest) {
  await getRequiredUserId(); // ensure user exists (real or demo)

  const { imageBase64, entryType } = await req.json();

  if (!entryType || !SYSTEM_PROMPTS[entryType]) {
    return NextResponse.json({ error: "Invalid entryType" }, { status: 400 });
  }

  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  const imageSource = {
    type: "base64" as const,
    media_type: "image/jpeg" as const,
    data: imageBase64,
  };

  const model = MODEL_MAP[entryType] ?? "claude-sonnet-4-6";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPTS[entryType],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: imageSource },
          { type: "text", text: "Please extract all food items from this image as instructed." },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Could not parse AI response", raw: text }, { status: 422 });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // For meal type, return the structured meal object
    if (entryType === "meal" && parsed.mealName) {
      return NextResponse.json({
        mealName: parsed.mealName,
        mealEmoji: parsed.mealEmoji ?? "🍽️",
        confidence: parsed.confidence ?? "medium",
        extracted: parsed.ingredients ?? [],
        entryType,
      });
    }

    const extracted = Array.isArray(parsed) ? parsed : parsed.items ?? parsed;
    return NextResponse.json({ extracted, entryType });
  } catch {
    return NextResponse.json({ error: "Invalid JSON from AI", raw: text }, { status: 422 });
  }
}
