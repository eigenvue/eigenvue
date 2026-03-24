/**
 * HowItWorksSection — 3-step horizontal strip showing the user workflow.
 *
 * Visually connects the hero to the feature sections below.
 * Each step has a numbered badge, title, and short description.
 * A connecting line ties the steps together.
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";

const STEPS = [
  {
    number: "1",
    title: "Pick an Algorithm",
    description:
      "Choose from 22+ algorithms across classical CS, deep learning, generative AI, and quantum computing.",
  },
  {
    number: "2",
    title: "Watch It Unfold",
    description:
      "Step through every computation at your own pace. See the code, the data structures, and the explanation — all in sync.",
  },
  {
    number: "3",
    title: "Build Real Intuition",
    description:
      "Modify inputs, compare algorithms, and experiment until you truly understand how it works — not just what it does.",
  },
];

export function HowItWorksSection() {
  return (
    <SectionWrapper className="!py-16 md:!py-20 border-y border-border">
      <Container>
        <h2 className="text-center text-2xl font-bold text-text-primary md:text-3xl">
          How It Works
        </h2>

        <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step) => (
            <div key={step.number} className="relative text-center sm:text-left">
              {/* Step number */}
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-btn-primary text-white font-mono text-sm font-bold sm:mx-0">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}
