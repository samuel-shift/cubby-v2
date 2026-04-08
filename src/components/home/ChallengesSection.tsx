"use client";

/**
 * Challenges Section — Homepage
 *
 * Shows challenges with real progress data fetched from the API.
 * "Start Your Kitchen" pinned to top if not completed.
 * Other challenges: Swipe Status, Leftover Legend, Empty Bin Week, Friend's Fridge (coming soon).
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Smartphone, Award, Trash2, Users, ChefHat, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeData {
  type: string;
  progress: number;
  completedAt: string | null;
  streakCount: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  progress: number;
  comingSoon?: boolean;
  completed?: boolean;
  color: string;
  bgColor: string;
}

export function ChallengesSection() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [kitchenSetupDone, setKitchenSetupDone] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, []);

  async function fetchChallenges() {
    try {
      const res = await fetch("/api/challenges");
      if (res.ok) {
        const data: ChallengeData[] = await res.json();
        const challengeMap = new Map(data.map((c) => [c.type, c]));

        const kitchenSetup = challengeMap.get("KITCHEN_SETUP");
        const isKitchenDone = !!kitchenSetup?.completedAt;
        setKitchenSetupDone(isKitchenDone);

        const items: Challenge[] = [];

        // Pin "Start Your Kitchen" to top if not done
        if (!isKitchenDone) {
          items.push({
            id: "kitchen-setup",
            title: "Start Your Kitchen",
            description: "Add 100 common items to your pantry",
            icon: ChefHat,
            href: "/kitchen-setup",
            progress: kitchenSetup?.progress ?? 0,
            color: "text-cubby-green",
            bgColor: "bg-cubby-lime/25",
          });
        }

        // Swipe Status
        const swipe = challengeMap.get("SWIPE_STATUS");
        items.push({
          id: "swipe-status",
          title: "Swipe Status",
          description: "Sort what's in your kitchen",
          icon: Smartphone,
          href: "/swipe",
          progress: swipe?.progress ?? 0,
          completed: !!swipe?.completedAt,
          color: "text-cubby-green",
          bgColor: "bg-cubby-lime/25",
        });

        // Leftover Legend
        const leftover = challengeMap.get("LEFTOVER_LEGEND");
        items.push({
          id: "leftover-legend",
          title: "Leftover Legend",
          description: "Cook with leftovers 3x this week",
          icon: Award,
          href: "/swipe",
          progress: leftover?.progress ?? 0,
          completed: !!leftover?.completedAt,
          color: "text-amber-600",
          bgColor: "bg-amber-100",
        });

        // Empty Bin Week
        const emptyBin = challengeMap.get("EMPTY_BIN_WEEK");
        items.push({
          id: "empty-bin-week",
          title: "Empty Bin Week",
          description: "Zero waste for 7 days",
          icon: Trash2,
          href: "/swipe",
          progress: emptyBin?.progress ?? 0,
          completed: !!emptyBin?.completedAt,
          color: "text-cubby-green",
          bgColor: "bg-emerald-100",
        });

        // Friend's Fridge — coming soon
        items.push({
          id: "friends-fridge",
          title: "Friend's Fridge",
          description: "Compare kitchens with a friend",
          icon: Users,
          href: "#",
          progress: 0,
          comingSoon: true,
          color: "text-cubby-taupe",
          bgColor: "bg-cubby-taupe/10",
        });

        setChallenges(items);
      }
    } catch {
      // Fallback to static challenges on error
      setChallenges(getStaticChallenges());
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 pb-6">
        <h2 className="text-section-head text-cubby-charcoal">Challenges 🏆</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-cubby-taupe animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      <h2 className="text-section-head text-cubby-charcoal">Challenges 🏆</h2>
      <div className="space-y-2.5">
        {challenges.map((challenge) => {
          const Icon = challenge.icon;
          const isKitchenSetup = challenge.id === "kitchen-setup";

          return (
            <Link
              key={challenge.id}
              href={challenge.comingSoon ? "#" : challenge.href}
              className={cn(
                "block cubby-card px-4 py-4 active:scale-[0.98] transition-transform",
                challenge.comingSoon && "opacity-50 pointer-events-none",
                isKitchenSetup && "ring-2 ring-cubby-green ring-offset-2"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center",
                    challenge.bgColor
                  )}
                >
                  <Icon className={cn("w-5 h-5", challenge.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-cubby-charcoal text-sm">{challenge.title}</p>
                    {challenge.comingSoon && (
                      <span className="text-[10px] font-black text-cubby-taupe bg-cubby-taupe/10 px-2 py-0.5 rounded-full">
                        Coming soon
                      </span>
                    )}
                    {challenge.completed && (
                      <span className="text-[10px] font-black text-cubby-green bg-cubby-lime/20 px-2 py-0.5 rounded-full">
                        Done ✓
                      </span>
                    )}
                    {isKitchenSetup && (
                      <span className="text-[10px] font-black text-white bg-cubby-green px-2 py-0.5 rounded-full animate-pulse">
                        Start here
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cubby-taupe">{challenge.description}</p>
                  {typeof challenge.progress === "number" && !challenge.comingSoon && !challenge.completed && (
                    <div className="mt-2 h-1.5 rounded-full bg-cubby-stone overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cubby-lime transition-all duration-500"
                        style={{ width: `${challenge.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {typeof challenge.progress === "number" && !challenge.comingSoon && !challenge.completed && (
                  <span className="text-xs font-black text-cubby-taupe flex-shrink-0">
                    {challenge.progress}%
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getStaticChallenges(): Challenge[] {
  return [
    {
      id: "kitchen-setup",
      title: "Start Your Kitchen",
      description: "Add 100 common items to your pantry",
      icon: ChefHat,
      href: "/kitchen-setup",
      progress: 0,
      color: "text-cubby-green",
      bgColor: "bg-cubby-lime/25",
    },
    {
      id: "swipe-status",
      title: "Swipe Status",
      description: "Sort what's in your kitchen",
      icon: Smartphone,
      href: "/swipe",
      progress: 0,
      color: "text-cubby-green",
      bgColor: "bg-cubby-lime/25",
    },
    {
      id: "leftover-legend",
      title: "Leftover Legend",
      description: "Cook with leftovers 3x this week",
      icon: Award,
      href: "/swipe",
      progress: 0,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      id: "empty-bin-week",
      title: "Empty Bin Week",
      description: "Zero waste for 7 days",
      icon: Trash2,
      href: "/swipe",
      progress: 0,
      color: "text-cubby-green",
      bgColor: "bg-emerald-100",
    },
    {
      id: "friends-fridge",
      title: "Friend's Fridge",
      description: "Compare kitchens with a friend",
      icon: Users,
      href: "#",
      progress: 0,
      comingSoon: true,
      color: "text-cubby-taupe",
      bgColor: "bg-cubby-taupe/10",
    },
  ];
}"use client";

/**
 * Challenges Section
 *
 * V1 challenges (build these):
 * - Swipe Status (already built, link through)
 * - Leftover Legend (use leftovers 3x in a week)
 * - Empty Bin Week (zero waste for 7 days)
 *
 * V2 / Coming Soon (render greyed out):
 * - Friend's Fridge (social — requires multi-user, defer to V2)
 */

import Link from "next/link";
import { Smartphone, Award, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  progress?: number; // 0-100
  comingSoon?: boolean;
  color: string;
  bgColor: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: "swipe-status",
    title: "Swipe Status",
    description: "Sort what's in your kitchen",
    icon: Smartphone,
    href: "/swipe",
    progress: 60,
    color: "text-cubby-green",
    bgColor: "bg-cubby-lime/25",
  },
  {
    id: "leftover-legend",
    title: "Leftover Legend",
    description: "Cook with leftovers 3x this week",
    icon: Award,
    href: "/swipe",
    progress: 33,
    color: "text-amber-600",
    bgColor: "bg-cubby-pastel-yellow",
  },
  {
    id: "empty-bin-week",
    title: "Empty Bin Week",
    description: "Zero waste for 7 days",
    icon: Trash2,
    href: "/swipe",
    progress: 71,
    color: "text-cubby-green",
    bgColor: "bg-cubby-pastel-green",
  },
  {
    id: "friends-fridge",
    title: "Friend's Fridge",
    description: "Compare kitchens with a friend",
    icon: Users,
    href: "#",
    comingSoon: true,
    color: "text-cubby-taupe",
    bgColor: "bg-cubby-taupe/10",
  },
];

export function ChallengesSection() {
  return (
    <div className="space-y-3 pb-6">
      <h2 className="text-section-head text-cubby-charcoal">Challenges 🏆</h2>

      <div className="space-y-2.5">
        {CHALLENGES.map((challenge) => {
          const Icon = challenge.icon;

          return (
            <Link
              key={challenge.id}
              href={challenge.comingSoon ? "#" : challenge.href}
              className={cn(
                "block cubby-card px-4 py-4 active:scale-[0.98] transition-transform",
                challenge.comingSoon && "opacity-50 pointer-events-none"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center", challenge.bgColor)}>
                  <Icon className={cn("w-5 h-5", challenge.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-cubby-charcoal text-sm">{challenge.title}</p>
                    {challenge.comingSoon && (
                      <span className="text-[10px] font-black text-cubby-taupe bg-cubby-taupe/10 px-2 py-0.5 rounded-full">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cubby-taupe">{challenge.description}</p>

                  {typeof challenge.progress === "number" && !challenge.comingSoon && (
                    <div className="mt-2 h-1.5 rounded-full bg-cubby-stone overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cubby-lime"
                        style={{ width: `${challenge.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {typeof challenge.progress === "number" && !challenge.comingSoon && (
                  <span className="text-xs font-black text-cubby-taupe flex-shrink-0">
                    {challenge.progress}%
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
