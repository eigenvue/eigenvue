/**
 * FeaturesSection — showcases the platform's key capabilities.
 *
 * Layout: section heading + 3×2 grid of feature cards.
 * Each card has an icon, title, and short description.
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { FEATURES } from "@/lib/constants";

export function FeaturesSection() {
  return (
    <SectionWrapper id="features" ariaLabelledBy="features-heading">
      <Container>
        <div className="mx-auto max-w-prose text-center">
          <h2
            id="features-heading"
            className="text-3xl font-bold text-text-primary md:text-4xl"
          >
            Built for <span className="gradient-text">Real Understanding</span>
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Every feature is designed to help you build genuine intuition,
            not just watch animations.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-background-surface p-6 transition-all duration-normal hover:border-border-hover hover:bg-background-elevated"
            >
              {/*
                Icon placeholder — use a simple styled div with the icon name.
                In production, replace with an actual icon component (e.g., Lucide).
                We avoid adding an icon library dependency in Phase 2.
                Use inline SVGs or a lightweight icon set.
              */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-deeplearning-muted text-deeplearning transition-colors duration-normal group-hover:bg-deeplearning/20">
                {/* Placeholder — replace with SVG icon */}
                <span className="text-lg" aria-hidden="true">
                  {getFeatureEmoji(feature.icon)}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-text-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}

/**
 * Temporary emoji mapping for feature icons.
 * Replace with proper SVG icons (Lucide or custom) before launch.
 * This is a Phase 2 placeholder to avoid adding icon library complexity.
 */
function getFeatureEmoji(icon: string): string {
  const map: Record<string, string> = {
    "play-circle": "▶",
    code: "⟨⟩",
    "message-circle": "💬",
    sliders: "⚙",
    link: "🔗",
    terminal: ">_",
  };
  return map[icon] ?? "•";
}
