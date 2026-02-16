/**
 * About page — information about the Eigenvue project.
 * TODO: Implement full about page content.
 */

import { Container } from "@/components/ui/Container";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background-page pt-24 pb-16">
      <Container>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-text-primary md:text-5xl">
            About Eigenvue
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Coming soon. This page will explain the Eigenvue project and mission.
          </p>
        </div>
      </Container>
    </div>
  );
}
