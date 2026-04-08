/**
 * POST /api/log/vision
 *
 * Claude Vision endpoint — accepts an image (base64 or URL) and entry type,
 * returns extracted inventory items.
 *
 * entryType: "receipt" | "snapshot" | "meal" | "waste"
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPTS: Record<string, string> = {
  receipt: `You are a grocery receipt parser. Extract all food items from the receipt image.
For each item return: name, brand (if visible), quantity (number), unit (if applicable), category.
Estimate expiry days based on typical shelf life: dairy ~7d, produce ~5d, meat ~3d, bread ~5d, canned ~365d, frozen ~90d.
Return JSON array: [{name, brand, quantity, unit, category, estimatedExpiryDays, confidence: "high"|"medium"|"low"}]`,

  snapshot: `You are a kitchen inventory scanner. Identify all visible food items in the kitchen photo.
For each item return: name, quantity (estimate), unit, category, storageLocation (fridge/counter/cupboard/pantry).
Return JSON array: [{name, quantity, unit, category, storageLocation, confidence: "high"|"medium"|"low"}]`,

  meal: `You are a meal ingredient identifier. Given a photo of a cooked meal, identify the likely ingredients used.
Return JSON array of consumed/used items: [{name, quantity, unit, category}]`,

  waste: `You are a food waste logger. Given a photo of food being thrown away, identify the wasted items.
Estimate the approximate monetary value wasted (GBP).
Return JSON: {items: [{name, quantity, unit, category, estimatedCost}], totalEstimatedWaste}`,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { imageBase64, imageUrl, entryType } = await req.json();

  if (!entryType || !SYSTEM_PROMPTS[entryType]) {
    return NextResponse.json({ error: "Invalid entryType" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageSource: any = imageBase64
    ? { type: "base64", media_type: "image/jpeg", data: imageBase64 }
    : { type: "url", url: imageUrl };

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPTS[entryType],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: imageSource },
          { type: "text", text: "Please extract all food items from this image as instructed." },
        ] as any,
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
    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ extracted, entryType });
  } catch {
    return NextResponse.json({ error: "Invalid JSON from AI", raw: text }, { status: 422 });
  }
}
