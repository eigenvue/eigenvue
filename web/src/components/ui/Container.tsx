/**
 * Container — centers content with consistent max-width and horizontal padding.
 *
 * Used by every section on the landing page and all future pages.
 * The max-width matches the `maxWidth.content` token (80rem / 1280px).
 */

interface ContainerProps {
  children: React.ReactNode;
  /** Additional class names to merge */
  className?: string;
  /** Use narrower max-width for text-heavy content */
  narrow?: boolean;
}

export function Container({ children, className = "", narrow = false }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${
        narrow ? "max-w-prose" : "max-w-content"
      } ${className}`}
    >
      {children}
    </div>
  );
}
