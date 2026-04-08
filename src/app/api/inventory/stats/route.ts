/**
 * GET /api/inventory/stats
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [eatenCount, thrownOutCount, activeCount] = await Promise.all([
    prisma.inventoryItem.count({ where: { userId: session.user.id, status: "EATEN" } }),
    prisma.inventoryItem.count({ where: { userId: session.user.id, status: "THROWN_OUT" } }),
    prisma.inventoryItem.count({ where: { userId: session.user.id, status: "ACTIVE" } }),
  ]);

  return NextResponse.json({ eatenCount, thrownOutCount, activeCount });
}
