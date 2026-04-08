/**
 * Insights — Data-driven dashboard
 * Route: /insights
 *
 * Shows personalised hero stat, 7-day rescued-vs-wasted chart,
 * lifetime totals, top categories, entry method breakdown,
 * and 10-milestone achievement grid — all from real user data.
 */
import { InsightsClient } from "@/components/insights/InsightsClient";

export default function InsightsPage() {
  return <InsightsClient />;
}
