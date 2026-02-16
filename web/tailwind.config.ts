import type { Config } from "tailwindcss";

/**
 * Eigenvue Design Token System
 *
 * Naming conventions:
 * - Colors: semantic names (background, surface, text) not visual names (dark, light)
 * - Category colors: prefixed with category name (classical, deeplearning, genai, quantum)
 * - Spacing: uses Tailwind's default scale (0.25rem increments)
 * - Animations: named by purpose (fade-in, slide-up) not by property (opacity, transform)
 *
 * COLOR SYSTEM: All semantic colors reference CSS custom properties defined in globals.css.
 * This enables dark/light mode switching via the `.light` class on <html>.
 * The accent gradient colors (gradient-from/via/to) stay static since the
 * purple-to-cyan gradient works well on both dark and light backgrounds.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      /**
       * ─── COLOR SYSTEM ───
       *
       * Three tiers:
       * 1. Background tiers: page → surface → elevated (increasing lightness)
       * 2. Category accents: one per algorithm domain
       * 3. Semantic colors: text hierarchy, borders, interactive states
       *
       * All colors reference CSS custom properties for dark/light theme support.
       */
      colors: {
        background: {
          /** Main page background. Near-black (dark) or off-white (light). */
          page: "var(--bg-page)",
          /** Card/panel surfaces. */
          surface: "var(--bg-surface)",
          /** Elevated elements (modals, dropdowns, active cards). */
          elevated: "var(--bg-elevated)",
          /** Hover state for surfaces. */
          hover: "var(--bg-hover)",
        },

        /** Category accent colors — theme-aware via CSS variables. */
        classical: {
          DEFAULT: "var(--classical)",
          light: "var(--classical-light)",
          dark: "var(--classical-dark)",
          muted: "var(--classical-muted)",
        },
        deeplearning: {
          DEFAULT: "var(--deeplearning)",
          light: "var(--deeplearning-light)",
          dark: "var(--deeplearning-dark)",
          muted: "var(--deeplearning-muted)",
        },
        genai: {
          DEFAULT: "var(--genai)",
          light: "var(--genai-light)",
          dark: "var(--genai-dark)",
          muted: "var(--genai-muted)",
        },
        quantum: {
          DEFAULT: "var(--quantum)",
          light: "var(--quantum-light)",
          dark: "var(--quantum-dark)",
          muted: "var(--quantum-muted)",
        },

        /** Text hierarchy — theme-aware via CSS variables. */
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
        },

        border: {
          DEFAULT: "var(--border-default)",
          hover: "var(--border-hover)",
          /** Focus border: accent-colored, for keyboard navigation. */
          focus: "#8b5cf6",
        },

        /** Gradient endpoints for the primary CTA gradient (purple → cyan). */
        gradient: {
          from: "#8b5cf6",
          via: "#a855f7",
          to: "#06b6d4",
        },

        /** Difficulty level colors — theme-aware via CSS variables. */
        difficulty: {
          beginner: "var(--difficulty-beginner)",
          "beginner-bg": "var(--difficulty-beginner-bg)",
          intermediate: "var(--difficulty-intermediate)",
          "intermediate-bg": "var(--difficulty-intermediate-bg)",
          advanced: "var(--difficulty-advanced)",
          "advanced-bg": "var(--difficulty-advanced-bg)",
          expert: "var(--difficulty-expert)",
          "expert-bg": "var(--difficulty-expert-bg)",
        },
      },

      /**
       * ─── TYPOGRAPHY ───
       *
       * Two font stacks:
       * 1. sans: Inter — clean geometric sans-serif for all UI text
       * 2. mono: JetBrains Mono — for code, technical badges, and data
       *
       * Font sizes follow a modular scale (ratio ≈ 1.25, base 1rem).
       * Each size includes a tuned line-height for optimal readability.
       */
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },

      fontSize: {
        /** 0.75rem / 12px — Badges, fine print */
        xs: ["0.75rem", { lineHeight: "1rem" }],
        /** 0.875rem / 14px — Captions, metadata */
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        /** 1rem / 16px — Body text (base) */
        base: ["1rem", { lineHeight: "1.625rem" }],
        /** 1.125rem / 18px — Large body, card descriptions */
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        /** 1.25rem / 20px — Section subtitles */
        xl: ["1.25rem", { lineHeight: "1.875rem" }],
        /** 1.5rem / 24px — Card titles, small headings */
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        /** 1.875rem / 30px — Section headings */
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }],
        /** 2.25rem / 36px — Page headings (mobile) */
        "4xl": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.02em" }],
        /** 3rem / 48px — Hero heading (tablet) */
        "5xl": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.025em" }],
        /** 3.75rem / 60px — Hero heading (desktop) */
        "6xl": ["3.75rem", { lineHeight: "4.25rem", letterSpacing: "-0.025em" }],
      },

      /**
       * ─── SPACING & SIZING ───
       */
      maxWidth: {
        /** Maximum content width: 1280px. All sections center within this. */
        content: "80rem",
        /** Narrower max for text-heavy sections: 720px. */
        prose: "45rem",
        /** Card grid max: 1120px. */
        grid: "70rem",
      },

      /**
       * ─── BORDER RADIUS ───
       * Consistent rounding across components.
       */
      borderRadius: {
        /** Small elements: badges, pills */
        sm: "0.375rem",
        /** Medium elements: buttons, inputs */
        DEFAULT: "0.5rem",
        /** Cards, panels */
        lg: "0.75rem",
        /** Large cards, modals */
        xl: "1rem",
        /** Extra large: hero cards, feature panels */
        "2xl": "1.25rem",
      },

      /**
       * ─── BOX SHADOWS ───
       * All shadows use dark, semi-transparent blacks appropriate for dark themes.
       * Light mode shadow overrides are in globals.css.
       * Glow effects use category accent colors at low opacity.
       */
      boxShadow: {
        /** Subtle card shadow */
        card: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
        /** Elevated card shadow (hover) */
        "card-hover": "0 10px 30px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)",
        /** Glow effects for category-themed elements */
        "glow-classical": "0 0 20px rgba(56, 189, 248, 0.15), 0 0 60px rgba(56, 189, 248, 0.05)",
        "glow-deeplearning": "0 0 20px rgba(139, 92, 246, 0.15), 0 0 60px rgba(139, 92, 246, 0.05)",
        "glow-genai": "0 0 20px rgba(244, 114, 182, 0.15), 0 0 60px rgba(244, 114, 182, 0.05)",
        "glow-quantum": "0 0 20px rgba(0, 255, 200, 0.15), 0 0 60px rgba(0, 255, 200, 0.05)",
        /** Inset shadow for pressed buttons */
        inset: "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
      },

      /**
       * ─── ANIMATION ───
       * Keyframes and animation utilities for page elements.
       * Canvas animations (starfield) are handled separately in JS.
       */
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        /** Subtle floating motion for decorative elements. */
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        /** Gradient shimmer for loading states or accent lines. */
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        /** Pulse glow for the hero convergence graphic. */
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in-down": "fade-in-down 0.4s ease-out forwards",
        "slide-in-left": "slide-in-left 0.5s ease-out forwards",
        "scale-in": "scale-in 0.4s ease-out forwards",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },

      /**
       * ─── TRANSITION TIMING ───
       * Standardized easing and duration tokens.
       */
      transitionDuration: {
        DEFAULT: "200ms",
        fast: "100ms",
        normal: "200ms",
        slow: "400ms",
        slower: "600ms",
      },
      transitionTimingFunction: {
        /** Default ease for interactive elements. */
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
        /** Snappy for small UI changes (hovers, toggles). */
        snappy: "cubic-bezier(0.2, 0, 0, 1)",
        /** Gentle for larger transitions (panels, pages). */
        gentle: "cubic-bezier(0.4, 0, 0.1, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
