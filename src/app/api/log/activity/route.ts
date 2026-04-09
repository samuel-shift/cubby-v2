/**
 * POST /api/log/activity — write an activity log entry
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getUserId(): Promise<string | null> {
  const nextAuth = await auth().catch(() => null);
  if (nextAuth?.user?.id) return nextAuth.user.id;
  const custom = await getSession();
  return custom?.userId ?? null;
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
      metadata: parsed.data.metadata ?? {},
    },
  });

  return NextResponse.json({ log }, { status: 201 });
}
