/**
 * PATCH /api/inventory/[id] — update item (status, quantity, dates, etc.)
 * DELETE /api/inventory/[id] — delete item
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";
import { z } from "zod";

const UpdateItemSchema = z.object({
  status: z.enum(["ACTIVE", "EATEN", "THROWN_OUT", "STILL_HERE"]).optional(),
  quantity: z.number().optional(),
  expiryDate: z.string().datetime().optional().nullable(),
  location: z.enum(["FRIDGE", "FREEZER", "COUNTER", "CUPBOARD", "PANTRY"]).optional(),
  wastedCostEstimate: z.number().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getRequiredUserId();

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.inventoryItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...parsed.data,
      statusUpdatedAt: parsed.data.status ? new Date() : undefined,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined,
    },
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getRequiredUserId();

  const { id } = await params;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
