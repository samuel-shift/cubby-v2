/**
 * GET /api/challenges
 *
 * Returns the user's challenge progress for all challenge types.
 * Used by ChallengesSection on the homepage.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const challenges = await prisma.userChallenge.findMany({
      where: { userId },
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
