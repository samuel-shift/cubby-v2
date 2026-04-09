/**
 * POST /api/log/activity — write an activity log entry
 *
 * Used by cook mode (MEAL_COOKED), swipe status, etc.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

async function getUserId(): Promise<string | null> {
  const session = await auth().catch(() => null);
  return session?.user?.id ?? null;
}

const ActivitySchema = z.object({
  type: z.enum([
    "ITEM_ADDED",
    "ITEM_EATEN",
    "ITEM_THROWN_OUT",
    "MEAL_COOKED",
    "WASTE_LOGGED",
    "SWIPE_SESSION_COMPLETE",
    "CHALLENGE_COMPLETE",
    "ONBOARDING_COMPLETE",
  ]),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const parsed = ActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const log = await prisma.activityLog.create({
    data: {
      userId,
      type: parsed.data.type,
      metadata: (parsed.data.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ log }, { status: 201 });
}
