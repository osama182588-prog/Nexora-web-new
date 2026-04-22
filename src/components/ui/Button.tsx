import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-neon-gradient text-white shadow-glow hover:shadow-glow hover:brightness-110 focus-visible:ring-2 focus-visible:ring-neon-purple/60",
  secondary:
    "bg-white/5 text-slate-100 border border-white/10 hover:bg-white/10 hover:border-white/20",
  ghost:
    "text-slate-300 hover:text-white hover:bg-white/5",
  outline:
    "border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 hover:border-neon-purple/70 hover:shadow-glow-sm"
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 rounded-xl font-medium",
        "transition-all duration-200 ease-out",
        "focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-80")}>
        {children}
      </span>
    </button>
  );
});
