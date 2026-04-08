/**
 * Barcode Scan Entry
 * Camera-based barcode scanning → Open Food Facts lookup → inventory item
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function BarcodeScanPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Scan barcode" backHref="/log" />
      <div className="px-4 pt-4">
        {/* TODO: BarcodeScanner component — camera + OFf lookup */}
      </div>
    </div>
  );
}
