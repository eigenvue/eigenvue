/**
 * @fileoverview Analytics Script Loader
 *
 * Loads the analytics provider's script tag. Uses Next.js Script
 * component with strategy="afterInteractive" to avoid blocking
 * the initial page render.
 *
 * CONFIGURATION:
 * Set one of these environment variables to enable analytics:
 * - NEXT_PUBLIC_PLAUSIBLE_DOMAIN: your Plausible domain (e.g., "eigenvue.dev")
 * - NEXT_PUBLIC_UMAMI_WEBSITE_ID: your Umami website ID
 *
 * If neither is set, no analytics script is loaded. The site works
 * perfectly without analytics — it's an optional enhancement.
 *
 * SCRIPT LOADING:
 * strategy="afterInteractive" means the script loads after the page
 * becomes interactive. It does NOT block first paint, first contentful
 * paint, or largest contentful paint. Analytics has ZERO impact on
 * Core Web Vitals.
 */

"use client";

import Script from "next/script";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;

export function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Register service worker on mount (client-side only).
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      {/* ── Plausible Analytics ──────────────────────────────────── */}
      {PLAUSIBLE_DOMAIN && (
        <Script
          src="https://plausible.io/js/script.js"
          data-domain={PLAUSIBLE_DOMAIN}
          strategy="afterInteractive"
        />
      )}

      {/* ── Umami Analytics (alternative) ────────────────────────── */}
      {!PLAUSIBLE_DOMAIN && UMAMI_WEBSITE_ID && UMAMI_SCRIPT_URL && (
        <Script
          src={UMAMI_SCRIPT_URL}
          data-website-id={UMAMI_WEBSITE_ID}
          strategy="afterInteractive"
        />
      )}

      {children}
    </>
  );
}
