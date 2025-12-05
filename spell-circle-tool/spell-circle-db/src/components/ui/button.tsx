import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcane-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-800 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-arcane-500 to-arcane-600 text-white hover:from-arcane-400 hover:to-arcane-500 shadow-lg shadow-arcane-500/25 hover:shadow-arcane-500/40 hover:-translate-y-0.5 active:translate-y-0 border border-arcane-400/20",
        destructive: "bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 border border-red-400/20",
        outline: "border border-dark-500 bg-dark-800/80 text-slate-200 hover:bg-dark-700 hover:border-arcane-500/50 hover:text-white backdrop-blur-sm hover:shadow-lg hover:shadow-arcane-500/10",
        secondary: "bg-gradient-to-br from-dark-600 to-dark-700 text-slate-200 hover:from-dark-500 hover:to-dark-600 border border-dark-500/50",
        ghost: "text-slate-300 hover:bg-dark-700/50 hover:text-white hover:backdrop-blur-sm",
        link: "text-arcane-400 underline-offset-4 hover:underline hover:text-arcane-300",
        magic: "bg-gradient-to-br from-arcane-500 via-mystic-500 to-arcane-500 text-white shadow-lg shadow-arcane-500/30 hover:shadow-arcane-400/50 hover:-translate-y-0.5 border border-arcane-400/30 animate-pulse-glow",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
