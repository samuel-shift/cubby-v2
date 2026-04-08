/**
 * Recipe Detail Page
 * Unaffected by redesign — apply new design tokens only.
 */
import { PageHeader } from "@/components/ui/PageHeader";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Recipe" backHref="/recipes" />
      <div className="px-4 pt-4">
        {/* TODO: RecipeDetail component — id: {id} */}
        <p className="text-cubby-taupe text-sm">Recipe {id}</p>
      </div>
    </div>
  );
}
