/**
 * GET  /api/shopping — get or create the user's active shopping list with items
 * POST /api/shopping — add an item to the active shopping list
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";
import { z } from "zod";

const AddItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().default(1),
  unit: z.string().optional(),
  category: z.string().optional(),
  aisleOrder: z.number().optional(),
  addedFromRecipe: z.string().optional(),
});

async function getOrCreateList(userId: string) {
  let list = await prisma.shoppingList.findFirst({
    where: { userId },
    include: {
      items: { orderBy: [{ checked: "asc" }, { aisleOrder: "asc" }, { createdAt: "asc" }] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!list) {
    list = await prisma.shoppingList.create({
      data: { userId, name: "My List" },
      include: { items: true },
    });
  }

  return list;
}

export async function GET() {
  const userId = await getRequiredUserId();

  const list = await getOrCreateList(userId);
  return NextResponse.json({ list });
}

export async function POST(req: NextRequest) {
  const userId = await getRequiredUserId();

  const body = await req.json();
  const parsed = AddItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const list = await getOrCreateList(userId);

  const item = await prisma.shoppingItem.create({
    data: { ...parsed.data, shoppingListId: list.id },
  });

  return NextResponse.json({ item }, { status: 201 });
}
