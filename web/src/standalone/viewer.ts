// =============================================================================
// web/src/standalone/viewer.ts
//
// Entry point for the standalone, framework-free visualizer that ships inside
// the `eigenvue` Python and Node packages. esbuild bundles this file (and its
// engine dependency tree) into a single `visualizer.js` served by the local
// Flask / Node server at `/static/visualizer.js`.
//
// CRITICAL: This drives the EXACT SAME Canvas 2D rendering engine the web app
// uses (CanvasManager + AnimationManager + the 13 registered layouts), so
// `eigenvue.show(...)`, `eigenvue.jupyter(...)`, and `npx eigenvue show ...`
// produce the same graphical, animated visualizations as eigenvue.web.app —
// not a JSON dump. Importing `../engine/layouts` self-registers every layout.
//
// The DOM structure this script expects lives in `index.html` (shipped
// alongside this bundle). Pure logic lives in `viewer-core.ts` for testability.
// =============================================================================

import { CanvasManager } from "../engine/canvas";
import { AnimationManager } from "../engine/animation";
import { getLayout } from "../engine/layouts";
import { renderScene } from "../engine/primitives";
import type { LayoutFunction, PrimitiveScene, Step } from "../engine/types";
import { DEFAULT_ANIMATION_DURATION_MS } from "../engine/types";

import {
  type ViewerPayload,
  availableLanguages,
  clampIndex,
  codeLines,
  formatStateValue,
  highlightedLines,
  nextSpeedIndex,
  playbackIntervalMs,
  resolveInitialLanguage,
  resolveLayoutConfig,
  resolveLayoutName,
  DEFAULT_SPEED_INDEX,
  SPEED_OPTIONS,
} from "./viewer-core";

// -----------------------------------------------------------------------------
// Small DOM helpers
// -----------------------------------------------------------------------------

/** Looks up a required element by id, throwing a clear error if it is missing. */
function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Standalone viewer: required element #${id} not found.`);
  }
  return el as T;
}

/** Looks up an optional element by id. */
function optionalEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// -----------------------------------------------------------------------------
// Viewer controller
// -----------------------------------------------------------------------------

class ViewerController {
  private readonly payload: ViewerPayload;
  private readonly steps: readonly Step[];
  private readonly layoutFn: LayoutFunction | undefined;
  private readonly layoutConfig: Record<string, unknown>;

  private currentIndex = 0;
  private selectedLanguage: string;
  private speedIndex = DEFAULT_SPEED_INDEX;
  private playTimer: ReturnType<typeof setInterval> | null = null;

  private canvasManager: CanvasManager | null = null;
  private animationManager: AnimationManager | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private reducedMotion: MediaQueryList | null = null;

  // Cached DOM references.
  private readonly canvas: HTMLCanvasElement;
  private readonly els: {
    algoName: HTMLElement;
    algoDescription: HTMLElement;
    stepTitle: HTMLElement;
    explanation: HTMLElement;
    stateDisplay: HTMLElement;
    stepCounter: HTMLElement;
    progress: HTMLInputElement;
    codeTabs: HTMLElement;
    codeLines: HTMLOListElement;
    stepChips: HTMLElement;
    srStatus: HTMLElement;
    layoutMissing: HTMLElement | null;
    btnFirst: HTMLButtonElement;
    btnPrev: HTMLButtonElement;
    btnPlayPause: HTMLButtonElement;
    btnNext: HTMLButtonElement;
    btnLast: HTMLButtonElement;
    btnSpeed: HTMLButtonElement;
  };

  constructor(payload: ViewerPayload) {
    this.payload = payload;
    this.steps = payload.steps;
    this.layoutFn = getLayout(resolveLayoutName(payload.meta));
    this.layoutConfig = resolveLayoutConfig(payload.meta);
    this.selectedLanguage = resolveInitialLanguage(payload.meta, payload.steps);

    this.canvas = requireEl<HTMLCanvasElement>("viz-canvas");
    this.els = {
      algoName: requireEl("algo-name"),
      algoDescription: requireEl("algo-description"),
      stepTitle: requireEl("step-title"),
      explanation: requireEl("explanation-text"),
      stateDisplay: requireEl("state-display"),
      stepCounter: requireEl("step-counter"),
      progress: requireEl<HTMLInputElement>("progress"),
      codeTabs: requireEl("code-tabs"),
      codeLines: requireEl<HTMLOListElement>("code-lines"),
      stepChips: requireEl("step-id-list"),
      srStatus: requireEl("sr-status"),
      layoutMissing: optionalEl("layout-missing"),
      btnFirst: requireEl<HTMLButtonElement>("btn-first"),
      btnPrev: requireEl<HTMLButtonElement>("btn-prev"),
      btnPlayPause: requireEl<HTMLButtonElement>("btn-playpause"),
      btnNext: requireEl<HTMLButtonElement>("btn-next"),
      btnLast: requireEl<HTMLButtonElement>("btn-last"),
      btnSpeed: requireEl<HTMLButtonElement>("btn-speed"),
    };
  }

  /** Boots the viewer: header, engine, panels, controls, first frame. */
  mount(): void {
    const { meta } = this.payload;

    this.els.algoName.textContent = meta.name || this.payload.algorithmId;
    this.els.algoDescription.textContent = meta.description?.short ?? "";
    document.title = `${meta.name} — Eigenvue`;

    this.setupEngine();
    this.buildLanguageTabs();
    this.renderCode();
    this.buildStepChips();
    this.setupControls();
    this.setupKeyboard();

    this.els.progress.min = "0";
    this.els.progress.max = String(Math.max(this.steps.length - 1, 0));

    this.goTo(0);
  }

  // ---------------------------------------------------------------------------
  // Rendering engine
  // ---------------------------------------------------------------------------

  private prefersReducedMotion(): boolean {
    return this.reducedMotion?.matches ?? false;
  }

  private animationDuration(): number {
    return this.prefersReducedMotion() ? 0 : DEFAULT_ANIMATION_DURATION_MS;
  }

  private setupEngine(): void {
    if (!this.layoutFn) {
      // No layout for this algorithm: surface a clear message but keep the rest
      // of the UI (code, explanation, state, playback) fully functional.
      if (this.els.layoutMissing) {
        this.els.layoutMissing.hidden = false;
        this.els.layoutMissing.textContent = `No visual layout registered for "${resolveLayoutName(
          this.payload.meta,
        )}".`;
      }
      return;
    }

    const cm = new CanvasManager(this.canvas);
    const am = new AnimationManager(
      (scene: PrimitiveScene) => {
        cm.renderOnce((ctx, size) => renderScene(ctx, scene, size));
      },
      { durationMs: this.animationDuration() },
    );
    this.canvasManager = cm;
    this.animationManager = am;

    // Recompute the layout (which is size-dependent) on resize, without
    // animating — mirrors the web app's VisualizationPanel behavior.
    this.resizeObserver = new ResizeObserver(() => {
      this.jumpToCurrentScene();
    });
    this.resizeObserver.observe(this.canvas);

    // React to runtime changes in the reduced-motion preference.
    this.reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const onMotionChange = (): void => {
      this.animationManager?.updateConfig({ durationMs: this.animationDuration() });
    };
    if (typeof this.reducedMotion.addEventListener === "function") {
      this.reducedMotion.addEventListener("change", onMotionChange);
    }
    am.updateConfig({ durationMs: this.animationDuration() });
  }

  private currentScene(): PrimitiveScene | null {
    if (!this.layoutFn || !this.canvasManager) {
      return null;
    }
    const step = this.steps[this.currentIndex];
    if (!step) {
      return null;
    }
    return this.layoutFn(step, this.canvasManager.getSize(), this.layoutConfig);
  }

  private transitionToCurrentScene(): void {
    const scene = this.currentScene();
    if (scene && this.animationManager) {
      this.animationManager.transitionTo(scene);
    }
  }

  private jumpToCurrentScene(): void {
    const scene = this.currentScene();
    if (scene && this.animationManager) {
      this.animationManager.jumpTo(scene);
    }
  }

  // ---------------------------------------------------------------------------
  // Code panel
  // ---------------------------------------------------------------------------

  private buildLanguageTabs(): void {
    const languages = availableLanguages(this.payload.meta);
    this.els.codeTabs.replaceChildren();

    for (const language of languages) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "code-tab";
      tab.textContent = language;
      tab.setAttribute("role", "tab");
      tab.dataset["language"] = language;
      tab.addEventListener("click", () => this.selectLanguage(language));
      this.els.codeTabs.appendChild(tab);
    }
    this.updateTabStates();
  }

  private updateTabStates(): void {
    const tabs = this.els.codeTabs.querySelectorAll<HTMLButtonElement>(".code-tab");
    tabs.forEach((tab) => {
      const isActive = tab.dataset["language"] === this.selectedLanguage;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
  }

  private selectLanguage(language: string): void {
    if (language === this.selectedLanguage) {
      return;
    }
    this.selectedLanguage = language;
    this.updateTabStates();
    this.renderCode();
    this.updateCodeHighlight();
  }

  private renderCode(): void {
    const lines = codeLines(this.payload.meta, this.selectedLanguage);
    this.els.codeLines.replaceChildren();

    lines.forEach((text, i) => {
      const li = document.createElement("li");
      li.className = "code-line";
      li.dataset["line"] = String(i + 1);

      const gutter = document.createElement("span");
      gutter.className = "code-gutter";
      gutter.textContent = String(i + 1);

      const content = document.createElement("span");
      content.className = "code-content";
      // Preserve empty lines so line numbers stay aligned with the source.
      content.textContent = text.length > 0 ? text : " ";

      li.appendChild(gutter);
      li.appendChild(content);
      this.els.codeLines.appendChild(li);
    });
  }

  private updateCodeHighlight(): void {
    const step = this.steps[this.currentIndex];
    const active = new Set(highlightedLines(step, this.selectedLanguage));

    const lineEls = this.els.codeLines.querySelectorAll<HTMLLIElement>(".code-line");
    let firstActive: HTMLLIElement | null = null;
    lineEls.forEach((li) => {
      const lineNo = Number(li.dataset["line"]);
      const isActive = active.has(lineNo);
      li.classList.toggle("active", isActive);
      if (isActive) {
        li.setAttribute("aria-current", "true");
        if (!firstActive) {
          firstActive = li;
        }
      } else {
        li.removeAttribute("aria-current");
      }
    });

    if (firstActive) {
      (firstActive as HTMLLIElement).scrollIntoView({ block: "nearest" });
    }
  }

  // ---------------------------------------------------------------------------
  // Step chips
  // ---------------------------------------------------------------------------

  private buildStepChips(): void {
    this.els.stepChips.replaceChildren();
    this.steps.forEach((step, i) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "step-chip" + (step.isTerminal ? " terminal" : "");
      chip.textContent = step.id;
      chip.title = step.title;
      chip.setAttribute("aria-label", `Step ${i + 1}: ${step.title}`);
      chip.addEventListener("click", () => this.goTo(i));
      this.els.stepChips.appendChild(chip);
    });
  }

  private updateStepChips(): void {
    const chips = this.els.stepChips.querySelectorAll<HTMLButtonElement>(".step-chip");
    chips.forEach((chip, i) => {
      chip.classList.toggle("active", i === this.currentIndex);
    });
  }

  // ---------------------------------------------------------------------------
  // Controls & navigation
  // ---------------------------------------------------------------------------

  private setupControls(): void {
    this.els.btnFirst.addEventListener("click", () => this.goTo(0));
    this.els.btnPrev.addEventListener("click", () => this.goTo(this.currentIndex - 1));
    this.els.btnNext.addEventListener("click", () => this.goTo(this.currentIndex + 1));
    this.els.btnLast.addEventListener("click", () => this.goTo(this.steps.length - 1));
    this.els.btnPlayPause.addEventListener("click", () => this.togglePlay());
    this.els.btnSpeed.addEventListener("click", () => this.cycleSpeed());
    this.els.progress.addEventListener("input", () => {
      this.stopPlay();
      this.goTo(Number(this.els.progress.value));
    });
    this.updateSpeedLabel();
  }

  private setupKeyboard(): void {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Don't hijack typing in form fields.
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      switch (e.key) {
        case "ArrowRight":
          this.stopPlay();
          this.goTo(this.currentIndex + 1);
          break;
        case "ArrowLeft":
          this.stopPlay();
          this.goTo(this.currentIndex - 1);
          break;
        case "Home":
          this.stopPlay();
          this.goTo(0);
          break;
        case "End":
          this.stopPlay();
          this.goTo(this.steps.length - 1);
          break;
        case " ":
          e.preventDefault();
          this.togglePlay();
          break;
        default:
          return;
      }
    });
  }

  private goTo(index: number): void {
    const clamped = clampIndex(index, this.steps.length);
    this.currentIndex = clamped;
    this.transitionToCurrentScene();
    this.updateUiForStep();
  }

  private updateUiForStep(): void {
    const step = this.steps[this.currentIndex];
    if (!step) {
      return;
    }

    this.els.stepTitle.textContent = step.title;
    this.els.explanation.textContent = step.explanation;
    this.els.stateDisplay.textContent = formatStateValue(step.state);
    this.els.stepCounter.textContent = `${this.currentIndex + 1} / ${this.steps.length}`;
    this.els.progress.value = String(this.currentIndex);

    this.canvas.setAttribute("aria-label", `Visualization: ${step.title} — ${step.explanation}`);
    this.els.srStatus.textContent = `Step ${this.currentIndex + 1} of ${this.steps.length}: ${step.title}`;

    this.updateCodeHighlight();
    this.updateStepChips();
    this.updateNavButtons();
  }

  private updateNavButtons(): void {
    const atStart = this.currentIndex === 0;
    const atEnd = this.currentIndex === this.steps.length - 1;
    this.els.btnFirst.disabled = atStart;
    this.els.btnPrev.disabled = atStart;
    this.els.btnNext.disabled = atEnd;
    this.els.btnLast.disabled = atEnd;
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  private togglePlay(): void {
    if (this.playTimer !== null) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }

  private startPlay(): void {
    if (this.steps.length <= 1) {
      return;
    }
    // Restart from the beginning if we're already at the end.
    if (this.currentIndex >= this.steps.length - 1) {
      this.goTo(0);
    }
    this.setPlayButton(true);
    this.playTimer = setInterval(() => {
      if (this.currentIndex >= this.steps.length - 1) {
        this.stopPlay();
        return;
      }
      this.goTo(this.currentIndex + 1);
    }, playbackIntervalMs(this.speedIndex));
  }

  private stopPlay(): void {
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    this.setPlayButton(false);
  }

  private setPlayButton(playing: boolean): void {
    this.els.btnPlayPause.textContent = playing ? "❚❚" : "▶";
    this.els.btnPlayPause.setAttribute("aria-label", playing ? "Pause" : "Play");
    this.els.btnPlayPause.setAttribute("aria-pressed", String(playing));
  }

  private cycleSpeed(): void {
    this.speedIndex = nextSpeedIndex(this.speedIndex);
    this.updateSpeedLabel();
    // If currently playing, restart the timer at the new cadence.
    if (this.playTimer !== null) {
      this.stopPlay();
      this.startPlay();
    }
  }

  private updateSpeedLabel(): void {
    const option = SPEED_OPTIONS[this.speedIndex] ?? SPEED_OPTIONS[DEFAULT_SPEED_INDEX];
    this.els.btnSpeed.textContent = option.label;
    this.els.btnSpeed.setAttribute("aria-label", `Playback speed: ${option.label}`);
  }
}

// -----------------------------------------------------------------------------
// Bootstrap
// -----------------------------------------------------------------------------

function showFatalError(message: string): void {
  const nameEl = document.getElementById("algo-name");
  const explanationEl = document.getElementById("explanation-text");
  if (nameEl) {
    nameEl.textContent = "Error loading visualization";
  }
  if (explanationEl) {
    explanationEl.textContent = message;
  }
}

async function init(): Promise<void> {
  try {
    const res = await fetch("/api/steps");
    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }
    const payload = (await res.json()) as ViewerPayload;
    if (!payload || !Array.isArray(payload.steps) || payload.steps.length === 0) {
      throw new Error("No steps were generated for this algorithm.");
    }
    new ViewerController(payload).mount();
  } catch (err) {
    showFatalError(err instanceof Error ? err.message : String(err));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init());
} else {
  void init();
}
