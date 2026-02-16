/**
 * Root layout for the Eigenvue web application (Phase 10 Enhanced).
 *
 * Responsibilities:
 * - Load and apply fonts via next/font (Inter + JetBrains Mono)
 * - Render the skip-to-content link for accessibility
 * - Render the starfield background canvas (fixed, behind all content)
 * - Render the navigation bar (fixed, top)
 * - Render page content (children)
 * - Render the footer
 * - Set global metadata defaults
 *
 * Phase 10 Additions:
 * 1. Injects WebSite JSON-LD (once, globally) for sitelinks search box.
 * 2. Registers the service worker on client hydration (via AnalyticsProvider).
 * 3. Wraps children with the AnalyticsProvider for privacy-respecting analytics.
 * 4. Adds metadataBase, viewport, manifest, and enhanced global metadata.
 *
 * IMPORTANT: The root layout is a Server Component. Client-side features
 * (SW registration, analytics) use client components rendered inside the layout.
 */

import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../styles/globals.css";
import { Starfield } from "@/components/landing/Starfield";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWebsiteJsonLd } from "@/lib/json-ld";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

/**
 * Inline script to prevent FOUC (Flash of Unstyled Content) on theme load.
 * Runs synchronously before React hydration to apply the correct theme class.
 * Reads localStorage first, falls back to system preference.
 */
const THEME_INIT_SCRIPT = `
(function(){
  try {
    if (localStorage.getItem('theme') === 'light') {
      document.documentElement.classList.add('light');
    }
  } catch(e) {}
})();
`;

/**
 * Inter: primary UI font. Variable weight for maximum flexibility.
 * Subset to latin to minimize font file size.
 * Assigned to CSS variable --font-sans for Tailwind integration.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * JetBrains Mono: monospace font for code display, badges, and technical data.
 * Assigned to CSS variable --font-mono for Tailwind integration.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// ─── Viewport Configuration ───────────────────────────────────────────────────

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06080f",
};

// ─── Global Metadata ──────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Interactive Algorithm Visualizations`,
    /**
     * Template used by all child pages. When a page sets title: "About",
     * the rendered title becomes "About | Eigenvue".
     * Pages that set their own full title (via buildAlgorithmMetadata)
     * override this template entirely.
     */
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Interactive, step-by-step algorithm visualizations for classical algorithms, deep learning, generative AI, and quantum computing.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  /**
   * manifest.json for progressive web app baseline:
   * - Name, icons, theme color
   * - NOT a full PWA — just enough for the service worker and
   *   "add to home screen" on mobile.
   */
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  keywords: [
    "algorithm visualization",
    "deep learning visualization",
    "transformer visualization",
    "self-attention visualization",
    "quantum computing visualization",
    "interactive algorithm",
    "learn algorithms",
    "eigenvue",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Interactive Algorithm Visualizations`,
    description:
      "Interactive step-by-step visualizations for algorithms, deep learning, generative AI, and quantum computing.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Interactive Algorithm Visualizations`,
    description:
      "Interactive step-by-step visualizations for algorithms, deep learning, generative AI, and quantum computing.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ─── Root Layout Component ────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      /**
       * suppressHydrationWarning is set because class attributes may
       * differ between server and client due to next/font injection.
       */
      suppressHydrationWarning
    >
      <body className="font-sans">
        {/* Theme initialization — runs before React hydration to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />

        {/* Global WebSite JSON-LD for sitelinks search box */}
        <JsonLd data={buildWebsiteJsonLd()} />

        <ThemeProvider>
          {/* Accessibility: skip-to-content link, first focusable element */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>

          {/* Starfield canvas — fixed behind all content */}
          <Starfield />

          {/* Navigation — fixed at top (includes ThemeToggle) */}
          <Navbar />

          {/* AnalyticsProvider: loads analytics script + registers service worker */}
          <AnalyticsProvider>
            {/* Main content area */}
            <main id="main-content">
              {children}
            </main>
          </AnalyticsProvider>

          {/* Footer */}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
