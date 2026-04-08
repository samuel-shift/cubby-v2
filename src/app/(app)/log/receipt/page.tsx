/**
 * Receipt Photo Entry
 * Photo of receipt → Claude Vision OCR → item extraction → review screen
 */
import { ReceiptScannerClient } from "@/components/log/ReceiptScannerClient";

export default function ReceiptScanPage() {
  return <ReceiptScannerClient />;
}
