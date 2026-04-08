/**
 * Shopping Tab — My List + Cookbook
 *
 * First-class bottom nav tab — kept from v1 (per gap analysis review note).
 * Segmented control: My List | Cookbook
 *
 * V1 features:
 * - My List: smart aisle sorting, one-item-away nudge, mood chips, build my list
 * - Cookbook (segmented): recipe-to-shopping-list bridge
 *
 * Apply new design tokens — no structural changes.
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function ShoppingPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Shopping" />
      <div className="px-4 pt-4">
        {/* TODO: ShoppingClient component with My List / Cookbook segmented control */}
        <p className="text-cubby-taupe text-sm">Your shopping list</p>
      </div>
    </div>
  );
}
