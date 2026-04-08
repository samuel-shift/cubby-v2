"use client";

/**
 * Log Food — Unified Entry Point
 *
 * 3 top-level options + sub-options.
 */

import Link from "next/link";
import { Camera, Receipt, KeyboardIcon, ChefHat, Trash2, Mic, Mail, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

const LOG_OPTIONS = [
  {
    id: "bought",
    label: "I bought food",
    emoji: "🛒",
    description: "Add items you just bought",
    color: "bg-cubby-pastel-green",
    textColor: "text-green-700",
    subOptions: [
      { label: "Scan barcode", icon: ScanLine, href: "/log/barcode" },
      { label: "Receipt photo", icon: Receipt, href: "/log/receipt" },
      { label: "Type it in", icon: KeyboardIcon, href: "/log/barcode?manual=1" },
      {
        label: "Voice input",
        icon: Mic,
        href: "#",
        comingSoon: true,
      },
    ],
  },
  {
    id: "cooked",
    label: "I cooked a meal",
    emoji: "👩‍🍳",
    description: "Log what ingredients you used",
    color: "bg-cubby-pastel-yellow",
    textColor: "text-amber-700",
    subOptions: [
      { label: "Photo of meal", icon: Camera, href: "/log/meal" },
      { label: "Type it in", icon: KeyboardIcon, href: "/log/meal?manual=1" },
      {
        label: "Voice input",
        icon: Mic,
        href: "#",
        comingSoon: true,
      },
    ],
  },
  {
    id: "waste",
    label: "I threw food away",
    emoji: "🗑️",
    description: "Log what you wasted",
    color: "bg-cubby-urgent/10",
    textColor: "text-cubby-urgent",
    subOptions: [
      { label: "Photo of bin", icon: Trash2, href: "/log/waste" },
      { label: "Type it in", icon: KeyboardIcon, href: "/log/waste?manual=1" },
    ],
  },
];

const MORE_OPTIONS = [
  { label: "Kitchen snapshot", icon: Camera, href: "/log/snapshot", description: "Multi-photo scan of your kitchen" },
  { label: "Email receipt", icon: Mail, href: "/log/email-receipt", description: "Set up supermarket email forwarding" },
];

export function LogFoodClient() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Log food" backHref="/" />

      <div className="px-4 space-y-6 pb-10">
        {/* Main 3 options */}
        {LOG_OPTIONS.map((option) => (
          <div key={option.id} className="space-y-2">
            <div className={cn("cubby-card p-4 flex items-center gap-3", option.color.replace("bg-", "border-l-4 border-"))}>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", option.color)}>
                <span className="text-2xl">{option.emoji}</span>
              </div>
              <div>
                <p className="font-black text-cubby-charcoal">{option.label}</p>
                <p className="text-xs text-cubby-taupe">{option.description}</p>
              </div>
            </div>

            {/* Sub-options */}
            <div className="grid grid-cols-2 gap-2 pl-4">
              {option.subOptions.map((sub) => {
                const Icon = sub.icon;
                return (
                  <Link
                    key={sub.label}
                    href={sub.href}
                    className={cn(
                      "cubby-card px-4 py-3 flex items-center gap-2 active:scale-[0.97] transition-transform",
                      sub.comingSoon && "opacity-40 pointer-events-none"
                    )}
                  >
                    <Icon className="w-4 h-4 text-cubby-charcoal flex-shrink-0" />
                    <span className="text-sm font-semibold text-cubby-charcoal leading-tight">{sub.label}</span>
                    {sub.comingSoon && (
                      <span className="text-[10px] font-black text-cubby-taupe ml-auto">Soon</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* More options (from v1) */}
        <div className="space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">More options</p>
          {MORE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link key={opt.label} href={opt.href} className="cubby-card px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform block">
                <div className="w-9 h-9 rounded-xl bg-cubby-stone flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-cubby-charcoal" />
                </div>
                <div>
                  <p className="text-sm font-black text-cubby-charcoal">{opt.label}</p>
                  <p className="text-xs text-cubby-taupe">{opt.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
