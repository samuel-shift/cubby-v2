import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date as "Today", "Tomorrow", "In N days", or "N days ago" */
export function formatExpiryLabel(date: Date | string | null | undefined): {
  label: string;
  urgency: "critical" | "warning" | "safe" | "expired" | "unknown";
} {
  if (!date) return { label: "No expiry", urgency: "unknown" };

  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffMs = d.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `Expired ${Math.abs(diffDays)}d ago`, urgency: "expired" };
  if (diffDays === 0) return { label: "Expires today", urgency: "critical" };
  if (diffDays === 1) return { label: "Expires tomorrow", urgency: "critical" };
  if (diffDays <= 3) return { label: `${diffDays} days left`, urgency: "warning" };
  if (diffDays <= 7) return { label: `${diffDays} days left`, urgency: "warning" };
  return { label: `${diffDays} days left`, urgency: "safe" };
}

/** Get category emoji for an item */
export const CATEGORY_EMOJI: Record<string, string> = {
  dairy: "🥛",
  meat: "🥩",
  fish: "🐟",
  produce: "🥦",
  bread: "🍞",
  frozen: "🧊",
  canned: "🥫",
  condiments: "🫙",
  drinks: "🥤",
  snacks: "🍿",
  grains: "🌾",
  eggs: "🥚",
  fruit: "🍎",
  herbs: "🌿",
  other: "📦",
  "dairy & eggs": "🥛",
  "meat & fish": "🥩",
  "fresh produce": "🥦",
  "fruit & veg": "🍎",
  "bakery": "🍞",
  "tins & canned": "🥫",
  "condiments & sauces": "🫙",
  "drinks & beverages": "🥤",
  "snacks & crisps": "🍿",
  "grains & pasta": "🌾",
  "rice & grains": "🌾",
  "pasta & noodles": "🍝",
  "breakfast & cereals": "🥣",
  "oils & vinegars": "🫒",
  "baking": "🧁",
  "spices & herbs": "🌿",
  "spreads & jams": "🍯",
  "tea & coffee": "☕",
  "cleaning": "🧹",
  "toiletries": "🧴",
};

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category.toLowerCase()] ?? "📦";
}

/** Format money */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Truncate text */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
