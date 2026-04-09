/**
 * Recipe Detail Page
 * Renders a generated recipe (from sessionStorage cache via ?idx=N)
 * or a saved DB recipe fetched server-side by ID.
 */
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { RecipeDetailClient } from "@/components/recipes/RecipeDetailClient";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ idx?: string }>;
}

// Skeleton shown while client hydrates
function RecipeDetailSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-4 animate-pulse">
      <div className="h-7 bg-gray-200 rounded-xl w-3/4" />
      <div className="flex gap-2">
        <div className="h-7 w-20 bg-gray-200 rounded-full" />
        <div className="h-7 w-20 bg-gray-200 rounded-full" />
        <div className="h-7 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="h-px bg-gray-200 my-2" />
      <div className="h-5 bg-gray-200 rounded w-1/3" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full" />
      ))}
      <div className="h-px bg-gray-200 my-2" />
      <div className="h-5 bg-gray-200 rounded w-1/4" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-8 h-8 bg-gray-200 rounded-xl flex-shrink-0" />
          <div className="h-4 bg-gray-200 rounded flex-1 mt-2" />
        </div>
      ))}
    </div>
  );
}

export default async function RecipeDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { idx } = await searchParams;

  // If ?idx is present the client will read from sessionStorage/localStorage —
  // no server fetch needed. If it's absent, try to load a saved DB recipe.
  let savedRecipe = null;

  if (!idx) {
    try {
      const session = await auth().catch(() => null);
      if (session?.user?.id) {
        savedRecipe = await prisma.savedRecipe.findFirst({
          where: { id, userId: session.user.id },
        }).catch(() => null);
      }
    } catch { /* noop — client will handle not-found state */ }
  }

  // Normalise savedRecipe shape to what RecipeDetailClient expects
  const normalised = savedRecipe
    ? {
        id: savedRecipe.id,
        title: savedRecipe.title,
        description: savedRecipe.description ?? undefined,
        cookTime: savedRecipe.cookTime ?? undefined,
        prepTime: savedRecipe.prepTime ?? undefined,
        servings: savedRecipe.servings ?? undefined,
        difficulty: savedRecipe.difficulty ?? undefined,
        mealType: savedRecipe.mealType ?? undefined,
        ingredients: (savedRecipe.ingredients as { name: string; amount?: number; unit?: string }[]).map(
          (ing) => ({
            name: ing.name,
            quantity: [ing.amount, ing.unit].filter(Boolean).join(" ") || undefined,
            inInventory: false,
          })
        ),
        instructions: savedRecipe.instructions as string[],
      }
    : undefined;

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Recipe" backHref="/recipes" />
      <Suspense fallback={<RecipeDetailSkeleton />}>
        <RecipeDetailClient savedRecipe={normalised} />
      </Suspense>
    </div>
  );
}
