/**
 * GradientText — inline gradient-colored text wrapper.
 *
 * Applies the primary gradient (purple → cyan) as text color.
 * Used for emphasis within headings and body text.
 */

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientText({ children, className = "" }: GradientTextProps) {
  return <span className={`gradient-text ${className}`}>{children}</span>;
}
