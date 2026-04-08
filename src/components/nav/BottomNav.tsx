"use client";

/**
 * BottomNav — 5-tab layout per gap analysis decision
 *
 * Tabs: Home │ Recipes │ FAB (Log food) │ Shopping │ Insights
 *
 * Design decisions from gap analysis:
 * - Keep 5-tab layout (do NOT reduce to 4 — Shopping is a first-class tab)
 * - FAB: elevated green square "Log food" (new Figma styling)
 * - Profile: behind header avatar (not a nav tab)
 * - New design tokens: rounded-fab, cubby-green, etc.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Plus, ShoppingCart, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    exactMatch: true,
  },
  {
    href: "/recipes",
    label: "Recipes",
    icon: BookOpen,
  },
  // FAB — centre action (Log food)
  {
    href: "/log",
    label: "Log food",
    icon: Plus,
    isFab: true,
  },
  {
    href: "/shopping",
    label: "Shopping",
    icon: ShoppingCart,
  },
  {
    href: "/insights",
    label: "Insights",
    icon: BarChart2,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-1/2 -translate-x-1/2",
        "w-full max-w-sm",
        "bg-cubby-cream border-t border-black/5",
        "flex items-end justify-around",
        "px-2",
        // Height includes safe area for home indicator
        "pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-2",
        "z-50"
      )}
      style={{ height: "var(--bottom-nav-height)" }}
    >
      {NAV_TABS.map((tab) => {
        const active = isActive(tab.href, "exactMatch" in tab ? tab.exactMatch : false);

        if ("isFab" in tab && tab.isFab) {
          // ─── FAB: elevated green square with plus icon ───
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 -mt-5",
                "focus:outline-none"
              )}
              aria-label="Log food"
            >
              <span
                className={cn(
                  "w-14 h-14 rounded-fab bg-cubby-green",
                  "flex items-center justify-center",
                  "transition-transform duration-100 active:scale-95",
                  active && "ring-2 ring-cubby-lime ring-offset-1"
                )}
              >
                <Plus className="w-7 h-7 text-white stroke-[2.5]" />
              </span>
              <span className="text-[10px] font-black text-cubby-green">
                Log food
              </span>
            </Link>
          );
        }

        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[52px]",
              "focus:outline-none transition-colors duration-100"
            )}
          >
            <Icon
              className={cn(
                "w-6 h-6 transition-colors",
                active
                  ? "text-cubby-green stroke-[2.5]"
                  : "text-cubby-taupe stroke-[1.5]"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-semibold transition-colors",
                active ? "text-cubby-green font-black" : "text-cubby-taupe"
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
