/**
 * Home Screen — Dashboard Hub
 *
 * CRITICAL priority per gap analysis. This is a complete rethink from v1.
 *
 * Sections (in order):
 * 1. Header — Cubby logo + notification bell with badge
 * 2. Greeting — "Hello, {name}!" with subtitle
 * 3. Expiry Alert Banners — embedded (NOT behind a tap — see gap analysis note)
 * 4. My Kitchen card — links to /pantry with item count
 * 5. Money Saved Tracker — animated progress bar toward coffee goal
 * 6. Eat Me Soon carousel — flippable tiles, food photos, waste cost, CTAs
 * 7. Recipe Ideas — stacked fan-style inline cards
 * 8. Data Insight — personalised nudge with YES/NO
 * 9. Challenges — Swipe Status, Leftover Legend, Empty Bin Week, Friend's Fridge (greyed out)
 */
import { auth } from "@/auth";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ExpiryBanners } from "@/components/home/ExpiryBanners";
import { MyKitchenCard } from "@/components/home/MyKitchenCard";
import { MoneySavedTracker } from "@/components/home/MoneySavedTracker";
import { EatMeSoonCarousel } from "@/components/home/EatMeSoonCarousel";
import { RecipeIdeasFan } from "@/components/home/RecipeIdeasFan";
import { DataInsightNudge } from "@/components/home/DataInsightNudge";
import { ChallengesSection } from "@/components/home/ChallengesSection";

export default async function HomePage() {
  const session = await auth();
  const userName = session?.user?.name ?? "Chef";

  return (
    <div className="min-h-screen bg-cubby-stone">
      {/* Header */}
      <HomeHeader userName={userName} />

      <div className="px-4 pt-4 space-y-5">
        {/* Greeting */}
        <div>
          <h1 className="text-page-title text-cubby-charcoal">
            Hello, {userName.split(" ")[0]}!
          </h1>
          <p className="text-cubby-taupe text-sm mt-1">
            Here&apos;s what&apos;s happening in your kitchen
          </p>
        </div>

        {/* Expiry banners — visible without extra tap (gap analysis critical note) */}
        <ExpiryBanners />

        {/* My Kitchen link card */}
        <MyKitchenCard />

        {/* Money saved tracker */}
        <MoneySavedTracker />

        {/* Eat Me Soon carousel */}
        <EatMeSoonCarousel />

        {/* Recipe ideas — inline on home */}
        <RecipeIdeasFan />

        {/* Data insight nudge */}
        <DataInsightNudge />

        {/* Challenges */}
        <ChallengesSection />
      </div>
    </div>
  );
}
