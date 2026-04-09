/**
 * GET /api/inventory/stats
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getRequiredUserId();

  const [eatenCount, thrownOutCount, activeCount] = await Promise.all([
    prisma.inventoryItem.count({ where: { userId, status: "EATEN" } }),
    prisma.inventoryItem.count({ where: { userId, status: "THROWN_OUT" } }),
    prisma.inventoryItem.count({ where: { userId, status: "ACTIVE" } }),
  ]);

  return NextResponse.json({ eatenCount, thrownOutCount, activeCount });
}
