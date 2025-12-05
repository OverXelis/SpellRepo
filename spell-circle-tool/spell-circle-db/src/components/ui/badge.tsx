import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-arcane-500 focus:ring-offset-2 badge-magic",
  {
    variants: {
      variant: {
        default: "border-transparent bg-dark-700 text-slate-200 hover:bg-dark-600",
        secondary: "border-transparent bg-dark-600 text-slate-300 hover:bg-dark-500",
        destructive: "border-transparent bg-red-900/50 text-red-300 border border-red-700/50 hover:bg-red-900/70",
        outline: "border-dark-500 text-slate-300 hover:border-dark-400",
        primary: "border-transparent bg-gradient-to-r from-arcane-900/60 to-arcane-800/60 text-arcane-200 border border-arcane-600/40 shadow-sm shadow-arcane-500/10 hover:shadow-arcane-500/20 hover:border-arcane-500/60",
        modifier: "border-transparent bg-gradient-to-r from-emerald-900/60 to-emerald-800/60 text-emerald-200 border border-emerald-600/40 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:border-emerald-500/60",
        control: "border-transparent bg-gradient-to-r from-amber-900/60 to-amber-800/60 text-amber-200 border border-amber-600/40 shadow-sm shadow-amber-500/10 hover:shadow-amber-500/20 hover:border-amber-500/60",
        base: "border-transparent bg-gradient-to-r from-mystic-900/60 to-mystic-800/60 text-mystic-200 border border-mystic-600/40 shadow-sm shadow-mystic-500/10 hover:shadow-mystic-500/20 hover:border-mystic-500/60",
        gold: "border-transparent bg-gradient-to-r from-gold-900/60 to-gold-800/60 text-gold-200 border border-gold-600/40 shadow-sm shadow-gold-500/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
