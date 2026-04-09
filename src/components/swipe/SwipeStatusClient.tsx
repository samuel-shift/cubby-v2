"use client";

/**
 * Swipe Status Screen
 *
 * Directions: Left = BINNED, Right = EATEN, Up = STILL HERE
 * Drag physics, stamps, progress bar, undo, confetti on completion.
 * Fetches real inventory from /api/inventory and PATCHes status on each swipe.
 */

import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { cn, getCategoryEmoji } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  expiryDate: string | null;
  status: string;
}

interface SwipeItem {
  id: string;
  name: string;
  category: string;
  daysLeft: number | null;
}

type SwipeAction = "eaten" | "binned" | "still_here" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

function expiryLabel(days: number | null): string {
  if (days === null) return "No expiry set";
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `${days} days left`;
}

function expiryColor(days: number | null): string {
  if (days === null) return "text-cubby-taupe";
  if (days <= 1) return "text-cubby-urgent";
  if (days <= 3) return "text-amber-500";
  return "text-cubby-taupe";
}

async function patchInventoryStatus(
  id: string,
  action: SwipeAction
): Promise<void> {
  const statusMap: Record<NonNullable<SwipeAction>, string> = {
    eaten: "EATEN",
    binned: "THROWN_OUT",
    still_here: "STILL_HERE",
  };
  if (!action) return;
  try {
    await fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusMap[action] }),
    });
  } catch {
    // Best-effort — swipe UI already committed locally
  }
}

// ─── SwipeCard ────────────────────────────────────────────────────────────────

function SwipeCard({
  item,
  onAction,
  stackIndex,
}: {
  item: SwipeItem;
  onAction: (id: string, action: SwipeAction) => void;
  stackIndex: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-20, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const eatenOpacity = useTransform(x, [0, 80], [0, 1]);
  const binnedOpacity = useTransform(x, [-80, 0], [1, 0]);
  const stillHereOpacity = useTransform(y, [-80, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (info.offset.x > 100) onAction(item.id, "eaten");
    else if (info.offset.x < -100) onAction(item.id, "binned");
    else if (info.offset.y < -100) onAction(item.id, "still_here");
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        x,
        y,
        rotate,
        opacity,
        zIndex: 10 - stackIndex,
        scale: 1 - stackIndex * 0.04,
        translateY: stackIndex * 12,
      }}
      drag={stackIndex === 0}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: "grabbing" }}
    >
      <div className="w-full h-full bg-cubby-cream border border-black/5 rounded-tile flex flex-col items-center justify-center gap-4 p-6 relative overflow-hidden">
        {/* Stamps */}
        <motion.div
          className="absolute top-8 right-8 border-4 border-cubby-lime rounded-xl px-4 py-2 rotate-12"
          style={{ opacity: eatenOpacity }}
        >
          <span className="text-cubby-lime font-black text-xl tracking-wide">EATEN</span>
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 border-4 border-cubby-urgent rounded-xl px-4 py-2 -rotate-12"
          style={{ opacity: binnedOpacity }}
        >
          <span className="text-cubby-urgent font-black text-xl tracking-wide">BINNED</span>
        </motion.div>
        <motion.div
          className="absolute top-8 left-1/2 -translate-x-1/2 border-4 border-blue-400 rounded-xl px-4 py-2"
          style={{ opacity: stillHereOpacity }}
        >
          <span className="text-blue-400 font-black text-xl tracking-wide">STILL HERE</span>
        </motion.div>

        <span className="text-6xl">{getCategoryEmoji(item.category)}</span>
        <div className="text-center">
          <p className="font-black text-cubby-charcoal text-xl">{item.name}</p>
          <p className={cn("text-sm font-semibold mt-1", expiryColor(item.daysLeft))}>
            {expiryLabel(item.daysLeft)}
          </p>
        </div>

        {stackIndex === 0 && (
          <div className="absolute bottom-6 text-xs text-cubby-taupe font-semibold flex gap-4">
            <span>← binned</span>
            <span>↑ still here</span>
            <span>eaten →</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function SwipeStatusClient() {
  const [allItems, setAllItems] = useState<SwipeItem[]>([]);
  const [items, setItems] = useState<SwipeItem[]>([]);
  const [history, setHistory] = useState<Array<{ item: SwipeItem; action: SwipeAction }>>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch real inventory on mount — prioritise expiring/unresolved items
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/inventory");
        if (!res.ok) throw new Error("Failed to fetch");
        const { items: raw }: { items: InventoryItem[] } = await res.json();

        const swipeItems: SwipeItem[] = raw.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          daysLeft: daysUntil(item.expiryDate),
        }));

        // Sort: expired first, then by days left ascending, then no-date items
        swipeItems.sort((a, b) => {
          if (a.daysLeft === null && b.daysLeft === null) return 0;
          if (a.daysLeft === null) return 1;
          if (b.daysLeft === null) return -1;
          return a.daysLeft - b.daysLeft;
        });

        setAllItems(swipeItems);
        setItems(swipeItems);
      } catch {
        // Fall back to empty — show a message
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const total = allItems.length;
  const processed = total - items.length;
  const progress = total === 0 ? 0 : (processed / total) * 100;

  const handleAction = (id: string, action: SwipeAction) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Persist to API
    patchInventoryStatus(id, action);

    setHistory((h) => [...h, { item, action }]);
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) setTimeout(() => setDone(true), 300);
      return next;
    });
  };

  const handleUndo = () => {
    const last = history[history.length - 1];
    if (!last) return;

    // Revert status back to ACTIVE
    fetch(`/api/inventory/${last.item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    }).catch(() => {});

    setItems((prev) => [last.item, ...prev]);
    setHistory((h) => h.slice(0, -1));
    setDone(false);
  };

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-cubby-stone flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">🍽️</div>
          <p className="text-cubby-taupe font-semibold text-sm">Loading your kitchen…</p>
        </div>
      </div>
    );
  }

  // ─── Empty ──────────────────────────────────────────────────────────────────

  if (!loading && total === 0) {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6 text-center space-y-4">
        <div className="text-6xl">🧊</div>
        <h1 className="font-black text-cubby-charcoal text-xl">Your kitchen is empty</h1>
        <p className="text-cubby-taupe text-sm">Add some items first, then come back to do a quick status check.</p>
        <button onClick={() => window.location.href = "/log"} className="btn-primary mt-2">
          Add items
        </button>
      </div>
    );
  }

  // ─── Done ───────────────────────────────────────────────────────────────────

  if (done) {
    const eaten = history.filter((h) => h.action === "eaten").length;
    const binned = history.filter((h) => h.action === "binned").length;
    const stillHere = history.filter((h) => h.action === "still_here").length;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cubby-stone px-6 text-center space-y-5">
        <div className="text-7xl animate-spring-pop">🎉</div>
        <h1 className="text-page-title text-cubby-charcoal">You&apos;re all caught up!</h1>

        <div className="cubby-card w-full max-w-xs space-y-3 text-left">
          {eaten > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-cubby-charcoal">✅ Eaten</span>
              <span className="font-black text-cubby-charcoal">{eaten} item{eaten !== 1 ? "s" : ""}</span>
            </div>
          )}
          {binned > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-cubby-charcoal">🗑️ Binned</span>
              <span className="font-black text-cubby-charcoal">{binned} item{binned !== 1 ? "s" : ""}</span>
            </div>
          )}
          {stillHere > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-cubby-charcoal">📦 Still in your kitchen</span>
              <span className="font-black text-cubby-charcoal">{stillHere} item{stillHere !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {eaten > 0 && (
          <p className="text-cubby-taupe text-sm">
            Great kitchen check-in. Keep it up!
          </p>
        )}

        <button onClick={() => window.location.href = "/"} className="btn-primary mt-2">
          Back to home
        </button>
      </div>
    );
  }

  // ─── Main swipe UI ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cubby-stone flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-cubby-charcoal">Swipe Status</h1>
        {history.length > 0 && (
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 text-sm font-semibold text-cubby-taupe"
          >
            <RotateCcw className="w-4 h-4" />
            Undo
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-2 rounded-full bg-cubby-cream overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-cubby-lime"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-cubby-taupe font-semibold mt-1.5">
          {processed} of {total} item{total !== 1 ? "s" : ""} sorted
        </p>
      </div>

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-full max-w-xs h-80">
          <AnimatePresence>
            {items.slice(0, 3).map((item, i) => (
              <SwipeCard
                key={item.id}
                item={item}
                onAction={handleAction}
                stackIndex={i}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Accessibility fallback buttons */}
      <div className="px-6 pb-10 space-y-3">
        <p className="text-xs text-cubby-taupe text-center font-semibold mb-4">Or tap to choose:</p>
        <div className="flex gap-3">
          <button
            onClick={() => items[0] && handleAction(items[0].id, "binned")}
            className="flex-1 py-3 rounded-2xl bg-cubby-salmon/20 text-cubby-urgent font-black text-sm active:scale-95 transition-transform"
          >
            🗑️ Binned
          </button>
          <button
            onClick={() => items[0] && handleAction(items[0].id, "still_here")}
            className="flex-1 py-3 rounded-2xl bg-blue-50 text-blue-600 font-black text-sm active:scale-95 transition-transform"
          >
            📦 Still here
          </button>
          <button
            onClick={() => items[0] && handleAction(items[0].id, "eaten")}
            className="flex-1 py-3 rounded-2xl bg-cubby-lime/30 text-cubby-green font-black text-sm active:scale-95 transition-transform"
          >
            ✅ Eaten
          </button>
        </div>
      </div>
    </div>
  );
}
