/**
 * @fileoverview Analytics Event Dispatch
 *
 * Provides a type-safe interface for dispatching custom analytics events.
 * Events are only sent in production; in development they are logged
 * to the console for debugging.
 *
 * PRIVACY COMMITMENT:
 * - No cookies. No local storage. No fingerprinting.
 * - No personal data is ever collected or transmitted.
 * - Events track WHAT happened (e.g., "algorithm viewed"), not WHO did it.
 * - Fully GDPR, CCPA, and PECR compliant without a consent banner.
 *
 * SUPPORTED EVENTS:
 * - algorithm_view:  user opened an algorithm visualization
 * - step_complete:   user stepped through all steps of an algorithm
 * - share_click:     user clicked the share button
 * - input_change:    user modified algorithm input parameters
 * - catalog_search:  user searched in the algorithm catalog
 *
 * These events help understand which algorithms are most popular and
 * how users interact with the visualizer, without tracking individuals.
 */

// ─── Event Types ──────────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | { name: "algorithm_view"; props: { algorithm_id: string; category: string } }
  | { name: "step_complete"; props: { algorithm_id: string; step_count: number } }
  | { name: "share_click"; props: { algorithm_id: string } }
  | { name: "input_change"; props: { algorithm_id: string } }
  | { name: "catalog_search"; props: { query: string } };

// ─── Event Dispatch ───────────────────────────────────────────────────────────

/**
 * Dispatches an analytics event.
 *
 * In production: sends the event to the analytics provider.
 * In development: logs the event to the console.
 *
 * @param event - The typed analytics event to dispatch.
 *
 * PLAUSIBLE INTEGRATION:
 * Plausible exposes a `plausible()` function on the window object
 * after its script loads. We call it with the event name and props.
 * If the function doesn't exist (script blocked, not loaded), we
 * silently no-op.
 *
 * UMAMI INTEGRATION:
 * Umami exposes `umami.track()`. The same pattern applies.
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV !== "production") {
    console.log("[Analytics]", event.name, event.props);
    return;
  }

  // Plausible integration.
  const plausible = (window as unknown as Record<string, unknown>).plausible;
  if (typeof plausible === "function") {
    (plausible as (name: string, opts: { props: Record<string, unknown> }) => void)(
      event.name,
      { props: event.props },
    );
    return;
  }

  // Umami integration (fallback).
  const umami = (window as unknown as Record<string, { track?: (name: string, props: Record<string, unknown>) => void }>).umami;
  if (umami && typeof umami.track === "function") {
    umami.track(event.name, event.props);
    return;
  }
}

/**
 * Convenience: tracks an algorithm page view.
 * Called from the VisualizerShell component on mount.
 *
 * @param algorithmId - The algorithm's URL-safe identifier.
 * @param category - The algorithm's category slug.
 */
export function trackAlgorithmView(algorithmId: string, category: string): void {
  trackEvent({
    name: "algorithm_view",
    props: { algorithm_id: algorithmId, category },
  });
}
