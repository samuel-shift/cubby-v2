/**
 * Onboarding Flow — 6-Step Multi-Step Form
 *
 * HIGH priority per gap analysis.
 *
 * Steps (V1 — per gap analysis decisions):
 * 1. Login — email magic link form (NextAuth backend, new UI)
 * 2. Name — "Hello, Chef!" with name input
 * 3. Notifications — range slider 0-3 with labels
 * 4. Dietary needs + allergens — merged, search-as-you-type + tag chips
 * 5. Motivation — icon buttons (lucide icons)
 * 6. Welcome / finish — CTA to log first item or go home
 *
 * Removed from spec (per gap analysis):
 * - "Detail level" step (AI guess / Bit of both / Log it all) — V2 feature
 * - Entry method step — removed
 *
 * Features:
 * - AnimatePresence slide transitions between steps
 * - Custom food face illustrations per step (from Figma assets)
 * - Progress indicator (dots or bar)
 */
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export default function OnboardingPage() {
  return <OnboardingClient />;
}
