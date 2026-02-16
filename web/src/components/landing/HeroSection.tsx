/**
 * HeroSection — the above-the-fold hero with headline, subtitle, CTAs,
 * and the animated convergence visualization.
 *
 * Layout:
 * - Mobile: stacked (text top, viz below)
 * - Desktop: side-by-side (text left 45%, viz right 55%)
 *
 * The hero occupies at least the full viewport height, with content
 * vertically centered, and enough top padding to clear the fixed navbar.
 */

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { HeroVisualization } from "@/components/landing/HeroVisualization";
import { InstallBadge } from "@/components/landing/PipInstallBadge";

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-screen items-center pt-16"
      aria-labelledby="hero-heading"
    >
      {/*
        Gradient overlay at top — a subtle purple-to-transparent radial glow
        that bleeds from behind the hero visualization. Purely decorative.
      */}
      <div
        className="pointer-events-none absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <Container className="relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          {/* ─── Text Column ─── */}
          <div className="max-w-xl">
            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl"
            >
              See How
              <br />
              <span className="gradient-text">AI Thinks</span>
              <br />
              &amp; Quantum Computes
            </h1>

            <p className="mt-6 text-lg text-text-secondary md:text-xl">
              Interactive dissection of deep learning, generative AI, and quantum algorithms
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Button variant="primary" size="lg" href="/algorithms">
                Explore Algorithms
                <span aria-hidden="true" className="ml-1">→</span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="https://github.com/ashutoshm1771/eigenvue"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
                <span aria-hidden="true" className="ml-1">↗</span>
              </Button>
            </div>

            {/* Install badges */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <InstallBadge command="pip install" packageName="eigenvue" />
              <InstallBadge command="npm install" packageName="eigenvue" />
            </div>

            {/* PyPI, npm & Docs links */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                href="https://pypi.org/project/eigenvue/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="shrink-0">
                  <path d="M7.932.5c-.4.007-.809.039-1.16.09C5.6.787 5.42 1.07 5.42 1.74v2.03h2.57v.68H4.66c-.78 0-1.46.47-1.67 1.36-.25 1.03-.26 1.67 0 2.74.19.8.64 1.36 1.42 1.36h.92V8.23c0-.88.76-1.66 1.67-1.66h2.56c.75 0 1.34-.62 1.34-1.36V2.35c0-.73-.62-1.27-1.34-1.4-.46-.08-.93-.12-1.34-.13l-.24-.01zM5.26 1.67c.28 0 .5.23.5.51a.51.51 0 01-.5.51.51.51 0 01-.5-.51c0-.28.23-.51.5-.51z"/>
                  <path d="M11.77 4.45v1.63c0 .92-.78 1.72-1.67 1.72H7.54c-.74 0-1.34.63-1.34 1.37v2.56c0 .73.64 1.16 1.34 1.37.84.25 1.65.29 2.56 0 .61-.2 1.34-.6 1.34-1.37V10.1H8.87v-.68h3.9c.78 0 1.07-.54 1.34-1.36.28-.84.27-1.66 0-2.74-.19-.78-.56-1.36-1.34-1.36h-1zm-1.34 6.63c.28 0 .5.23.5.51a.51.51 0 01-.5.51.51.51 0 01-.5-.51c0-.28.23-.51.5-.51z"/>
                </svg>
                PyPI
                <span aria-hidden="true" className="ml-0.5">↗</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                href="https://www.npmjs.com/package/eigenvue"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="shrink-0">
                  <path d="M0 0v16h16V0H0zm13.2 13.2H9.67V5.6H6.33v7.6H2.8V2.8h10.4v10.4z"/>
                </svg>
                npm
                <span aria-hidden="true" className="ml-0.5">↗</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                href="/docs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                Documentation
                <span aria-hidden="true" className="ml-0.5">→</span>
              </Button>
            </div>

            {/* Trust signal: subtle line about the project */}
            <p className="mt-5 text-sm text-text-tertiary">
              Free &amp; open source · No account required · MIT Licensed
            </p>
          </div>

          {/* ─── Visualization Column ─── */}
          <div className="relative flex items-center justify-center">
            <HeroVisualization />
          </div>
        </div>
      </Container>
    </section>
  );
}
