import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/kitchen-setup
 * Marks the kitchen setup challenge as complete for the current user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json();

    if (body.complete) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { kitchenSetupComplete: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kitchen setup error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/**
 * GET /api/kitchen-setup
 * Returns whether kitchen setup is complete for the current user.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kitchenSetupComplete: true },
    });

    return NextResponse.json({ complete: user?.kitchenSetupComplete ?? false });
  } catch (error) {
    console.error("Kitchen setup error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
