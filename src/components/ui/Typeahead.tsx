"use client";

/**
 * Typeahead â Autocomplete dropdown for grocery items.
 * Shows top matches as the user types. Fires onSelect when a suggestion is tapped.
 * Uses onMouseDown instead of onClick so it fires before the input's onBlur.
 */

import { cn } from "@/lib/utils";

interface TypeaheadProps {
  value: string;
  suggestions: string[];
  onSelect: (val: string) => void;
  maxResults?: number;
  className?: string;
}

export function Typeahead({
  value,
  suggestions,
  onSelect,
  maxResults = 6,
  className,
}: TypeaheadProps) {
  if (!value.trim() || value.trim().length < 2) return null;

  const lower = value.toLowerCase();
  const matches = suggestions
    .filter((s) => s.toLowerCase().includes(lower))
    .slice(0, maxResults);

  if (matches.length === 0) return null;

  return (
    <ul
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-lg",
        className
      )}
    >
      {matches.map((match) => (
        <li key={match}>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(match);
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-cubby-charcoal hover:bg-cubby-stone active:bg-cubby-stone transition-colors"
          >
            {match}
          </button>
        </li>
      ))}
    </ul>
  );
}
