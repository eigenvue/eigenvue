/**
 * @fileoverview Service Worker Registration Utility
 *
 * Registers the service worker on client-side hydration. Called once
 * from the root layout's client-side initialization.
 *
 * REGISTRATION TIMING:
 * We register on the `load` event to avoid competing with the initial
 * page load for network and CPU resources. The SW installs in the
 * background after the page is fully interactive.
 *
 * ERROR HANDLING:
 * Registration failures are logged but never shown to the user.
 * A failed SW registration simply means offline access won't work —
 * the online experience is completely unaffected.
 *
 * ENVIRONMENT GUARD:
 * Only registers in production. In development, the SW would interfere
 * with hot module replacement and cause stale content issues.
 */

export function registerServiceWorker(): void {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    process.env.NODE_ENV !== "production"
  ) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (registration) => {
        console.log("[SW] Registered with scope:", registration.scope);
      },
      (error) => {
        console.warn("[SW] Registration failed:", error);
      },
    );
  });
}
