"use client";

/**
 * Data Insight Nudge — Personalised insight card
 *
 * Fetches real inventory + insights data and generates contextual nudges:
 * - Items expiring soon → "Use your X before it expires!"
 * - Most wasted category → "You tend to waste X. Try buying less?"
 * - Items with no expiry → "Add expiry dates to track freshness"
 * - Rescue rate → "Your rescue rate is X% — keep going!"
 * - Empty kitchen → "Your kitchen is empty — scan some food!"
 */

import { Lightbulb, TrendingUp, AlertTriangle, Calendar, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Insight {
  text: string;
  icon: "lightbulb" | "trending" | "warning" | "calendar" | "cart";
  cta?: { label: string; href: string };
  dismissible: boolean;
}

const ICON_MAP = {
  lightbulb: { Icon: Lightbulb, bg: "bg-cubby-pastel-yellow", color: "text-amber-600" },
  trending: { Icon: TrendingUp, bg: "bg-cubby-pastel-green", color: "text-cubby-green" },
  warning: { Icon: AlertTriangle, bg: "bg-cubby-salmon/20", color: "text-cubby-salmon" },
  calendar: { Icon: Calendar, bg: "bg-cubby-pastel-blue", color: "text-blue-600" },
  cart: { Icon: ShoppingCart, bg: "bg-cubby-pastel-lavender", color: "text-purple-600" },
};

export function DataInsightNudge() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateInsight() {
      try {
        const [invRes, insRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/insights"),
        ]);

        const { items } = await invRes.json();
        const insightsData = insRes.ok ? await insRes.json() : null;

        if (!Array.isArray(items)) { setLoading(false); return; }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Calculate expiring items
        const expiring = items.filter((item: { expiryDate: string | null }) => {
          if (!item.expiryDate) return false;
          const exp = new Date(item.expiryDate);
          exp.setHours(0, 0, 0, 0);
          const days = Math.round((exp.getTime() - now.getTime()) / 86400000);
          return days >= 0 && days <= 2;
        });

        // Count items without expiry dates
        const noExpiry = items.filter((i: { expiryDate: string | null }) => !i.expiryDate);

        // Build possible insights (priority ordered)
        const candidates: Insight[] = [];

        // 1. Expiring items (highest priority)
        if (expiring.length > 0) {
          const names = expiring.slice(0, 2).map((i: { name: string }) => i.name).join(" and ");
          candidates.push({
            text: expiring.length === 1
              ? `Your ${names} expires soon — use it before it's too late!`
              : `${names} are expiring soon — time to cook something with them!`,
            icon: "warning",
            cta: { label: "Get recipes", href: "/recipes?tab=recipes" },
            dismissible: true,
          });
        }

        // 2. Waste pattern insight
        if (insightsData?.totals) {
          const { thrownOutCount, rescueRate, eatenCount } = insightsData.totals;

          if (thrownOutCount > 0 && rescueRate < 80) {
            // Find most wasted category from weekly data
            const topCat = insightsData.topCategories?.[0];
            candidates.push({
              text: topCat
                ? `${topCat.category} is your most logged category (${topCat.count} items). Try planning meals around what you have!`
                : `Your rescue rate is ${rescueRate}% — let's get it higher! Use items before they expire.`,
              icon: "lightbulb",
              dismissible: true,
            });
          }

          // 3. Celebrate good rescue rate
          if (rescueRate >= 80 && eatenCount >= 5) {
            candidates.push({
              text: `Amazing! ${rescueRate}% rescue rate — you've saved ${eatenCount} items from going to waste.`,
              icon: "trending",
              dismissible: true,
            });
          }
        }

        // 4. No expiry dates set
        if (noExpiry.length > 5 && noExpiry.length > items.length * 0.5) {
          candidates.push({
            text: `${noExpiry.length} of your items have no expiry date. Adding dates helps Cubby remind you before things go off.`,
            icon: "calendar",
            cta: { label: "View pantry", href: "/recipes?tab=pantry" },
            dismissible: true,
          });
        }

        // 5. Empty kitchen
        if (items.length === 0) {
          candidates.push({
            text: "Your kitchen is empty! Scan your fridge or pantry to start tracking.",
            icon: "cart",
            cta: { label: "Log food", href: "/log" },
            dismissible: false,
          });
        }

        // Pick the first (highest priority) insight
        if (candidates.length > 0) {
          setInsight(candidates[0]);
        }
      } catch {
        // Silent — nudge is optional
      } finally {
        setLoading(false);
      }
    }

    generateInsight();
  }, []);

  if (loading || dismissed || !insight) return null;

  const { Icon, bg, color } = ICON_MAP[insight.icon];

  return (
    <div className="cubby-card px-5 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-2xl ${bg} flex-shrink-0 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className="text-sm text-cubby-charcoal font-semibold leading-snug pt-1">
          {insight.text}
        </p>
      </div>

      <div className="flex gap-2">
        {insight.cta ? (
          <Link
            href={insight.cta.href}
            className="flex-1 bg-cubby-green text-white font-black text-sm py-2.5 rounded-full text-center active:scale-[0.97] transition-transform"
          >
            {insight.cta.label}
          </Link>
        ) : null}
        {insight.dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className={`flex-1 bg-cubby-stone text-cubby-taupe font-semibold text-sm py-2.5 rounded-full ${!insight.cta ? "max-w-[120px]" : ""}`}
          >
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
