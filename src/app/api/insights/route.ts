/**
 * GET /api/insights
 *
 * Returns all data needed for the Insights page:
 *  - heroStat: personalised headline metric based on user motivations
 *  - weeklyChart: 7 days of rescued vs wasted counts
 *  - totals: lifetime counts (eaten, thrown out, active, total logged)
 *  - moneySaved: estimated £ saved
 *  - wasteValue: estimated £ wasted
 *  - streakDays: current streak
 *  - milestones: 10 milestones with achieved/locked state
 *  - topCategories: most logged categories
 *  - entryMethods: breakdown by how items were logged
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/auth-helpers";

// £ value estimates
const VALUE_PER_ITEM_SAVED = 1.8;

interface DayBucket {
  date: string; // YYYY-MM-DD
  label: string; // "Mon", "Tue", etc.
  rescued: number;
  wasted: number;
}

export async function GET() {
  const userId = await getRequiredUserId();

  const [
    user,
    allItems,
    challenges,
    activityCount,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        motivations: true,
        moneySaved: true,
        streakDays: true,
        lastActiveDate: true,
        createdAt: true,
      },
    }),
    prisma.inventoryItem.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        statusUpdatedAt: true,
        createdAt: true,
        category: true,
        entryMethod: true,
        wastedCostEstimate: true,
      },
    }),
    prisma.userChallenge.findMany({
      where: { userId },
    }),
    prisma.activityLog.count({
      where: { userId },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const eatenItems = allItems.filter((i) => i.status === "EATEN");
  const thrownOutItems = allItems.filter((i) => i.status === "THROWN_OUT");
  const activeItems = allItems.filter((i) => i.status === "ACTIVE");

  const eatenCount = eatenItems.length;
  const thrownOutCount = thrownOutItems.length;
  const activeCount = activeItems.length;
  const totalLogged = allItems.length;

  const moneySaved = Math.round(eatenCount * VALUE_PER_ITEM_SAVED * 10) / 10;
  const wasteValue =
    thrownOutItems.reduce((sum, i) => sum + (i.wastedCostEstimate ?? VALUE_PER_ITEM_SAVED), 0);

  const rescueRate =
    eatenCount + thrownOutCount > 0
      ? Math.round((eatenCount / (eatenCount + thrownOutCount)) * 100)
      : 0;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const weeklyChart: DayBucket[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    weeklyChart.push({
      date: dateStr,
      label: dayNames[d.getDay()],
      rescued: 0,
      wasted: 0,
    });
  }

  for (const item of allItems) {
    const changeDate = item.statusUpdatedAt ?? item.createdAt;
    if (!changeDate || changeDate < sevenDaysAgo) continue;
    const dateStr = changeDate.toISOString().split("T")[0];
    const bucket = weeklyChart.find((b) => b.date === dateStr);
    if (!bucket) continue;
    if (item.status === "EATEN" || item.status === "STILL_HERE") {
      bucket.rescued++;
    } else if (item.status === "THROWN_OUT") {
      bucket.wasted++;
    }
  }

  const catCounts: Record<string, number> = {};
  for (const item of allItems) {
    const cat = item.category || "Other";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  const methodCounts: Record<string, number> = {};
  for (const item of allItems) {
    const method = item.entryMethod || "MANUAL";
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  }
  const entryMethods = Object.entries(methodCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([method, count]) => ({ method, count }));

  const milestones = buildMilestones({
    eatenCount,
    thrownOutCount,
    totalLogged,
    moneySaved,
    streakDays: user.streakDays,
    rescueRate,
    activityCount,
    challenges,
  });

  const primaryMotivation = user.motivations?.[0] ?? "reduce-waste";

  let heroStat: { label: string; value: string; emoji: string; subtitle: string };

  switch (primaryMotivation) {
    case "save-money":
      heroStat = {
        label: "Money saved",
        value: `£${moneySaved.toFixed(2)}`,
        emoji: "💰",
        subtitle: moneySaved > 0
          ? `That's ${Math.floor(moneySaved / 3.5)} free coffees`
          : "Start logging food to track savings",
      };
      break;
    case "eat-healthier":
      heroStat = {
        label: "Items rescued",
        value: `${eatenCount}`,
        emoji: "🥗",
        subtitle: eatenCount > 0
          ? `${rescueRate}% rescue rate — keep it up!`
          : "Use items before they expire to rescue them",
      };
      break;
    case "reduce-waste":
    default:
      heroStat = {
        label: "Food rescued",
        value: `${eatenCount}`,
        emoji: "🌍",
        subtitle:
          eatenCount > 0
            ? `${rescueRate}% rescue rate — ${thrownOutCount} item${thrownOutCount !== 1 ? "s" : ""} wasted`
            : "Log your food and mark items as eaten to start",
      };
      break;
  }

  return NextResponse.json({
    heroStat,
    weeklyChart,
    totals: {
      eatenCount,
      thrownOutCount,
      activeCount,
      totalLogged,
      rescueRate,
    },
    moneySaved,
    wasteValue: Math.round(wasteValue * 100) / 100,
    streakDays: user.streakDays,
    milestones,
    topCategories,
    entryMethods,
    memberSince: user.createdAt,
  });
}

interface MilestoneInput {
  eatenCount: number;
  thrownOutCount: number;
  totalLogged: number;
  moneySaved: number;
  streakDays: number;
  rescueRate: number;
  activityCount: number;
  challenges: { completedAt: Date | null }[];
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

function buildMilestones(input: MilestoneInput): Milestone[] {
  const {
    eatenCount,
    totalLogged,
    moneySaved,
    streakDays,
    rescueRate,
    activityCount,
    challenges,
  } = input;

  const completedChallenges = challenges.filter((c) => c.completedAt).length;

  return [
    {
      id: "first-log",
      title: "First Log",
      description: "Add your first item to Cubby",
      emoji: "📝",
      achieved: totalLogged >= 1,
      progress: Math.min(totalLogged, 1) * 100,
    },
    {
      id: "pantry-starter",
      title: "Pantry Starter",
      description: "Log 10 items",
      emoji: "🧰",
      achieved: totalLogged >= 10,
      progress: Math.min((totalLogged / 10) * 100, 100),
    },
    {
      id: "food-saver",
      title: "Food Saver",
      description: "Rescue 5 items from going to waste",
      emoji: "🦸",
      achieved: eatenCount >= 5,
      progress: Math.min((eatenCount / 5) * 100, 100),
    },
    {
      id: "rescue-hero",
      title: "Rescue Hero",
      description: "Rescue 25 items",
      emoji: "🏆",
      achieved: eatenCount >= 25,
      progress: Math.min((eatenCount / 25) * 100, 100),
    },
    {
      id: "coffee-fund",
      title: "Coffee Fund",
      description: "Save enough for a free coffee (£3.50)",
      emoji: "☕",
      achieved: moneySaved >= 3.5,
      progress: Math.min((moneySaved / 3.5) * 100, 100),
    },
    {
      id: "big-saver",
      title: "Big Saver",
      description: "Save £20 or more",
      emoji: "💰",
      achieved: moneySaved >= 20,
      progress: Math.min((moneySaved / 20) * 100, 100),
    },
    {
      id: "streak-3",
      title: "On a Roll",
      description: "3-day activity streak",
      emoji: "🔥",
      achieved: streakDays >= 3,
      progress: Math.min((streakDays / 3) * 100, 100),
    },
    {
      id: "streak-7",
      title: "Week Warrior",
      description: "7-day activity streak",
      emoji: "⚡",
      achieved: streakDays >= 7,
      progress: Math.min((streakDays / 7) * 100, 100),
    },
    {
      id: "perfect-rate",
      title: "Zero Waste Star",
      description: "Achieve 100% rescue rate (10+ items)",
      emoji: "🌟",
      achieved: rescueRate === 100 && (eatenCount + input.thrownOutCount) >= 10,
      progress: rescueRate,
    },
    {
      id: "challenge-champ",
      title: "Challenge Champ",
      description: "Complete your first challenge",
      emoji: "🎯",
      achieved: completedChallenges >= 1,
      progress: activityCount > 0 ? Math.min(50, activityCount * 5) : 0,
    },
  ];
}
