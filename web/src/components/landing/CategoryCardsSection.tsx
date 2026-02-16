/**
 * CategoryCardsSection — displays the four algorithm domain cards.
 *
 * Section heading + subtitle + 4-column grid of CategoryCard components.
 * On mobile: single column. On tablet: 2 columns. On desktop: 4 columns.
 *
 * Cards animate in with a staggered delay when they scroll into view.
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { CategoryCard } from "@/components/landing/CategoryCard";
import { CATEGORIES } from "@/lib/constants";

export function CategoryCardsSection() {
  return (
    <SectionWrapper id="categories" ariaLabelledBy="categories-heading">
      <Container>
        <div className="mx-auto max-w-prose text-center">
          <h2
            id="categories-heading"
            className="text-3xl font-bold text-text-primary md:text-4xl"
          >
            Four Domains, One Platform
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            From sorting algorithms to self-attention — explore every domain
            with the same interactive, step-by-step experience.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              /** Stagger animation delay: 100ms per card */
              animationDelay={index * 100}
            />
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}
