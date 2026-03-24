/**
 * GradientText — inline accent-colored text wrapper.
 *
 * Applies the brand accent color to text.
 * Used for emphasis within headings and body text.
 */

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientText({ children, className = "" }: GradientTextProps) {
  return <span className={`accent-text ${className}`}>{children}</span>;
}
