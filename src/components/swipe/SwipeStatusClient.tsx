"use client";

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
