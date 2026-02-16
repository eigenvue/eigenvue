/**
 * InstallBadge — a copy-to-clipboard badge showing a package install command.
 *
 * Displays an elegant, interactive badge with the install command.
 * Clicking copies the command to the clipboard and shows brief feedback.
 *
 * PipInstallBadge is re-exported as a convenience alias with pip defaults.
 */

"use client";

import { useState, useCallback } from "react";

interface InstallBadgeProps {
  /** The package manager command prefix (e.g., "pip install", "npm install"). */
  readonly command: string;
  /** The package name (e.g., "eigenvue"). */
  readonly packageName: string;
  /** The shell prompt character. Defaults to "$". */
  readonly prompt?: string;
}

export function InstallBadge({ command, packageName, prompt = "$" }: InstallBadgeProps) {
  const [copied, setCopied] = useState(false);
  const fullCommand = `${command} ${packageName}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: silently fail on older browsers without clipboard API
    }
  }, [fullCommand]);

  return (
    <button
      onClick={handleCopy}
      className="group inline-flex items-center gap-3 rounded-lg border border-border bg-background-surface/60 px-4 py-2.5 font-mono text-sm transition-all duration-normal hover:border-border-hover hover:bg-background-elevated/80 active:scale-[0.98]"
      aria-label={`Copy ${fullCommand} to clipboard`}
    >
      <span className="text-text-tertiary select-none">{prompt}</span>
      <span className="text-text-primary">{command}</span>
      <span className="gradient-text font-semibold">{packageName}</span>
      {/* Copy icon / check icon */}
      <span className="ml-1 text-text-tertiary transition-colors duration-fast group-hover:text-text-secondary">
        {copied ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-quantum"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </span>
      <span className="sr-only">{copied ? "Copied!" : "Click to copy"}</span>
    </button>
  );
}

/** Convenience alias: pip install eigenvue badge. */
export function PipInstallBadge() {
  return <InstallBadge command="pip install" packageName="eigenvue" />;
}
