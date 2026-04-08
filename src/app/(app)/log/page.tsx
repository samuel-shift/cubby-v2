/**
 * Log Food — Unified Recording Flow
 *
 * HIGH priority per gap analysis. New unified entry point with 3 top-level options.
 *
 * Options:
 * 1. "I bought food" → sub-menu: Barcode scan | Receipt photo | Type/voice
 * 2. "I cooked a meal" → Upload meal photo + type/voice (ENTIRELY NEW)
 * 3. "I threw food away" → Photo of bin + type/voice (ENTIRELY NEW)
 *
 * V1 notes:
 * - Voice input: show greyed-out "Coming soon" mic button (NOT wired up)
 * - Kitchen snapshot entry: keep from v1 (/log/snapshot)
 * - E-receipt entry: keep from v1 (/log/email-receipt)
 */
import { LogFoodClient } from "@/components/log/LogFoodClient";

export default function LogPage() {
  return <LogFoodClient />;
}
