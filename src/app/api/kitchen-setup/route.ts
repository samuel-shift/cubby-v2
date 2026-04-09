/**
 * POST /api/kitchen-setup — marks kitchen setup complete
 * GET  /api/kitchen-setup — returns whether kitchen setup is complete
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  const nextAuth = await auth().catch(() => null);
  if (nextAuth?.user?.id) return nextAuth.user.id;
  const custom = await getSession();
  return custom?.userId ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await req.json();

    if (body.complete) {
      await prisma.user.update({
        where: { id: userId },
        data: { kitchenSetupComplete: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kitchen setup error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kitchenSetupComplete: true },
    });

    return NextResponse.json({ complete: user?.kitchenSetupComplete ?? false });
  } catch (error) {
    console.error("Kitchen setup error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
