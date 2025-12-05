import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-dark-500/50 bg-dark-800/80 px-4 py-2 text-sm text-slate-100 caret-arcane-400 ring-offset-dark-800 backdrop-blur-sm",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-slate-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcane-500/50 focus-visible:ring-offset-1 focus-visible:border-arcane-500/50",
          "hover:border-dark-400/50 hover:bg-dark-800",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
