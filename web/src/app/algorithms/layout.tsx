/**
 * Catalog layout — shared by /algorithms and /algorithms/[category].
 *
 * Provides:
 * - Consistent padding and max-width via Container.
 * - The <section> landmark with aria-labelledby pointing to the heading.
 *
 * See Phase7_Implementation.md §17 — Page: /algorithms layout.
 */

import { Container } from '@/components/ui/Container';

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="catalog-heading" className="py-12 md:py-16">
      <Container>{children}</Container>
    </section>
  );
}
