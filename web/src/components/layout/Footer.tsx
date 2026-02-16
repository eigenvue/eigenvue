/**
 * Footer — page footer with navigation links, legal info, and open source notice.
 *
 * Layout: 4-column grid on desktop (Brand, Product, Resources, Legal),
 * 2-column on tablet, stacked on mobile.
 * Bottom bar with copyright and MIT license notice.
 */

import Link from "next/link";
import { Container } from "@/components/ui/Container";

const FOOTER_LINKS = {
  Product: [
    { label: "Algorithms", href: "/algorithms" },
    { label: "Python Package", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Contributing Guide", href: "/contribute" },
    { label: "API Reference", href: "/docs/api-reference/python-api" },
  ],
  Community: [
    { label: "GitHub", href: "https://github.com/ashutoshm1771/eigenvue" },
    { label: "Discussions", href: "https://github.com/ashutoshm1771/eigenvue/discussions" },
    { label: "Issues", href: "https://github.com/ashutoshm1771/eigenvue/issues" },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-background-surface" role="contentinfo">
      <Container>
        <div className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div>
            <div className="text-lg font-bold text-text-primary">
              Eigen<span className="gradient-text">vue</span>
            </div>
            <p className="mt-2 text-sm text-text-tertiary">
              The visual learning platform for algorithms, AI, and quantum computing.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-text-primary">{category}</h3>
              <ul className="mt-3 space-y-2" role="list">
                {links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        className="text-sm text-text-tertiary transition-colors duration-fast hover:text-text-secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-text-tertiary transition-colors duration-fast hover:text-text-secondary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border py-6">
          <p className="text-center text-xs text-text-disabled">
            © {new Date().getFullYear()} Eigenvue Contributors. Released under the MIT License.
          </p>
        </div>
      </Container>
    </footer>
  );
}
