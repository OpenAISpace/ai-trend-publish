import * as React from "react";
import { cn } from "../../lib/cn";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full appearance-none rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-foreground transition focus:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
