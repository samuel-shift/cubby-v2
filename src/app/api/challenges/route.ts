/**
 * GET /api/challenges
 *
 * Returns the user's challenge progress for all challenge types.
 * Used by ChallengesSection on the homepage.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 200 }); // Return empty for unauthenticated
  }

  try {
    const challenges = await prisma.userChallenge.findMany({
      where: { userId: session.user.id },
      select: {
        type: true,
        progress: true,
        completedAt: true,
        streakCount: true,
      },
    });

    return NextResponse.json(challenges);
  } catch (err) {
    console.error("[challenges] Error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
