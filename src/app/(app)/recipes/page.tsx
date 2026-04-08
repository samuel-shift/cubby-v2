/**
 * Recipes Page
 *
 * Recipe feed — kept from v1, apply new design tokens.
 * Recipe cards are also shown inline on the home screen (fan/stack view).
 * This page is the full list view.
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function RecipesPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Recipe Ideas" />
      <div className="px-4 pt-4">
        {/* TODO: RecipeFeed component */}
        <p className="text-cubby-taupe text-sm">Loading recipes based on what&apos;s in your kitchen…</p>
      </div>
    </div>
  );
}
