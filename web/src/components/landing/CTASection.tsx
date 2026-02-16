/**
 * CTASection — final call-to-action before the footer.
 *
 * Large centered heading, subtitle, and two CTA buttons.
 * Background has a subtle gradient glow for visual weight.
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <SectionWrapper className="relative" ariaLabelledBy="cta-heading">
      {/* Background glow — decorative */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="h-[400px] w-[600px] rounded-full opacity-30 blur-[100px]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(139,92,246,0.3) 0%, rgba(6,182,212,0.15) 50%, transparent 80%)",
          }}
        />
      </div>

      <Container className="relative z-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="cta-heading"
            className="text-3xl font-bold text-text-primary md:text-4xl"
          >
            Start <span className="gradient-text">Exploring</span> Now
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            No account needed. No installation required. Pick an algorithm and start learning.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button variant="primary" size="lg" href="/algorithms">
              Browse Algorithms
              <span aria-hidden="true" className="ml-1">→</span>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href="https://github.com/ashutoshm1771/eigenvue"
              target="_blank"
              rel="noopener noreferrer"
            >
              Star on GitHub
              <span aria-hidden="true" className="ml-1">⭐</span>
            </Button>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
