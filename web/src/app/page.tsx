/**
 * Landing Page — composes all sections in order.
 *
 * This file contains no logic — it's purely compositional.
 * Each section is a self-contained component imported from /components/landing/.
 *
 * Section order:
 * 1. Hero (full viewport)
 * 2. Stats Strip (key metrics)
 * 3. Category Cards (four domains)
 * 4. Features (platform capabilities)
 * 5. Editor Teaser (custom algorithm editor)
 * 6. Code Teaser (Python package)
 * 7. CTA (final call to action)
 *
 * The Navbar and Footer are rendered by the root layout (layout.tsx),
 * not by this page. The Starfield is also in the root layout.
 */

import { HeroSection } from "@/components/landing/HeroSection";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { CategoryCardsSection } from "@/components/landing/CategoryCardsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { EditorTeaser } from "@/components/landing/EditorTeaser";
import { CodeTeaser } from "@/components/landing/CodeTeaser";
import { CTASection } from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <StatsStrip />
      <CategoryCardsSection />
      <FeaturesSection />
      <EditorTeaser />
      <CodeTeaser />
      <CTASection />
    </>
  );
}
