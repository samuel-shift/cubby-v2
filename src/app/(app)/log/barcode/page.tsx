/**
 * Barcode Scan Entry
 * Camera-based barcode scanning → Open Food Facts lookup → inventory item
 */
import { BarcodeScannerClient } from "@/components/log/BarcodeScannerClient";

export default function BarcodeScanPage() {
  return <BarcodeScannerClient />;
}
