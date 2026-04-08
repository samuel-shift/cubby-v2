"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-black text-cubby-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-cubby-cream border border-black/10 rounded-2xl",
            "px-4 py-3 text-base text-cubby-charcoal",
            "placeholder:text-cubby-taupe",
            "focus:outline-none focus:ring-2 focus:ring-cubby-green/30 focus:border-cubby-green",
            "transition-all duration-150",
            error && "border-cubby-urgent focus:ring-cubby-urgent/30",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-cubby-urgent font-semibold">{error}</p>}
        {hint && !error && <p className="text-xs text-cubby-taupe">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
