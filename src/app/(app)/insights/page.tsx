/**
 * Insights Page
 * Unaffected by redesign — apply new design tokens only.
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Your Insights" />
      <div className="px-4 pt-4">
        {/* TODO: InsightsDashboard component */}
        <p className="text-cubby-taupe text-sm">Your food waste stats</p>
      </div>
    </div>
  );
}
