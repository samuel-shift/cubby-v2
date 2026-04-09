/**
 * POST /api/inventory/snapshot
 *
 * Analyse one or more kitchen photos using Claude Vision and return a list of
 * detected food items with confidence scores.
 *
 * Ported from cubby-v1 — this is the proven, working snapshot endpoint.
 *
 * Request body:
 *   { images: [{ data: string (pure base64), mimeType: "image/jpeg" | "image/png" | "image/webp" }] }
 *
 * Response:
 *   { items: DetectedItem[], inferredLocation: string | null, error: string | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/auth-helpers";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InputImage {
  data: string; // pure base64 — no "data:image/..." prefix
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

export interface DetectedItem {
  productName: string;
  brand: string | null;
  category: string;
  storageLocation: "FRIDGE" | "FREEZER" | "PANTRY" | "OTHER";
  quantity: number;
  unit: string | null;
  confidence: number; // 0.0 – 1.0
}

interface VisionResult {
  items: DetectedItem[];
  inferredLocation: "FRIDGE" | "FREEZER" | "PANTRY" | null;
  error: "TOO_DARK" | "NO_FOOD" | "BLURRY" | null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function POST(req: NextRequest) {
  await getRequiredUserId(); // ensure user exists (real or demo)

  let body: { images: InputImage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.images || body.images.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }

  if (body.images.length > 5) {
    return NextResponse.json({ error: "Maximum 5 images per request" }, { status: 400 });
  }

  const imageCount = body.images.length;

  // Validate and narrow mimeType to the Anthropic SDK's allowed union
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

  function isAllowedMimeType(m: string): m is AllowedMimeType {
    return (ALLOWED_MIME_TYPES as readonly string[]).includes(m);
  }

  // Build Anthropic image content blocks with correct types
  const imageBlocks = body.images.map((img) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: isAllowedMimeType(img.mimeType)
        ? img.mimeType
        : ("image/jpeg" as AllowedMimeType),
      data: img.data,
    },
  }));

  const userPrompt = `Analyse ${imageCount > 1 ? `these ${imageCount} kitchen photos` : "this kitchen photo"} and identify all visible food items.

Return ONLY a JSON object matching this exact structure (no markdown, no code fences, no extra text):
{
  "items": [
    {
      "productName": "Full descriptive product name",
      "brand": "Brand name, or null if not visible",
      "category": "One of: Meat, Poultry, Fish, Dairy, Eggs, Vegetables, Fruit, Bread, Leftovers, Deli, Drinks, Condiments, Frozen, Snacks, Bakery, Pasta, Canned, Other",
      "storageLocation": "FRIDGE or FREEZER or PANTRY or OTHER",
      "quantity": 1,
      "unit": "pcs or g or ml or null",
      "confidence": 0.9
    }
  ],
  "inferredLocation": "FRIDGE or FREEZER or PANTRY or null",
  "error": null
}

Rules:
- Include ONLY food, drinks, and cooking ingredients
- Do NOT include cleaning products, medicine, pet food, or non-food items
- Infer storageLocation from visual context: open fridge shelf → FRIDGE, visible frost/ice → FREEZER, dry cupboard/pantry shelf → PANTRY
- Confidence: 0.9+ for clearly readable labels, 0.65–0.89 for partially visible items, below 0.65 for educated guesses
- If the photo is too dark to identify items: { "items": [], "inferredLocation": null, "error": "TOO_DARK" }
- If no food is visible: { "items": [], "inferredLocation": null, "error": "NO_FOOD" }
- If the photo is too blurry to read: { "items": [], "inferredLocation": null, "error": "BLURRY" }
- Return ONLY valid JSON.`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system:
        "You are a kitchen inventory assistant. You identify food items from photos and return structured JSON only. You never add explanation, markdown, or code fences.",
      messages: [
        {
          role: "user",
          content: [...imageBlocks, { type: "text" as const, text: userPrompt }],
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if the model added them
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let result: VisionResult;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error("[snapshot] JSON parse failed. Raw response:", cleaned.slice(0, 500));
      return NextResponse.json({ error: "Failed to parse vision response" }, { status: 500 });
    }

    // Sanitise: ensure items is always an array
    if (!Array.isArray(result.items)) result.items = [];

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[snapshot] Vision API error:", errorMessage);
    return NextResponse.json(
      { error: "Vision processing failed", detail: errorMessage },
      { status: 500 }
    );
  }
}
