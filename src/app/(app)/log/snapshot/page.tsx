/**
 * Kitchen Snapshot Entry
 * Multi-photo kitchen scan → Claude Vision → item extraction
 * Kept from v1 (not in new Figma design, but preserved per gap analysis)
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function SnapshotPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Kitchen snapshot" backHref="/log" />
      <div className="px-4 pt-4">
        {/* TODO: KitchenSnapshot component — multi-photo flow */}
      </div>
    </div>
  );
}
