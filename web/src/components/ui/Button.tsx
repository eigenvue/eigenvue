/**
 * Button — the primary interactive element.
 *
 * Variants:
 * - primary: gradient background (purple → cyan), white text. For main CTAs.
 * - secondary: transparent with border, text-secondary. For secondary actions.
 * - ghost: no border, subtle hover background. For nav links and tertiary actions.
 *
 * Sizes:
 * - sm: 32px height, text-xs, px-3
 * - md: 40px height, text-sm, px-4 (default)
 * - lg: 48px height, text-base, px-6
 *
 * All buttons:
 * - Have a :focus-visible ring (handled by global CSS)
 * - Use aria-label if the text content is not descriptive
 * - Disable pointer events when disabled
 */

import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as a link (anchor tag) instead of a button */
  href?: string;
  /** Target attribute for links (e.g., "_blank" to open in new window) */
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  /** Rel attribute for links (e.g., "noopener noreferrer" for security) */
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
}

/**
 * Style mappings for each variant.
 * Kept as a plain object for readability and easy auditing.
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-gradient-to-r from-gradient-from via-gradient-via to-gradient-to",
    "text-white font-semibold",
    "shadow-md hover:shadow-lg",
    "hover:brightness-110",
    "active:brightness-95 active:shadow-inset",
    "transition-all duration-normal",
  ].join(" "),
  secondary: [
    "bg-transparent",
    "border border-border hover:border-border-hover",
    "text-text-secondary hover:text-text-primary",
    "transition-all duration-normal",
  ].join(" "),
  ghost: [
    "bg-transparent",
    "text-text-secondary hover:text-text-primary",
    "hover:bg-background-hover",
    "transition-all duration-normal",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", href, target, rel, children, disabled, ...props },
    ref
  ) {
    const classes = [
      "inline-flex items-center justify-center gap-2",
      "font-semibold",
      "select-none",
      "whitespace-nowrap",
      variantStyles[variant],
      sizeStyles[size],
      disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer",
      className,
    ].join(" ");

    if (href && !disabled) {
      return (
        <a href={href} className={classes} target={target} rel={rel}>
          {children}
        </a>
      );
    }

    return (
      <button ref={ref} className={classes} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);
