"use client";

/**
 * Challenges Section — shows actionable challenges with real progress from API
 */

import Link from "next/link";
import { Smartphone, Users, UtensilsCrossed } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  progress?: number;
  comingSoon?: boolean;
  color: string;
  bgColor: string;
}

export function ChallengesSection() {
  const [itemCount, setItemCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.items)) setItemCount(data.items.length);
      })
      .catch(() => {});
  }, []);

  // Build challenges with real data where possible
  const challenges: Challenge[] = [
    {
      id: "kitchen-setup",
      title: "Complete Your Kitchen",
      description: "Stock up with common items in 60 seconds",
      icon: UtensilsCrossed,
      href: "/kitchen-setup",
      color: "text-cubby-green",
      bgColor: "bg-cubby-green/15",
    },
    {
      id: "swipe-status",
      title: "Swipe Status",
      description: itemCount !== null && itemCount > 0
        ? `Sort your ${itemCount} item${itemCount !== 1 ? "s" : ""}`
        : "Sort what's in your kitchen",
      icon: Smartphone,
      href: "/swipe",
      color: "text-cubby-green",
      bgColor: "bg-cubby-lime/25",
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

  return (
    <div className="space-y-3 pb-6">
      <h2 className="text-section-head text-cubby-charcoal">Challenges 🏆</h2>

      <div className="space-y-2.5">
        {challenges.map((challenge) => {
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
