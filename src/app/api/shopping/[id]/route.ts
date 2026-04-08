/**
 * PATCH /api/shopping/[id] — toggle checked, update quantity/name
 * DELETE /api/shopping/[id] — remove item from list
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateItemSchema = z.object({
  checked: z.boolean().optional(),
  name: z.string().min(1).optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

async function getItemForUser(id: string, userId: string) {
  return prisma.shoppingItem.findFirst({
    where: {
      id,
      shoppingList: { userId },
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const existing = await getItemForUser(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.shoppingItem.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const existing = await getItemForUser(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.shoppingItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
