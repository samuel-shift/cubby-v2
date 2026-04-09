/**
 * POST /api/user/onboarding
 * Saves onboarding preferences and marks onboarding complete.
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

const OnboardingSchema = z.object({
  name: z.string().min(1),
  notificationFrequency: z.number().min(0).max(3),
  dietaryNeeds: z.array(z.string()),
  allergens: z.array(z.string()),
  motivations: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const parsed = OnboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      notificationFrequency: parsed.data.notificationFrequency,
      dietaryNeeds: parsed.data.dietaryNeeds,
      allergens: parsed.data.allergens,
      motivations: parsed.data.motivations,
      onboardingComplete: true,
    },
  });

  await prisma.activityLog.create({
    data: { userId, type: "ONBOARDING_COMPLETE" },
  });

  return NextResponse.json({ user });
}
