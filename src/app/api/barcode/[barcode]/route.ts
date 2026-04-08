/**
 * GET /api/barcode/[barcode]
 * Looks up a product from Open Food Facts by GTIN barcode.
 * Returns a normalised product object ready for inventory creation.
 */
import { NextRequest, NextResponse } from "next/server";

interface OFFProduct {
  product_name?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
  nutriments?: Record<string, number>;
  image_front_url?: string;
}

interface OFFResponse {
  status: number;
  product?: OFFProduct;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params;

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    { next: { revalidate: 3600 } } // Cache 1 hour
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Open Food Facts error" }, { status: 502 });
  }

  const data: OFFResponse = await res.json();

  if (data.status === 0 || !data.product) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  const p = data.product;

  // Normalise to our schema
  const product = {
    found: true,
    name: p.product_name ?? "Unknown product",
    brand: p.brands?.split(",")[0]?.trim(),
    quantity: 1,
    unit: p.quantity ?? undefined,
    category: extractCategory(p.categories_tags ?? []),
    barcode,
    nutritionData: p.nutriments ?? null,
    // NOTE: product photos deferred to V2 (per gap analysis)
    // productImageUrl: p.image_front_url ?? null,
  };

  return NextResponse.json(product);
}

/** Map Open Food Facts category tags to our category system */
function extractCategory(tags: string[]): string {
  const map: Record<string, string> = {
    "en:dairy": "dairy",
    "en:meats": "meat",
    "en:fish": "fish",
    "en:fruits": "fruit",
    "en:vegetables": "produce",
    "en:breads": "bread",
    "en:frozen-foods": "frozen",
    "en:canned-foods": "canned",
    "en:beverages": "drinks",
    "en:snacks": "snacks",
    "en:eggs": "eggs",
    "en:condiments": "condiments",
  };

  for (const tag of tags) {
    if (map[tag]) return map[tag];
  }
  return "other";
}
