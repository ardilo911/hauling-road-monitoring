import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<Variant, string> = {
    primary: "bg-graphite-900 text-white hover:bg-graphite-800",
    secondary: "bg-white text-graphite-900 border border-gray-300 hover:bg-asphalt-100",
    ghost: "text-graphite-900 hover:bg-asphalt-100",
    danger: "bg-signal-red text-white hover:opacity-90",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
