"use client";
import { useState, useCallback } from "react";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_STOCK_ITEMS } from "@/lib/grocery-data";
import { useRouter } from "next/navigation";
/**
 * KitchenSetupClient — "Complete Your Kitchen" one-time challenge
 */
export function KitchenSetupClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const toggle = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);
  async function handleSubmit() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const items = Array.from(selected).map((i) => QUICK_STOCK_ITEMS[i]);
      await Promise.allSettled(
        items.map((item) =>
          fetch("/api/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              category: item.category,
              location: item.location,
              quantity: 1,
              unit: "item",
            }),
          })
        )
      );
      try {
        await fetch("/api/kitchen-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ complete: true }),
        });
      } catch {
        // non-critical
      }
      setDone(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }
  if (done) {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6 text-center space-y-6">
        <div className="text-7xl animate-spring-pop">🎉</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-cubby-charcoal">Kitchen stocked!</h1>
          <p className="text-cubby-taupe text-sm">
            {selected.size} item{selected.size !== 1 ? "s" : ""} added to your kitchen. Nice one!
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="bg-cubby-green text-white px-8 py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-transform"
        >
          Back to home
        </button>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-cubby-stone">
      {/* Header */}
      <div className="px-4 pt-14 pb-3 sticky top-0 z-10 bg-cubby-stone">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-cubby-cream flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-cubby-charcoal" />
          </button>
          <div>
            <h1 className="font-black text-cubby-charcoal text-xl">Complete Your Kitchen</h1>
            <p className="text-cubby-taupe text-xs">Tap everything you have at home</p>
          </div>
        </div>
      </div>
      {/* Product grid — pb-52 ensures content scrolls clear of the fixed bottom bar + nav */}
      <div className="px-4 pb-52">
        <div className="flex flex-wrap gap-2">
          {QUICK_STOCK_ITEMS.map((item, i) => {
            const isSelected = selected.has(i);
            return (
              <button
                key={item.name}
                onClick={() => toggle(i)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-sm font-black transition-colors active:scale-95",
                  isSelected
                    ? "bg-cubby-green text-white shadow-sm"
                    : "bg-cubby-cream text-cubby-charcoal border border-black/5"
                )}
              >
                <span className="text-base">{item.emoji}</span>
                <span>{item.name}</span>
                {/* Fixed-size container prevents layout shift when check appears */}
                <span className="w-3.5 h-3.5 ml-0.5 flex-shrink-0">
                  {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Fixed bottom bar — bottom-20 clears the 80px app nav bar */}
      <div className="fixed bottom-20 left-0 right-0 bg-cubby-stone border-t border-black/5 px-4 pt-4 pb-4">
        {selected.size > 0 && (
          <p className="text-center text-sm font-black text-cubby-green mb-3">
            {selected.size} item{selected.size !== 1 ? "s" : ""} selected
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0 || loading}
          className={cn(
            "w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]",
            selected.size > 0
              ? "bg-cubby-green text-white"
              : "bg-cubby-cream text-cubby-taupe"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding to kitchen…
            </>
          ) : selected.size > 0 ? (
            `Add ${selected.size} item${selected.size !== 1 ? "s" : ""} to kitchen`
          ) : (
            "Select items above"
          )}
        </button>
      </div>
    </div>
  );
}
