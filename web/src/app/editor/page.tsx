/**
 * @fileoverview Editor Page — Custom Algorithm Editor
 *
 * Main route for the custom algorithm editor (/editor).
 * Client-side page (no SSG — the editor is inherently interactive).
 *
 * URL: /editor
 * URL with state: /editor?code=BASE64&layout=LAYOUT_ID&v=1
 * URL with template: /editor?template=TEMPLATE_ID
 *
 * Wrapped in Suspense because useSearchParams() (used for URL state)
 * requires a Suspense boundary in Next.js App Router.
 *
 * @module EditorPage
 */

"use client";

import { Suspense } from "react";
import { EditorShell } from "@/components/editor/EditorShell";

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorPageSkeleton />}>
      <EditorShell />
    </Suspense>
  );
}

/**
 * Loading skeleton shown while Monaco Editor loads.
 * Matches the EditorShell layout to prevent layout shift.
 */
function EditorPageSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Toolbar skeleton */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/50 animate-pulse" />
      {/* Main content skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor skeleton */}
        <div className="w-1/2 bg-[#0a0a1a] animate-pulse" />
        {/* Preview skeleton */}
        <div className="w-1/2 bg-slate-900/30 animate-pulse" />
      </div>
      {/* Playback controls skeleton */}
      <div className="h-14 border-t border-slate-800 bg-slate-900/50 animate-pulse" />
    </div>
  );
}
