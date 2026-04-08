import { formatExpiryLabel } from "@/lib/utils";

interface ExpiryPillProps {
  expiryDate: Date | string | null | undefined;
}

export function ExpiryPill({ expiryDate }: ExpiryPillProps) {
  const { label, urgency } = formatExpiryLabel(expiryDate);

  const classes = {
    critical: "expiry-pill-critical",
    warning: "expiry-pill-warning",
    safe: "expiry-pill-safe",
    expired: "expiry-pill-critical",
    unknown: "bg-cubby-taupe/10 text-cubby-taupe text-xs font-semibold px-2.5 py-1 rounded-full",
  };

  return <span className={classes[urgency]}>{label}</span>;
}
