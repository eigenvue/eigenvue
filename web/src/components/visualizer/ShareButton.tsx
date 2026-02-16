/**
 * @fileoverview Share Button — Copy shareable URL to clipboard.
 *
 * Uses the Clipboard API with a fallback for older browsers.
 * Shows a brief "Copied!" confirmation after successful copy.
 */

"use client";

import { useState, useCallback } from "react";
import { getShareUrl } from "@/lib/url-state";

interface ShareButtonProps {
  readonly algorithmId: string;
  readonly inputs: Record<string, unknown>;
  readonly stepIndex: number;
}

export function ShareButton({ algorithmId, inputs, stepIndex }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = getShareUrl(algorithmId, inputs, stepIndex);

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers or permission denied.
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [algorithmId, inputs, stepIndex]);

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Link copied!" : "Copy shareable link"}
      className="px-3 py-1.5 text-xs font-mono rounded-md bg-background-elevated text-text-secondary hover:text-text-primary border border-border hover:border-border-hover transition-colors"
    >
      {copied ? "✓ Copied!" : "Share"}
    </button>
  );
}
