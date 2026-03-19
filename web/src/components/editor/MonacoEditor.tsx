/**
 * @fileoverview Monaco Editor React Wrapper
 *
 * Wraps the Monaco Editor in a React component with:
 * - JavaScript language mode with Eigenvue API type declarations
 * - Error decoration support (red squiggles at error lines)
 * - Controlled value via onChange callback
 * - Dynamic theme (matches Eigenvue dark theme)
 * - Responsive height
 * - Accessible keyboard handling (Escape to release focus trap)
 *
 * DESIGN DECISIONS:
 * - Monaco is loaded lazily (dynamic import) to avoid SSR issues and
 *   reduce initial bundle size. The editor shows a loading skeleton
 *   until Monaco is ready.
 * - We define a custom "eigenvue-dark" theme that matches the app's
 *   design tokens from Phase 2.
 * - Custom autocompletion provides the `step()` and `utils.*` API
 *   without requiring TypeScript language services.
 *
 * ACCESSIBILITY:
 * - The editor container has role="textbox" and aria-label.
 * - Pressing Escape while the editor is focused releases the keyboard
 *   trap (standard Monaco behavior — we document it in the UI).
 * - Tab key inserts a tab character (standard code editor behavior).
 *   Users press Escape first to tab out of the editor.
 *
 * @module MonacoEditor
 */

"use client";

import { useEffect, useRef, memo, useState } from "react";
import type { editor as MonacoEditorNS, IDisposable } from "monaco-editor";

// ─── Props ────────────────────────────────────────────────────────────────

export interface MonacoEditorProps {
  /** The current editor content. */
  value: string;

  /** Called when the editor content changes. */
  onChange: (value: string) => void;

  /**
   * Error to display in the editor as a red squiggle.
   * If null, all error decorations are cleared.
   */
  error?: {
    line: number;
    column?: number;
    message: string;
  } | null;

  /** Whether the editor should be read-only (e.g., during execution). */
  readOnly?: boolean;

  /** CSS height of the editor container. @default "100%" */
  height?: string;

  /**
   * Called when the user presses Ctrl+Enter / Cmd+Enter.
   * This is the "Run" shortcut.
   */
  onRun?: () => void;
}

// ─── Theme Definition ─────────────────────────────────────────────────────

const EIGENVUE_THEME_NAME = "eigenvue-dark";

function defineEigenvueTheme(monaco: typeof import("monaco-editor")) {
  monaco.editor.defineTheme(EIGENVUE_THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    colors: {
      "editor.background": "#0a0a1a",
      "editor.foreground": "#e2e8f0",
      "editorLineNumber.foreground": "#475569",
      "editorLineNumber.activeForeground": "#94a3b8",
      "editorCursor.foreground": "#00ffc8",
      "editor.selectionBackground": "#1e293b",
      "editor.lineHighlightBackground": "#0f172a",
      "editorWidget.background": "#0f172a",
      "editorSuggestWidget.background": "#0f172a",
      "editorSuggestWidget.selectedBackground": "#1e293b",
      "editorSuggestWidget.highlightForeground": "#00ffc8",
      "editorError.foreground": "#ef4444",
      "editorWarning.foreground": "#f59e0b",
      "editorGutter.background": "#0a0a1a",
      "editorIndentGuide.background": "#1e293b",
      "editorIndentGuide.activeBackground": "#334155",
      "scrollbarSlider.background": "#1e293b80",
      "scrollbarSlider.hoverBackground": "#334155",
      "scrollbarSlider.activeBackground": "#47556980",
    },
    rules: [
      { token: "keyword", foreground: "c084fc" },
      { token: "keyword.control", foreground: "c084fc" },
      { token: "string", foreground: "38bdf8" },
      { token: "string.escape", foreground: "7dd3fc" },
      { token: "number", foreground: "00ffc8" },
      { token: "number.float", foreground: "00ffc8" },
      { token: "comment", foreground: "64748b", fontStyle: "italic" },
      { token: "type", foreground: "f472b6" },
      { token: "identifier", foreground: "e2e8f0" },
      { token: "delimiter", foreground: "94a3b8" },
      { token: "delimiter.bracket", foreground: "94a3b8" },
      { token: "operator", foreground: "94a3b8" },
      { token: "regexp", foreground: "fb923c" },
    ],
  });
}

// ─── Completion Items ─────────────────────────────────────────────────────

function registerCompletions(monaco: typeof import("monaco-editor")): IDisposable {
  return monaco.languages.registerCompletionItemProvider("javascript", {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: import("monaco-editor").languages.CompletionItem[] = [
        {
          label: "step",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: [
            "step({",
            '\ttitle: "${1:Step Title}",',
            '\texplanation: "${2:What is happening}",',
            "\tstate: { ${3} },",
            "\tvisualActions: [${4}],",
            "\t${5:isTerminal: false}",
            "});",
          ].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: {
            value:
              "Create a visualization step.\n\nEach `step()` call adds one frame to the animation.\n\n" +
              "**Parameters:**\n" +
              "- `title` — Short heading (≤ 200 chars)\n" +
              "- `explanation` — What is happening\n" +
              "- `state` — Snapshot of algorithm variables\n" +
              "- `visualActions` — Rendering instructions\n" +
              "- `isTerminal` — Set `true` on the last step",
          },
          range,
        },
        {
          label: "utils.deepClone",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "utils.deepClone(${1:value})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Create a deep copy of a JSON-serializable value.",
          range,
        },
        {
          label: "utils.range",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "utils.range(${1:0}, ${2:10})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation:
            "Generate an array of sequential integers.\n\nExample: `utils.range(0, 5)` → `[0, 1, 2, 3, 4]`",
          range,
        },
        {
          label: "utils.createMatrix",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "utils.createMatrix(${1:rows}, ${2:cols}, ${3:0})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Create a 2D array initialized with a fill value.",
          range,
        },
        {
          label: "utils.shuffle",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "utils.shuffle(${1:array}, ${2:42})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation:
            "Shuffle an array in place using a deterministic seeded PRNG (Fisher-Yates).",
          range,
        },
        {
          label: "utils.randomInt",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "utils.randomInt(${1:1}, ${2:100}, ${3:42})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Generate a deterministic random integer in [min, max] (inclusive).",
          range,
        },
        {
          label: "utils.formatNumber",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "utils.formatNumber(${1:value}, ${2:2})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Format a number with a fixed number of decimal places.",
          range,
        },
      ];

      return { suggestions };
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────────

const MonacoEditorComponent = memo(function MonacoEditorComponent(props: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const disposablesRef = useRef<IDisposable[]>([]);
  const decorationsRef = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Store latest callback refs to avoid stale closures.
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  const onRunRef = useRef(props.onRun);
  onRunRef.current = props.onRun;

  // ─── Initialize Monaco ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function initMonaco() {
      if (!containerRef.current) return;

      const monaco = await import("monaco-editor");

      if (cancelled || !containerRef.current) return;

      // Define the custom theme.
      defineEigenvueTheme(monaco);

      // Create the editor instance.
      const editor = monaco.editor.create(containerRef.current, {
        value: props.value,
        language: "javascript",
        theme: EIGENVUE_THEME_NAME,
        automaticLayout: true,
        minimap: { enabled: true, scale: 1, showSlider: "mouseover" },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontLigatures: true,
        lineHeight: 22,
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        bracketPairColorization: { enabled: true },
        renderLineHighlight: "gutter",
        wordWrap: "on",
        tabSize: 2,
        readOnly: props.readOnly ?? false,
        accessibilitySupport: "auto",
        ariaLabel: "Algorithm code editor",
      });

      editorRef.current = editor;

      // Register completion provider.
      const completionDisposable = registerCompletions(monaco);
      disposablesRef.current.push(completionDisposable);

      // Register Ctrl/Cmd + Enter keybinding for "Run".
      const runAction = editor.addAction({
        id: "eigenvue-run",
        label: "Run Code",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          onRunRef.current?.();
        },
      });
      disposablesRef.current.push(runAction);

      // Listen for content changes.
      const contentDisposable = editor.onDidChangeModelContent(() => {
        const value = editor.getValue();
        onChangeRef.current(value);
      });
      disposablesRef.current.push(contentDisposable);

      setIsLoading(false);
    }

    initMonaco();

    return () => {
      cancelled = true;
      // Dispose all registered disposables.
      for (const d of disposablesRef.current) {
        d.dispose();
      }
      disposablesRef.current = [];
      decorationsRef.current = null;
      // Dispose the editor instance.
      editorRef.current?.dispose();
      editorRef.current = null;
    };
    // Only run on mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sync External Value Changes ───────────────────────────────────

  const isInternalChange = useRef(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentValue = editor.getValue();
    if (currentValue !== props.value) {
      // Prevent cursor jumping: only update if value differs.
      isInternalChange.current = true;
      editor.setValue(props.value);
      isInternalChange.current = false;
    }
  }, [props.value]);

  // ─── ReadOnly Updates ──────────────────────────────────────────────

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: props.readOnly ?? false });
  }, [props.readOnly]);

  // ─── Error Decorations ─────────────────────────────────────────────

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (props.error) {
      const { line, column, message } = props.error;
      const model = editor.getModel();
      if (!model) return;

      const lineLength = model.getLineLength(line) || 1;

      const newDecorations: MonacoEditorNS.IModelDeltaDecoration[] = [
        {
          range: {
            startLineNumber: line,
            startColumn: column ?? 1,
            endLineNumber: line,
            endColumn: column ? column + 1 : lineLength + 1,
          },
          options: {
            isWholeLine: !column,
            className: "monaco-error-line",
            glyphMarginClassName: "monaco-error-glyph",
            hoverMessage: { value: `**Error:** ${message}` },
            inlineClassName: "monaco-error-inline",
            overviewRuler: {
              color: "#ef4444",
              position: 4, // OverviewRulerLane.Full
            },
          },
        },
      ];

      if (decorationsRef.current) {
        decorationsRef.current.set(newDecorations);
      } else {
        decorationsRef.current = editor.createDecorationsCollection(newDecorations);
      }

      // Reveal the error line.
      editor.revealLineInCenter(line);
    } else {
      // Clear all error decorations.
      decorationsRef.current?.clear();
    }
  }, [props.error]);

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a1a] z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-mono">Loading editor...</span>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[300px]"
        style={{ height: props.height ?? "100%" }}
        role="textbox"
        aria-label="Algorithm code editor"
        aria-multiline="true"
      />
      <style>{`
        .monaco-error-line {
          background-color: rgba(239, 68, 68, 0.1) !important;
        }
        .monaco-error-glyph {
          background-color: #ef4444;
          border-radius: 50%;
          width: 8px !important;
          height: 8px !important;
          margin-left: 4px;
          margin-top: 7px;
        }
        .monaco-error-inline {
          text-decoration: wavy underline #ef4444;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
});

export { MonacoEditorComponent as MonacoEditor };
