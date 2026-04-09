import { Suspense } from "react";
import { RecipesHubClient } from "@/components/recipes/RecipesHubClient";

export default function RecipesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cubby-stone" />}>
      <RecipesHubClient />
    </Suspense>
  );
}
