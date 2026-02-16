/**
 * @fileoverview Eigenvue Service Worker
 *
 * Provides offline access to previously visited algorithm pages.
 * Uses a cache-first strategy for static assets and a network-first
 * strategy for HTML pages.
 *
 * CACHING STRATEGY:
 * 1. STATIC ASSETS (JS, CSS, images, fonts):
 *    Cache-first. These files have content-hashed filenames, so a
 *    cached version is always valid. New versions get new URLs.
 *
 * 2. HTML PAGES:
 *    Network-first with cache fallback. The user always gets the
 *    latest version when online. When offline, the cached version
 *    is served. This ensures users see fresh content but can still
 *    access previously visited pages offline.
 *
 * 3. OG IMAGES:
 *    Not cached — they're only needed for social media crawlers,
 *    not for direct user access.
 *
 * 4. ANALYTICS SCRIPTS:
 *    Not cached — analytics should only fire when online.
 *
 * CACHE NAMING:
 * A versioned cache name ensures that a new deployment invalidates
 * the old cache. The version string should be updated with each release.
 *
 * LIFECYCLE:
 * - install: pre-cache the app shell (landing page, offline fallback).
 * - activate: clean up old caches from previous versions.
 * - fetch: intercept requests and serve from cache or network.
 *
 * IMPORTANT:
 * This file MUST be in the public/ directory (not src/) so it's
 * served from the root path (/sw.js). Service workers can only
 * control pages at or below their URL path scope.
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const CACHE_VERSION = "v1";
const STATIC_CACHE = `eigenvue-static-${CACHE_VERSION}`;
const PAGES_CACHE = `eigenvue-pages-${CACHE_VERSION}`;

/**
 * URLs to pre-cache during the install event.
 * These are available offline immediately after first visit.
 */
const PRECACHE_URLS = ["/", "/algorithms"];

/**
 * URL patterns that should NOT be cached.
 */
const NO_CACHE_PATTERNS = [
  /\/og\//, // OG image generation
  /\/api\//, // API routes
  /analytics/, // Analytics scripts
  /plausible/, // Plausible analytics
  /umami/, // Umami analytics
];

// ─── Install Event ────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }),
  );
  // Activate immediately without waiting for existing tabs to close.
  self.skipWaiting();
});

// ─── Activate Event ───────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== PAGES_CACHE)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  // Take control of all open tabs immediately.
  self.clients.claim();
});

// ─── Fetch Event ──────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests.
  if (request.method !== "GET") return;

  // Skip non-cacheable URLs.
  if (NO_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))) return;

  // Skip cross-origin requests (CDN resources are handled by browser cache).
  if (url.origin !== self.location.origin) return;

  // ── Static assets: cache-first ───────────────────────────────
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          // Only cache successful responses.
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // ── HTML pages: network-first with cache fallback ────────────
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          // Return cached page or the root as a fallback.
          return cached || caches.match("/");
        });
      }),
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determines if a URL path refers to a static asset.
 * Static assets have content-hashed filenames and can be cached indefinitely.
 */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/og-images/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  );
}
