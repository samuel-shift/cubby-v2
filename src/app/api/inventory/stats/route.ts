/**
 * GET /api/inventory/stats
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  const session = await auth().catch(() => null);
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [eatenCount, thrownOutCount, activeCount] = await Promise.all([
    prisma.inventoryItem.count({ where: { userId, status: "EATEN" } }),
    prisma.inventoryItem.count({ where: { userId, status: "THROWN_OUT" } }),
    prisma.inventoryItem.count({ where: { userId, status: "ACTIVE" } }),
  ]);

  return NextResponse.json({ eatenCount, thrownOutCount, activeCount });
}
