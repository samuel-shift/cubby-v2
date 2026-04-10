"use client";

/**
 * InsightsClient
 *
 * Full Insights dashboard — real data from /api/insights.
 *
 * Sections:
 *  1. Hero stat (personalised to user motivation)
 *  2. 7-day bar chart (rescued vs wasted)
 *  3. Totals summary strip
 *  4. Top categories breakdown
 *  5. Milestone grid (10 milestones, lock/achieved, progress)
 *  6. How you log (entry method breakdown)
 */

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShieldCheck,
  Flame,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

// Types

interface HeroStat {
  label: string;
  value: string;
  emoji: string;
  subtitle: string;
}

interface DayBucket {
  date: string;
  label: string;
  rescued: number;
  wasted: number;
}

interface Totals {
  eatenCount: number;
  thrownOutCount: number;
  activeCount: number;
  totalLogged: number;
  rescueRate: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  emoji: string;
  achieved: boolean;
  progress: number;
  isNew?: boolean;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface MethodCount {
  method: string;
  count: number;
}

interface InsightsData {
  heroStat: HeroStat;
  weeklyChart: DayBucket[];
  totals: Totals;
  moneySaved: number;
  wasteValue: number;
  streakDays: number;
  milestones: Milestone[];
  topCategories: CategoryCount[];
  entryMethods: MethodCount[];
  memberSince: string;
}

// Helpers

const CATEGORY_EMOJI: Record<string, string> = {
  "Fresh Produce": "🥦",
  "Meat & Fish": "🥩",
  "Dairy & Eggs": "🥛",
  Bakery: "🍞",
  Frozen: "🧊",
  "Tins & Cans": "🥫",
  "Pasta, Rice & Grains": "🍝",
  "Condiments & Sauces": "🧴",
  Drinks: "🥤",
  Snacks: "🍪",
  Other: "📋",
};

const METHOD_LABELS: Record<string, { label: string; emoji: string }> = {
  MANUAL: { label: "Typed in", emoji: "⌨️" },
  BARCODE: { label: "Barcode scan", emoji: "📱" },
  RECEIPT: { label: "Receipt scan", emoji: "🧾" },
  SNAPSHOT: { label: "Kitchen snapshot", emoji: "📸" },
  EMAIL_RECEIPT: { label: "Email receipt", emoji: "📧" },
  MEAL_LOG: { label: "Meal log", emoji: "🍽️" },
  WASTE_LOG: { label: "Waste log", emoji: "🗑️" },
};

function getCatEmoji(cat: string): string {
  return CATEGORY_EMOJI[cat] ?? "📦";
}
// Component

export function InsightsClient() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
        setTimeout(() => setAnimated(true), 150);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cubby-stone">
        <PageHeader title="Insights" />
        <div className="flex flex-col items-center justify-center pt-32 space-y-4">
          <Loader2 className="w-8 h-8 text-cubby-green animate-spin" />
          <p className="text-cubby-taupe text-sm font-semibold">Loading your insights...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-cubby-stone">
        <PageHeader title="Insights" />
        <div className="flex flex-col items-center justify-center pt-32 px-6 text-center space-y-4">
          <p className="text-4xl">📊</p>
          <p className="font-black text-cubby-charcoal text-lg">Couldn&apos;t load insights</p>
          <p className="text-cubby-taupe text-sm">Check your connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-cubby-green text-white px-6 py-3 rounded-2xl font-black text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    heroStat,
    weeklyChart,
    totals,
    moneySaved,
    wasteValue,
    streakDays,
    milestones,
    topCategories,
    entryMethods,
    memberSince,
  } = data;

  const hasAnyData = totals.totalLogged > 0;

  if (!hasAnyData) {
    return (
      <div className="min-h-screen bg-cubby-stone">
        <PageHeader title="Insights" />
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center space-y-5">
          <div className="w-20 h-20 bg-cubby-cream rounded-full flex items-center justify-center">
            <span className="text-4xl">📊</span>
          </div>
          <div className="space-y-2">
            <p className="font-black text-cubby-charcoal text-xl">Your insights are waiting</p>
            <p className="text-cubby-taupe text-sm max-w-xs">
              Start logging food to unlock your stats, savings tracker, and milestones.
            </p>
          </div>
          <Link
            href="/log"
            className="bg-cubby-green text-white px-8 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 active:scale-[0.97] transition-transform"
          >
            Log your first item <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="w-full pt-6">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider text-left mb-3">
              Milestones to unlock
            </p>
            <div className="grid grid-cols-2 gap-2">
              {milestones.slice(0, 4).map((m) => (
                <div key={m.id} className="bg-cubby-cream rounded-2xl p-4 text-center opacity-60">
                  <div className="w-10 h-10 bg-cubby-stone rounded-full flex items-center justify-center mx-auto mb-2">
                    <Lock className="w-4 h-4 text-cubby-taupe" />
                  </div>
                  <p className="font-black text-xs text-cubby-charcoal">{m.title}</p>
                  <p className="text-[10px] text-cubby-taupe mt-0.5">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const achievedCount = milestones.filter((m) => m.achieved).length;
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Insights" />

      <div className="px-4 pb-28 space-y-4">
        {/* Hero stat */}
        <div className="bg-cubby-green rounded-card p-6 text-center space-y-2 animate-spring-pop">
          <span className="text-4xl">{heroStat.emoji}</span>
          <p className="text-cubby-lime/80 text-xs font-black uppercase tracking-wider">
            {heroStat.label}
          </p>
          <p className="text-white text-4xl font-black">{heroStat.value}</p>
          <p className="text-white/70 text-sm">{heroStat.subtitle}</p>
        </div>

        {/* Streak + Rescue rate */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-cubby-cream rounded-card p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-cubby-salmon" />
              <span className="text-xs font-black text-cubby-taupe uppercase">Streak</span>
            </div>
            <p className="text-2xl font-black text-cubby-charcoal">
              {streakDays} <span className="text-sm font-semibold text-cubby-taupe">day{streakDays !== 1 ? "s" : ""}</span>
            </p>
          </div>
          <div className="bg-cubby-cream rounded-card p-4 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cubby-green" />
              <span className="text-xs font-black text-cubby-taupe uppercase">Rescue rate</span>
            </div>
            <p className="text-2xl font-black text-cubby-charcoal">
              {totals.rescueRate}<span className="text-sm font-semibold text-cubby-taupe">%</span>
            </p>
          </div>
        </div>

        {/* 7-day bar chart */}
        <WeeklyChart chart={weeklyChart} animated={animated} />

        {/* Totals strip */}
        <div className="bg-cubby-cream rounded-card p-5 space-y-3">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Your numbers</p>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <StatRow label="Items rescued" value={totals.eatenCount} color="text-cubby-green" />
            <StatRow label="Items wasted" value={totals.thrownOutCount} color="text-cubby-urgent" />
            <StatRow label="Currently tracked" value={totals.activeCount} color="text-cubby-charcoal" />
            <StatRow label="Total logged" value={totals.totalLogged} color="text-cubby-charcoal" />
            <StatRow label="Money saved" value={`£${moneySaved.toFixed(2)}`} color="text-cubby-green" />
            <StatRow label="Waste cost" value={`£${wasteValue.toFixed(2)}`} color="text-cubby-urgent" />
          </div>
        </div>

        {/* Top categories */}
        {topCategories.length > 0 && (
          <div className="bg-cubby-cream rounded-card p-5 space-y-3">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Top categories</p>
            <div className="space-y-2.5">
              {topCategories.map((cat, i) => {
                const maxCount = topCategories[0]?.count ?? 1;
                const pct = Math.round((cat.count / maxCount) * 100);
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getCatEmoji(cat.category)}</span>
                        <span className="text-sm font-black text-cubby-charcoal">{cat.category}</span>
                      </div>
                      <span className="text-xs font-semibold text-cubby-taupe">{cat.count} item{cat.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-cubby-stone overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cubby-lime transition-all duration-700 ease-out"
                        style={{ width: animated ? `${pct}%` : "0%" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How you log */}
        {entryMethods.length > 0 && (
          <div className="bg-cubby-cream rounded-card p-5 space-y-3">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">How you log</p>
            <div className="flex flex-wrap gap-2">
              {entryMethods.map((m) => {
                const info = METHOD_LABELS[m.method] ?? { label: m.method, emoji: "📋" };
                return (
                  <div key={m.method} className="bg-cubby-stone rounded-2xl px-3.5 py-2.5 flex items-center gap-2">
                    <span className="text-sm">{info.emoji}</span>
                    <div>
                      <p className="text-xs font-black text-cubby-charcoal leading-tight">{info.label}</p>
                      <p className="text-[10px] text-cubby-taupe">{m.count} item{m.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestones */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Milestones</p>
            <p className="text-xs text-cubby-taupe font-semibold">{achievedCount}/{milestones.length} unlocked</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {milestones.map((m) => (
              <MilestoneCard key={m.id} milestone={m} animated={animated} />
            ))}
          </div>
        </div>

        {/* Member since */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-cubby-taupe">
            Cubby member since{" "}
            <span className="font-semibold text-cubby-charcoal">
              {new Date(memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
// Sub-components

function StatRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div>
      <p className="text-xs text-cubby-taupe font-semibold">{label}</p>
      <p className={cn("text-lg font-black", color)}>{value}</p>
    </div>
  );
}

function WeeklyChart({ chart, animated }: { chart: DayBucket[]; animated: boolean }) {
  const maxVal = Math.max(...chart.map((d) => Math.max(d.rescued, d.wasted)), 1);

  return (
    <div className="bg-cubby-cream rounded-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Last 7 days</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cubby-lime" />
            <span className="text-[10px] text-cubby-taupe font-semibold">Rescued</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cubby-urgent/60" />
            <span className="text-[10px] text-cubby-taupe font-semibold">Wasted</span>
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1.5 h-32">
        {chart.map((day) => {
          const rescuedH = (day.rescued / maxVal) * 100;
          const wastedH = (day.wasted / maxVal) * 100;
          const isToday = day.date === new Date().toISOString().split("T")[0];

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                <div className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="w-full rounded-t-lg bg-cubby-lime transition-all duration-700 ease-out"
                    style={{ height: animated ? day.rescued > 0 ? `${Math.max(rescuedH, 8)}%` : "0%" : "0%" }}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="w-full rounded-t-lg bg-cubby-urgent/50 transition-all duration-700 ease-out"
                    style={{ height: animated ? day.wasted > 0 ? `${Math.max(wastedH, 8)}%` : "0%" : "0%" }}
                  />
                </div>
              </div>
              <span className={cn("text-[10px] font-black", isToday ? "text-cubby-green" : "text-cubby-taupe")}>
                {isToday ? "Today" : day.label}
              </span>
            </div>
          );
        })}
      </div>

      {(() => {
        const weekRescued = chart.reduce((s, d) => s + d.rescued, 0);
        const weekWasted = chart.reduce((s, d) => s + d.wasted, 0);
        if (weekRescued + weekWasted === 0) return null;
        return (
          <div className="flex items-center justify-between pt-1 border-t border-cubby-stone">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cubby-green" />
              <span className="text-xs font-black text-cubby-green">{weekRescued} rescued</span>
            </div>
            <span className="text-xs text-cubby-taupe font-semibold">{weekWasted} wasted</span>
          </div>
        );
      })()}
    </div>
  );
}

function MilestoneCard({ milestone, animated }: { milestone: Milestone; animated: boolean }) {
  const { title, description, emoji, achieved, progress, isNew } = milestone;

  return (
    <div className={cn("bg-cubby-cream rounded-2xl p-4 space-y-2 transition-all", achieved ? "ring-2 ring-cubby-lime" : "opacity-70")}>
      <div className="flex items-center justify-between">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", achieved ? "bg-cubby-lime" : "bg-cubby-stone")}>
          {achieved ? <span className="text-lg">{emoji}</span> : <Lock className="w-4 h-4 text-cubby-taupe" />}
        </div>
        {isNew && achieved && (
          <span className="text-[9px] font-black bg-cubby-green text-white px-2 py-0.5 rounded-full uppercase">New</span>
        )}
      </div>
      <div>
        <p className="font-black text-xs text-cubby-charcoal">{title}</p>
        <p className="text-[10px] text-cubby-taupe leading-snug mt-0.5">{description}</p>
      </div>
      {!achieved && (
        <div className="w-full h-1.5 rounded-full bg-cubby-stone overflow-hidden">
          <div
            className="h-full rounded-full bg-cubby-lime/70 transition-all duration-700 ease-out"
            style={{ width: animated ? `${progress}%` : "0%" }}
          />
        </div>
      )}
    </div>
  );
}
