/**
 * Navbar — fixed navigation bar with scroll-aware background transition.
 *
 * Behavior:
 * - Transparent when at the top of the page (scrollY < 50px)
 * - Frosted-glass background when scrolled (scrollY >= 50px)
 * - Desktop: horizontal nav links + CTA button
 * - Mobile (<768px): hamburger icon → slide-in drawer (MobileMenu)
 *
 * Accessibility:
 * - <nav> with aria-label="Main navigation"
 * - All links have descriptive text (no icon-only links without labels)
 * - Mobile menu button has aria-expanded and aria-controls
 * - Keyboard: Tab navigates through links, Escape closes mobile menu
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** Navigation items — single source of truth for both desktop and mobile. */
const NAV_ITEMS = [
  { label: "Algorithms", href: "/algorithms" },
  { label: "Docs", href: "/docs" },
  { label: "About", href: "/about" },
  { label: "Contribute", href: "/contribute" },
] as const;

/** Scroll threshold in pixels for switching to glass background. */
const SCROLL_THRESHOLD = 50;

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY >= SCROLL_THRESHOLD);
    };

    /**
     * Passive listener: we only read scrollY, never call preventDefault.
     * This allows the browser to optimize scroll performance.
     */
    window.addEventListener("scroll", handleScroll, { passive: true });

    /** Check initial scroll position (e.g., if page was refreshed mid-scroll). */
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-normal ${
          isScrolled
            ? "glass border-b border-border"
            : "bg-transparent"
        }`}
      >
        <nav
          className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6 lg:px-8"
          aria-label="Main navigation"
        >
          {/* ─── Logo ─── */}
          <Link
            href="/"
            className="flex items-center gap-1 text-xl font-bold text-text-primary transition-opacity duration-fast hover:opacity-80"
            aria-label="Eigenvue home"
          >
            {/*
              Logo: "Eigenvue" with a gradient accent dot.
              The dot uses the primary gradient colors and serves as a
              subtle brand mark. It's purely decorative (aria-hidden).
            */}
            <span className="text-text-primary">Eigen</span>
            <span className="gradient-text">vue</span>
            <span
              className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-gradient-from to-gradient-to"
              aria-hidden="true"
            />
          </Link>

          {/* ─── Desktop Navigation Links ─── */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-fast hover:bg-background-hover hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* ─── Desktop CTA + Theme Toggle + Mobile Hamburger ─── */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="primary"
              size="sm"
              href="/algorithms"
              className="hidden sm:inline-flex"
            >
              Get Started
            </Button>

            {/* Mobile hamburger button */}
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors duration-fast hover:bg-background-hover hover:text-text-primary md:hidden"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {/*
                Hamburger / X icon using SVG lines.
                Transitions between states with CSS transforms.
              */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line
                  x1="3" y1="6" x2="21" y2="6"
                  className={`origin-center transition-transform duration-normal ${
                    isMobileMenuOpen ? "translate-y-[6px] rotate-45" : ""
                  }`}
                />
                <line
                  x1="3" y1="12" x2="21" y2="12"
                  className={`transition-opacity duration-fast ${
                    isMobileMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <line
                  x1="3" y1="18" x2="21" y2="18"
                  className={`origin-center transition-transform duration-normal ${
                    isMobileMenuOpen ? "-translate-y-[6px] -rotate-45" : ""
                  }`}
                />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu drawer */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        items={NAV_ITEMS}
      />
    </>
  );
}
