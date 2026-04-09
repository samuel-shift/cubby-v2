/**
 * POST /api/kitchen-setup — marks kitchen setup complete
 * GET  /api/kitchen-setup — returns whether kitchen setup is complete
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();

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
    const userId = await getRequiredUserId();

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
