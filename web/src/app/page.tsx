/**
 * Landing Page — composes all sections in order.
 *
 * Section order:
 * 1. Hero (asymmetric layout with product preview)
 * 2. How It Works (3-step workflow strip)
 * 3. Features (alternating left/right showcase with visual mockups)
 * 4. Category Cards (four algorithm domains)
 * 5. Integration (editor + Python/npm packages)
 * 6. CTA (final call to action)
 */

import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CategoryCardsSection } from "@/components/landing/CategoryCardsSection";
import { IntegrationSection } from "@/components/landing/IntegrationSection";
import { CTASection } from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CategoryCardsSection />
      <IntegrationSection />
      <CTASection />
    </>
  );
}
