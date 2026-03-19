/**
 * @fileoverview Editor Page Layout & SEO Metadata
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Algorithm Editor — Eigenvue",
  description:
    "Write your own algorithm visualization in JavaScript. " +
    "Use Eigenvue's rendering engine with 13 built-in layouts to " +
    "visualize sorting, graphs, neural networks, attention, and more.",
  openGraph: {
    title: "Custom Algorithm Editor — Eigenvue",
    description:
      "Create interactive algorithm visualizations with code. " +
      "Powered by the same engine behind Eigenvue's 22 built-in algorithms.",
    url: "https://eigenvue.dev/editor",
    type: "website",
  },
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
