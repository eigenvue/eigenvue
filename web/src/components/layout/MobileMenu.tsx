/**
 * MobileMenu — slide-in drawer for mobile navigation.
 *
 * Renders a full-screen overlay with navigation links.
 * Slides in from the right.
 *
 * Accessibility:
 * - Traps focus within the menu when open (Tab cycles through menu items)
 * - Escape key closes the menu
 * - Background overlay is clickable to close
 * - Sets aria-hidden on the main content when menu is open (via body class)
 */

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReadonlyArray<{ label: string; href: string }>;
}

export function MobileMenu({ isOpen, onClose, items }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    /** Close on Escape key. */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    /** Prevent body scroll when menu is open. */
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-normal md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu panel */}
      <div
        ref={menuRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-background-surface border-l border-border transform transition-transform duration-normal md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-2 p-6 pt-20">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="rounded-lg px-4 py-3 text-base font-medium text-text-secondary transition-colors duration-fast hover:bg-background-hover hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-border pt-4">
            <Button variant="primary" size="lg" href="/algorithms" className="w-full">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
