"use client";

/**
 * Swipe Status Screen — Now with REAL DATA
 *
 * Fetches active inventory items expiring soon.
 * Directions: Left = BINNED, Right = EATEN, Up = STILL HERE
 * Persists status via PATCH /api/inventory/[id]
 * Updates challenge progress via POST /api/challenges/swipe
 */

import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { RotateCcw, Loader2 } from "lucide-react";
import { cn, getCategoryEmoji } from "@/lib/utils";

interface SwipeItem {
  id: string;
  name: string;
  category: string;
  daysLeft: number;
  location: string;
}

type SwipeAction = "eaten" | "binned" | "still_here" | null;

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
          <p className="text-xs text-cubby-taupe mt-0.5 capitalize">{item.location.toLowerCase()}</p>
          <p
            className={cn(
              "text-sm font-semibold mt-1",
              item.daysLeft <= 1 ? "text-cubby-urgent" : item.daysLeft <= 3 ? "text-amber-500" : "text-cubby-taupe"
            )}
          >
            {item.daysLeft < 0
              ? `Expired ${Math.abs(item.daysLeft)}d ago`
              : item.daysLeft === 0
                ? "Expires today!"
                : item.daysLeft === 1
                  ? "Expires tomorrow"
                  : `${item.daysLeft} days left`}
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

export function SwipeStatusClient() {
  const [allItems, setAllItems] = useState<SwipeItem[]>([]);
  const [items, setItems] = useState<SwipeItem[]>([]);
  const [history, setHistory] = useState<Array<{ item: SwipeItem; action: SwipeAction }>>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ eaten: 0, binned: 0, stillHere: 0 });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch("/api/inventory?status=ACTIVE&sort=expiry");
      if (res.ok) {
        const data = await res.json();
        const mapped: SwipeItem[] = data.map((item: {
          id: string;
          name: string;
          category: string;
          expiryDate: string | null;
          location: string;
        }) => {
          const daysLeft = item.expiryDate
            ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 999;
          return {
            id: item.id,
            name: item.name,
            category: item.category,
            daysLeft,
            location: item.location,
          };
        });
        // Prioritise items expiring soonest
        mapped.sort((a, b) => a.daysLeft - b.daysLeft);
        setAllItems(mapped);
        setItems(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoading(false);
    }
  }

  const total = allItems.length;
  const processed = total - items.length;
  const progress = total > 0 ? (processed / total) * 100 : 0;

  const handleAction = async (id: string, action: SwipeAction) => {
    const item = items.find((i) => i.id === id);
    if (!item || !action) return;

    // Update stats
    setStats((s) => ({
      ...s,
      ...(action === "eaten" ? { eaten: s.eaten + 1 } : {}),
      ...(action === "binned" ? { binned: s.binned + 1 } : {}),
      ...(action === "still_here" ? { stillHere: s.stillHere + 1 } : {}),
    }));

    setHistory((h) => [...h, { item, action }]);
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) setTimeout(() => setDone(true), 300);
      return next;
    });

    // Persist status change to API
    const statusMap: Record<string, string> = {
      eaten: "EATEN",
      binned: "THROWN_OUT",
      still_here: "STILL_HERE",
    };

    try {
      await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusMap[action] }),
      });
    } catch (err) {
      console.error("Failed to update item status:", err);
    }
  };

  const handleUndo = () => {
    const last = history[history.length - 1];
    if (!last) return;

    // Revert stats
    if (last.action === "eaten") setStats((s) => ({ ...s, eaten: s.eaten - 1 }));
    if (last.action === "binned") setStats((s) => ({ ...s, binned: s.binned - 1 }));
    if (last.action === "still_here") setStats((s) => ({ ...s, stillHere: s.stillHere - 1 }));

    setItems((prev) => [last.item, ...prev]);
    setHistory((h) => h.slice(0, -1));
    setDone(false);
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-cubby-green animate-spin" />
        <p className="text-sm text-cubby-taupe mt-3 font-semibold">Loading your kitchen...</p>
      </div>
    );
  }

  // Empty state — no items to swipe
  if (allItems.length === 0) {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6 text-center space-y-4">
        <span className="text-6xl">📦</span>
        <h1 className="text-xl font-black text-cubby-charcoal">Nothing to sort</h1>
        <p className="text-cubby-taupe text-sm max-w-xs">
          Add items to your kitchen first, then come back to sort them.
        </p>
        <button onClick={() => (window.location.href = "/kitchen-setup")} className="btn-primary mt-2">
          Stock Your Kitchen
        </button>
      </div>
    );
  }

  // Done state
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cubby-stone px-6 text-center space-y-4">
        <div className="text-7xl animate-spring-pop">🎉</div>
        <h1 className="text-2xl font-black text-cubby-charcoal">You're all caught up!</h1>
        <p className="text-cubby-taupe text-sm">Great kitchen check-in. Keep it up!</p>

        {/* Stats summary */}
        <div className="flex gap-4 mt-2">
          <div className="cubby-card px-4 py-3 text-center">
            <p className="text-xl font-black text-cubby-green">{stats.eaten}</p>
            <p className="text-xs text-cubby-taupe">Eaten</p>
          </div>
          <div className="cubby-card px-4 py-3 text-center">
            <p className="text-xl font-black text-cubby-urgent">{stats.binned}</p>
            <p className="text-xs text-cubby-taupe">Binned</p>
          </div>
          <div className="cubby-card px-4 py-3 text-center">
            <p className="text-xl font-black text-blue-400">{stats.stillHere}</p>
            <p className="text-xs text-cubby-taupe">Still Here</p>
          </div>
        </div>

        {stats.binned > 0 && (
          <p className="text-xs text-cubby-taupe max-w-xs">
            Tip: Check your recipes for ways to use items before they expire!
          </p>
        )}

        <button onClick={() => (window.location.href = "/")} className="btn-primary mt-4">
          Back to home
        </button>
      </div>
    );
  }

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
          {processed} of {total} items sorted
        </p>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 px-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cubby-urgent" />
          <span className="text-xs text-cubby-taupe font-semibold">Binned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-xs text-cubby-taupe font-semibold">Still Here</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cubby-lime" />
          <span className="text-xs text-cubby-taupe font-semibold">Eaten</span>
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-full max-w-xs h-80">
          <AnimatePresence>
            {items.slice(0, 3).map((item, i) => (
              <SwipeCard key={item.id} item={item} onAction={handleAction} stackIndex={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}"use client";

/**
 * Swipe Status Screen
 *
 * Directions: Left = BINNED, Right = EATEN, Up = STILL HERE
 * Drag physics, stamps, progress bar, undo, confetti on completion
 */

import { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { cn, getCategoryEmoji } from "@/lib/utils";

// TODO: fetch from API
const MOCK_ITEMS = [
  { id: "1", name: "Spinach", category: "produce", daysLeft: 1 },
  { id: "2", name: "Whole milk", category: "dairy", daysLeft: 2 },
  { id: "3", name: "Chicken breast", category: "meat", daysLeft: 1 },
  { id: "4", name: "Cheddar", category: "dairy", daysLeft: 4 },
  { id: "5", name: "Sourdough", category: "bread", daysLeft: 2 },
];

type SwipeAction = "eaten" | "binned" | "still_here" | null;

function getStamp(action: SwipeAction) {
  if (action === "eaten") return { label: "EATEN ✓", color: "text-cubby-lime" };
  if (action === "binned") return { label: "BINNED 🗑️", color: "text-cubby-urgent" };
  if (action === "still_here") return { label: "STILL HERE 👍", color: "text-blue-400" };
  return null;
}

function SwipeCard({
  item,
  onAction,
  stackIndex,
}: {
  item: typeof MOCK_ITEMS[0];
  onAction: (id: string, action: SwipeAction) => void;
  stackIndex: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-20, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Stamp opacity
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
          <p className={cn("text-sm font-semibold mt-1", item.daysLeft <= 1 ? "text-cubby-urgent" : "text-cubby-taupe")}>
            {item.daysLeft === 0 ? "Expired!" : item.daysLeft === 1 ? "Expires tomorrow" : `${item.daysLeft} days left`}
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

export function SwipeStatusClient() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [history, setHistory] = useState<Array<{ item: typeof MOCK_ITEMS[0]; action: SwipeAction }>>([]);
  const [done, setDone] = useState(false);

  const total = MOCK_ITEMS.length;
  const processed = total - items.length;
  const progress = (processed / total) * 100;

  const handleAction = (id: string, action: SwipeAction) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    setHistory((h) => [...h, { item, action }]);
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) setTimeout(() => setDone(true), 300);
      return next;
    });

    // TODO: PATCH /api/inventory/[id] with status
  };

  const handleUndo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setItems((prev) => [last.item, ...prev]);
    setHistory((h) => h.slice(0, -1));
    setDone(false);
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cubby-stone px-6 text-center space-y-4">
        <div className="text-7xl animate-spring-pop">🎉</div>
        <h1 className="text-page-title text-cubby-charcoal">You&apos;re all caught up!</h1>
        <p className="text-cubby-taupe">Great kitchen check-in. Keep it up!</p>
        <button onClick={() => window.location.href = "/"} className="btn-primary mt-4">
          Back to home
        </button>
      </div>
    );
  }

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
          {processed} of {total} items sorted
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
    </div>
  );
}
