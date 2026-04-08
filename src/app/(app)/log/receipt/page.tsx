/**
 * Receipt Photo Entry
 * Photo of receipt → Claude Vision OCR → item extraction → review screen
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function ReceiptScanPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Scan receipt" backHref="/log" />
      <div className="px-4 pt-4">
        {/* TODO: ReceiptScanner component */}
      </div>
    </div>
  );
}
