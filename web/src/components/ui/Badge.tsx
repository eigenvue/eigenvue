/**
 * Badge — small label for categories, difficulty levels, and tags.
 *
 * Uses monospace font for the "technical" feel.
 * Category badges use the category's accent color with a muted background.
 */

type BadgeCategory = "classical" | "deeplearning" | "genai" | "quantum" | "default";

interface BadgeProps {
  children: React.ReactNode;
  category?: BadgeCategory;
  className?: string;
}

const categoryStyles: Record<BadgeCategory, string> = {
  classical: "text-classical bg-classical-muted border-classical/20",
  deeplearning: "text-deeplearning bg-deeplearning-muted border-deeplearning/20",
  genai: "text-genai bg-genai-muted border-genai/20",
  quantum: "text-quantum bg-quantum-muted border-quantum/20",
  default: "text-text-secondary bg-background-elevated border-border",
};

export function Badge({ children, category = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium ${categoryStyles[category]} ${className}`}
    >
      {children}
    </span>
  );
}
