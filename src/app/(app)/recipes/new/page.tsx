import { PageHeader } from "@/components/ui/PageHeader";
import { RecipeDetailClient } from "@/components/recipes/RecipeDetailClient";
import { Suspense } from "react";

export default function NewRecipeDetailPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Recipe" backHref="/recipes" />
      <div className="pt-2">
        <Suspense
          fallback={
            <div className="px-4 pt-4 animate-pulse space-y-3">
              <div className="h-40 bg-cubby-cream rounded-card" />
            </div>
          }
        >
          <RecipeDetailClient />
        </Suspense>
      </div>
    </div>
  );
}
