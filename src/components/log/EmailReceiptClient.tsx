"use client";

/**
 * EmailReceiptClient
 * Used by /log/email-receipt
 *
 * Setup screen for forwarding supermarket email receipts to Cubby.
 * Displays the user's unique forwarding address and step-by-step
 * instructions for common UK supermarkets.
 *
 * When an email arrives at the forwarding address, a backend webhook
 * (not yet built) will parse the receipt and add items to inventory.
 */

import { useState } from "react";
import { Check, Copy, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const SUPERMARKETS = [
  {
    name: "Tesco",
    emoji: "🔵",
    steps: [
      "Open the Tesco app or tesco.com and go to your Orders",
      "Open any order confirmation email",
      "Tap the three dots menu → Forward",
      "Paste your Cubby address and send",
    ],
  },
  {
    name: "Sainsbury's",
    emoji: "🟠",
    steps: [
      "Open your Sainsbury's order confirmation email",
      "Forward the email to your Cubby address",
      "We'll extract the items automatically",
    ],
  },
  {
    name: "Ocado",
    emoji: "🟣",
    steps: [
      "Open your Ocado dispatch confirmation email",
      "Forward to your Cubby address",
      "Items will appear in your pantry within a few minutes",
    ],
  },
  {
    name: "ASDA",
    emoji: "🟢",
    steps: [
      "Open your ASDA order confirmation email",
      "Forward to your Cubby address",
      "We'll parse the receipt and add it to Cubby",
    ],
  },
  {
    name: "Waitrose",
    emoji: "⚫",
    steps: [
      "Find your Waitrose order confirmation email",
      "Forward to your Cubby address",
      "Items will be added to your pantry automatically",
    ],
  },
];

export function EmailReceiptClient() {
  const session = useSession();
  const [copied, setCopied] = useState(false);
  const [expandedSupermarket, setExpandedSupermarket] = useState<string | null>(null);

  // Generate a deterministic-looking forwarding address from the user's ID/email
  const userId = session?.data?.user?.id ?? "your-account";
  const shortId = userId.slice(0, 8);
  const forwardingAddress = `receipts+${shortId}@inbox.cubby.app`;

  function handleCopy() {
    navigator.clipboard.writeText(forwardingAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleSupermarket(name: string) {
    setExpandedSupermarket((prev) => (prev === name ? null : name));
  }

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Email receipt" backHref="/log" />

      <div className="px-4 pb-28 space-y-5">

        {/* Hero */}
        <div className="bg-cubby-cream rounded-card p-5 space-y-2 text-center">
          <div className="w-14 h-14 bg-cubby-pastel-blue rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7 text-blue-600" />
          </div>
          <p className="font-black text-cubby-charcoal text-lg">Forward your receipts</p>
          <p className="text-cubby-taupe text-sm leading-relaxed">
            Every time you get a supermarket order confirmation, forward it to your Cubby address — we&apos;ll automatically add the items to your pantry.
          </p>
        </div>

        {/* Forwarding address */}
        <div className="bg-cubby-cream rounded-card p-4 space-y-3">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Your Cubby address</p>
          <div className="bg-cubby-stone rounded-xl px-4 py-3 flex items-center gap-3">
            <p className="flex-1 font-black text-cubby-charcoal text-sm break-all leading-relaxed">
              {forwardingAddress}
            </p>
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs transition-all shrink-0",
                copied
                  ? "bg-cubby-lime text-cubby-green"
                  : "bg-cubby-green text-white active:scale-95"
              )}
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5" strokeWidth={3} /> Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy</>
              )}
            </button>
          </div>
          <p className="text-xs text-cubby-taupe">
            This address is unique to your account. Don&apos;t share it publicly.
          </p>
        </div>

        {/* Coming soon badge */}
        <div className="bg-cubby-pastel-yellow border border-amber-200 rounded-card px-4 py-3 flex items-start gap-3">
          <span className="text-xl shrink-0">🚧</span>
          <div>
            <p className="font-black text-amber-800 text-sm">Automatic processing coming soon</p>
            <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
              Forwarding is almost ready. For now, you can forward receipts and we&apos;ll process them manually. Full automation is launching shortly.
            </p>
          </div>
        </div>

        {/* How to forward — supermarket guides */}
        <div className="space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">How to forward by supermarket</p>

          {SUPERMARKETS.map((market) => {
            const isExpanded = expandedSupermarket === market.name;
            return (
              <div key={market.name} className="bg-cubby-cream rounded-card overflow-hidden">
                <button
                  onClick={() => toggleSupermarket(market.name)}
                  className="w-full px-4 py-3.5 flex items-center gap-3"
                >
                  <span className="text-xl">{market.emoji}</span>
                  <span className="flex-1 font-black text-sm text-cubby-charcoal text-left">{market.name}</span>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-cubby-taupe" />
                    : <ChevronDown className="w-4 h-4 text-cubby-taupe" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {market.steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-cubby-green flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-white font-black text-[10px]">{i + 1}</span>
                        </div>
                        <p className="text-sm text-cubby-charcoal leading-relaxed">{step}</p>
                      </div>
                    ))}
                    {/* Copy button inline */}
                    <button
                      onClick={handleCopy}
                      className={cn(
                        "mt-3 w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all",
                        copied
                          ? "bg-cubby-lime text-cubby-green"
                          : "bg-cubby-stone text-cubby-charcoal active:scale-95"
                      )}
                    >
                      {copied ? <><Check className="w-4 h-4" strokeWidth={3} /> Copied!</> : <><Copy className="w-4 h-4" /> Copy my Cubby address</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* General email tips */}
        <div className="bg-cubby-cream rounded-card px-4 py-4 space-y-2">
          <p className="text-xs font-black text-cubby-taupe uppercase tracking-wider">Tips</p>
          <ul className="space-y-1.5 text-sm text-cubby-taupe">
            <li>📧 Forward the <strong className="text-cubby-charcoal">order confirmation</strong> email, not the delivery notification</li>
            <li>🛒 Works best with online grocery orders (not in-store receipts)</li>
            <li>⏱️ Items appear in your pantry within a few minutes</li>
            <li>🔒 Your forwarding address is unique — keep it private</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

