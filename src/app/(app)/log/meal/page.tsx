/**
 * Meal Log Entry — ENTIRELY NEW
 * Upload photo of cooked meal + type/voice description
 * Claude Vision identifies ingredients used → updates inventory
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function MealLogPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Log a meal" backHref="/log" />
      <div className="px-4 pt-4">
        {/* TODO: MealLogClient component */}
      </div>
    </div>
  );
}
