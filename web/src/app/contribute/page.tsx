/**
 * Contribute page — comprehensive guide for contributing to Eigenvue.
 *
 * Sections:
 * 1. Hero — headline, subtitle, and quick-start CTA
 * 2. Ways to Contribute — card grid of contribution types
 * 3. Quick Start — getting the dev environment running
 * 4. Contribution Workflow — step-by-step PR process with visual demo
 * 5. Project Architecture — monorepo structure overview
 * 6. Adding an Algorithm — the most common contribution type
 * 7. Code Standards — linting, formatting, testing, commit conventions
 * 8. Community & Resources — links to docs, issues, discussions
 */

import type { Metadata } from "next";
import { ContributePageClient } from "./ContributePageClient";

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "Learn how to contribute to Eigenvue — an open-source interactive algorithm visualization platform. Set up your dev environment, understand the architecture, and submit your first pull request.",
};

export default function ContributePage() {
  return <ContributePageClient />;
}
