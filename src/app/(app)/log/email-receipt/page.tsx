/**
 * E-Receipt Entry
 * Resend webhook from supermarket email receipts
 * Kept from v1 (not in new design, but preserved per gap analysis)
 */
import { PageHeader } from "@/components/ui/PageHeader";

export default function EmailReceiptPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Email receipt" backHref="/log" />
      <div className="px-4 pt-4">
        {/* TODO: EmailReceiptSetup component — resend webhook instructions */}
      </div>
    </div>
  );
}
