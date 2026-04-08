"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

interface HomeHeaderProps {
  userName: string;
}

export function HomeHeader({ userName }: HomeHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-cubby-stone/95 backdrop-blur-sm px-4 py-4 flex items-center justify-between">
      {/* Cubby logo wordmark */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-cubby-green flex items-center justify-center">
          <span className="text-white text-sm font-black">C</span>
        </div>
        <span className="text-xl font-black text-cubby-charcoal">cubby</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell with badge */}
        <button className="relative w-10 h-10 rounded-full bg-cubby-cream border border-black/5 flex items-center justify-center active:scale-95 transition-transform">
          <Bell className="w-5 h-5 text-cubby-charcoal" />
          {/* Badge — shown when there are notifications */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cubby-urgent" />
        </button>

        {/* Profile avatar — links to /profile */}
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full bg-cubby-green flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="text-white text-sm font-black">
            {userName[0]?.toUpperCase() ?? "C"}
          </span>
        </Link>
      </div>
    </header>
  );
}
