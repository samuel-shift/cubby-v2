"use client";

import Link from "next/link";
import { ChevronRight, UtensilsCrossed, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function MyKitchenCard() {
    const [itemCount, setItemCount] = useState<number | null>(null);
    const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
        fetch("/api/inventory")
          .then((r) => r.json())
          .then(({ items }) => setItemCount(items.length))
          .catch(() => {});

                fetch("/api/kitchen-setup")
          .then((r) => r.json())
          .then(({ complete }) => setSetupComplete(complete))
          .catch(() => setSetupComplete(false));
  }, []);

  const isEmpty = itemCount === 0 && setupComplete === false;

  if (isEmpty) {
        return (
                <Link href="/kitchen-setup">
                        <div className="cubby-card px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-transform border-2 border-cubby-green/30 bg-cubby-green/5">
                                  <div className="flex items-center gap-3">
                                              <div className="w-12 h-12 rounded-2xl bg-cubby-green/20 flex items-center justify-center">
                                                            <Sparkles className="w-6 h-6 text-cubby-green" />
                                              </div>div>
                                              <div>
                                                            <p className="font-black text-cubby-charcoal">Stock your kitchen</p>p>
                                                            <p className="text-sm text-cubby-green font-medium">
                                                                            Add 100 common items in 60 seconds →
                                                            </p>p>
                                              </div>div>
                                  </div>div>
                                  <ChevronRight className="w-5 h-5 text-cubby-green" />
                        </div>div>
                </Link>Link>
              );
  }
  
    return (
          <Link href="/pantry">
                <div className="cubby-card px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-transform">
                        <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-2xl bg-cubby-green/10 flex items-center justify-center">
                                              <UtensilsCrossed className="w-6 h-6 text-cubby-green" />
                                  </div>div>
                                  <div>
                                              <p className="font-black text-cubby-charcoal">My Kitchen</p>p>
                                              <p className="text-sm text-cubby-taupe">
                                                {itemCount === null
                                                                  ? "Loading…"
                                                                  : `${itemCount} ${itemCount === 1 ? "item" : "items"} tracked`}
                                              </p>p>
                                  </div>div>
                        </div>div>
                        <ChevronRight className="w-5 h-5 text-cubby-taupe" />
                </div>div>
          </Link>Link>
        );
}</Link>
