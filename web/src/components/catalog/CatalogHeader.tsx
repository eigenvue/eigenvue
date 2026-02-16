/**
 * CatalogHeader — Page title and description for the catalog page.
 *
 * When viewing "All" algorithms:
 *   Title: "Algorithm Library"
 *   Description: "Explore interactive visualizations across four domains..."
 *
 * When viewing a specific category:
 *   Title: "Classical Algorithms" (with category-colored accent)
 *   Description: Category-specific description from CATEGORIES constant.
 *
 * See Phase7_Implementation.md §16 — Component: CatalogHeader.
 */

import { type CategoryDisplayInfo } from "@/lib/catalog-constants";

interface CatalogHeaderProps {
  /** null means "all categories" view. */
  readonly category: CategoryDisplayInfo | null;
  readonly algorithmCount: number;
}

export function CatalogHeader({ category }: CatalogHeaderProps) {
  const title = category ? category.label : "Algorithm Library";
  const description = category
    ? category.description
    : "Explore interactive, step-by-step visualizations across classical algorithms, deep learning, generative AI, and quantum computing.";

  return (
    <div className="mb-8">
      <h1
        className={`text-3xl md:text-4xl font-bold mb-3 ${
          category ? `text-${category.colorToken}` : "text-text-primary"
        }`}
        id="catalog-heading"
      >
        {title}
      </h1>
      <p className="text-text-secondary text-lg max-w-2xl">{description}</p>
    </div>
  );
}
