import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "glass" | "gradient";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-surface/70 border border-white/5 shadow-card",
  glass: "glass shadow-card",
  gradient:
    "border border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-card"
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = "default", interactive, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl p-6 transition-all duration-300 ease-out",
        variantStyles[variant],
        interactive &&
          "hover:-translate-y-0.5 hover:border-neon-purple/30 hover:shadow-glow-sm",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg font-semibold text-white", className)}
      {...rest}
    />
  );
}

export function CardDescription({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-slate-400", className)} {...rest} />;
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm text-slate-300", className)} {...rest} />;
}
