"use client";

/**
 * Data Insight Nudge — ENTIRELY NEW
 * Personalised insight card with YES/NO buttons.
 * e.g. "You usually throw away milk. Want a reminder 3 days before?"
 */

import { Lightbulb } from "lucide-react";
import { useState } from "react";

export function DataInsightNudge() {
  const [dismissed, setDismissed] = useState(false);

  // TODO: Replace with personalised insight from API
  const insight = {
    text: "You tend to waste fresh herbs. Want a reminder 2 days before they expire?",
    yesLabel: "Yes, remind me",
    noLabel: "Not now",
  };

  if (dismissed) return null;

  return (
    <div className="cubby-card px-5 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-cubby-pastel-yellow flex-shrink-0 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-amber-600" />
        </div>
        <p className="text-sm text-cubby-charcoal font-semibold leading-snug pt-1">
          {insight.text}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            // TODO: save preference
            setDismissed(true);
          }}
          className="flex-1 bg-cubby-green text-white font-black text-sm py-2.5 rounded-full"
        >
          {insight.yesLabel}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-1 bg-cubby-stone text-cubby-taupe font-semibold text-sm py-2.5 rounded-full"
        >
          {insight.noLabel}
        </button>
      </div>
    </div>
  );
}
