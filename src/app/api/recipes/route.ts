import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";
import { z } from "zod";

const SaveRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  cookTime: z.number().optional(),
  servings: z.number().optional(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.number().optional(),
    unit: z.string().optional(),
  })),
  instructions: z.array(z.string()),
  tags: z.array(z.string()).default([]),
  sourceUrl: z.string().optional(),
});

export async function GET() {
  const userId = await getRequiredUserId();

  const recipes = await prisma.savedRecipe.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ recipes });
}

export async function POST(req: NextRequest) {
  const userId = await getRequiredUserId();

  const body = await req.json();
  const parsed = SaveRecipeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const recipe = await prisma.savedRecipe.create({
    data: { ...parsed.data, userId },
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
