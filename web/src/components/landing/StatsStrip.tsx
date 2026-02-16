/**
 * StatsStrip — horizontal row of key project metrics.
 *
 * Displayed as a 4-column grid on desktop, 2×2 on tablet, stacked on mobile.
 * Each stat has a large monospace number and a small label.
 * Separated from adjacent sections by subtle top/bottom borders.
 */

import { Container } from "@/components/ui/Container";
import { SectionWrapper } from "@/components/ui/SectionWrapper";

interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: "22+", label: "Interactive Visualizations" },
  { value: "4", label: "Algorithm Domains" },
  { value: "MIT", label: "Open Source Forever" },
  { value: "pip", label: "Python Package" },
];

export function StatsStrip() {
  return (
    <SectionWrapper className="!py-12 border-y border-border">
      <Container>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono text-4xl font-bold text-text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-text-tertiary">{stat.label}</div>
            </div>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}
