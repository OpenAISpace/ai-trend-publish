import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-white/10 text-foreground",
        success:
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 font-semibold",
        warning:
          "border-amber-400/30 bg-amber-500/10 text-amber-200 font-semibold",
        danger:
          "border-rose-500/40 bg-rose-500/10 text-rose-200 font-semibold",
        outline: "border-white/20 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
