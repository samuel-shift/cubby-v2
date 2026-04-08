import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "urgent" | "info" | "pastel-pink" | "pastel-blue" | "pastel-green" | "pastel-yellow";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-cubby-taupe/15 text-cubby-charcoal",
  success: "bg-cubby-lime/25 text-cubby-green",
  warning: "bg-cubby-salmon/15 text-cubby-salmon",
  urgent: "bg-cubby-urgent/10 text-cubby-urgent",
  info: "bg-cubby-pastel-blue text-blue-700",
  "pastel-pink": "bg-cubby-pastel-pink text-rose-700",
  "pastel-blue": "bg-cubby-pastel-blue text-blue-700",
  "pastel-green": "bg-cubby-pastel-green text-green-700",
  "pastel-yellow": "bg-cubby-pastel-yellow text-amber-700",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-black px-2.5 py-1 rounded-full",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
