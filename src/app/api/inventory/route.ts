/**
 * GET  /api/inventory — list user's active inventory items
 * POST /api/inventory — create a new inventory item
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getUserId(): Promise<string | null> {
  const session = await auth().catch(() => null);
  return session?.user?.id ?? null;
}

const CreateItemSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  quantity: z.number().default(1),
  unit: z.string().optional(),
  category: z.string(),
  location: z.enum(["FRIDGE", "FREEZER", "COUNTER", "CUPBOARD", "PANTRY"]).default("FRIDGE"),
  expiryDate: z.string().datetime().optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
  barcode: z.string().optional(),
  entryMethod: z.enum(["BARCODE", "RECEIPT", "SNAPSHOT", "MANUAL", "EMAIL_RECEIPT", "MEAL_LOG", "WASTE_LOG"]).default("MANUAL"),
  ocrRawText: z.string().optional(),
});

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { expiryDate: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.inventoryItem.create({
    data: {
      ...parsed.data,
      userId,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
