"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, backHref, rightSlot, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-cubby-stone/95 backdrop-blur-sm",
        "px-4 py-4 flex items-center justify-between",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="w-10 h-10 rounded-full bg-cubby-cream border border-black/5 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-cubby-charcoal" />
          </Link>
        )}
        <h1 className="text-xl font-black text-cubby-charcoal">{title}</h1>
      </div>
      {rightSlot && <div>{rightSlot}</div>}
    </header>
  );
}
