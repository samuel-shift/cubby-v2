/**
 * Home Screen — Lightweight Dashboard
 *
 * Shows key alerts, expiry banners, quick-action widgets, and challenges.
 * Full inventory browsing lives under the Recipes tab ("My Pantry" sub-tab).
 */
import { auth } from "@/auth";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ExpiryBanners } from "@/components/home/ExpiryBanners";
import { MoneySavedTracker } from "@/components/home/MoneySavedTracker";
import { EatMeSoonCarousel } from "@/components/home/EatMeSoonCarousel";
import { RecipeIdeasFan } from "@/components/home/RecipeIdeasFan";
import { DataInsightNudge } from "@/components/home/DataInsightNudge";
import { ChallengesSection } from "@/components/home/ChallengesSection";
import { QuickStats } from "@/components/home/QuickStats";

export default async function HomePage() {
  const session = await auth().catch(() => null);
  const userName = session?.user?.name ?? "Chef";

  return (
    <div className="min-h-screen bg-cubby-stone">
      {/* Header */}
      <HomeHeader userName={userName} />

      <div className="px-4 pt-4 space-y-5 pb-28">
        {/* Greeting */}
        <div>
          <h1 className="text-page-title text-cubby-charcoal">
            Hello, {userName.split(" ")[0]}!
          </h1>
          <p className="text-cubby-taupe text-sm mt-1">
            Here&apos;s what&apos;s happening in your kitchen
          </p>
        </div>

        {/* Quick inventory stats row */}
        <QuickStats />

        {/* Expiry alert banners with recipe CTAs */}
        <ExpiryBanners />

        {/* Eat Me Soon carousel */}
        <EatMeSoonCarousel />

        {/* Money saved tracker */}
        <MoneySavedTracker />

        {/* Recipe ideas */}
        <RecipeIdeasFan />

        {/* Data insight nudge */}
        <DataInsightNudge />

        {/* Challenges */}
        <ChallengesSection />
      </div>
    </div>
  );
}
