/**
 * Waste Log Entry — ENTIRELY NEW
 * Photo of bin + type/voice description → logs wasted items + cost
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function WasteLogPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Log waste" backHref="/log" />
      <div className="px-4 pt-4">
        {/* TODO: WasteLogClient component */}
      </div>
    </div>
  );
}
