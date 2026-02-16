/**
 * @fileoverview Lazy-Loaded Visualization Panel Wrapper
 *
 * Wraps the VisualizationPanel (from Phase 4) in React.lazy() + Suspense
 * to defer loading the canvas rendering engine until the user navigates
 * to an algorithm page. This keeps the initial bundle size of non-
 * visualizer pages (landing, catalog, about) small.
 *
 * LOADING STRATEGY:
 * - The VisualizationPanel and its dependency tree (primitives, layouts,
 *   animation manager, canvas manager) are loaded on demand.
 * - A skeleton placeholder is shown during the load.
 * - Once loaded, the component hydrates and the canvas renders immediately.
 *
 * BUNDLE IMPACT:
 * The rendering engine is ~30-50KB gzipped. By lazy-loading it, the
 * catalog page and landing page avoid this cost entirely.
 */

"use client";

import { lazy, Suspense, type ComponentProps } from "react";

/**
 * Dynamic import of the VisualizationPanel from the engine module.
 * Next.js will create a separate chunk for this component and its imports.
 *
 * React.lazy requires a default export, so we re-export the named export
 * from @/engine/VisualizationPanel as the default in the dynamic import.
 */
const VisualizationPanel = lazy(
  () =>
    import("@/engine/VisualizationPanel").then((mod) => ({
      default: mod.VisualizationPanel,
    })),
);

/**
 * Skeleton placeholder shown while the canvas engine loads.
 * Matches the dimensions and colors of the actual visualization area
 * to prevent layout shift (CLS = 0).
 */
function VisualizationSkeleton() {
  return (
    <div
      className="w-full h-full bg-background-surface rounded-lg
                 flex items-center justify-center"
      role="status"
      aria-label="Loading visualization..."
    >
      <div className="flex flex-col items-center gap-3">
        {/* Pulsing dot animation */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-text-tertiary animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-text-tertiary animate-pulse" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-text-tertiary animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-xs text-text-tertiary">Loading visualization</span>
      </div>
    </div>
  );
}

/**
 * Props are passed through to the underlying VisualizationPanel.
 * This wrapper adds ONLY the lazy-loading behavior.
 */
export function LazyVisualizationPanel(
  props: ComponentProps<typeof VisualizationPanel>,
) {
  return (
    <Suspense fallback={<VisualizationSkeleton />}>
      <VisualizationPanel {...props} />
    </Suspense>
  );
}
