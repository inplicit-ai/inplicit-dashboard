import { type Config } from "tailwindcss";

// Tokens are CSS variables defined in static/design.css. Tailwind utilities
// resolve to var(...) so theme switching (light/dark via data-theme) keeps
// working without a Tailwind dark-mode strategy.
export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",

        // Lines
        line: "var(--color-border)",
        "line-subtle": "var(--color-border-subtle)",

        // Text — accessed via text-fg, text-fg-muted, …
        fg: {
          DEFAULT: "var(--color-text-primary)",
          muted: "var(--color-text-secondary)",
          subtle: "var(--color-text-tertiary)",
          faint: "var(--color-text-quaternary)",
        },

        // Brand / accent
        accent: {
          DEFAULT: "var(--color-accent)",
          strong: "var(--color-accent-strong)",
          soft: "var(--color-accent-soft)",
          muted: "var(--color-accent-muted)",
        },

        // Semantic
        pain: {
          DEFAULT: "var(--color-pain)",
          soft: "var(--color-pain-soft)",
          muted: "var(--color-pain-muted)",
        },
        gap: {
          DEFAULT: "var(--color-gap)",
          soft: "var(--color-gap-soft)",
          muted: "var(--color-gap-muted)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          soft: "var(--color-success-soft)",
        },
        warning: "var(--color-warning)",
        danger: {
          DEFAULT: "var(--color-danger)",
          soft: "var(--color-danger-soft)",
        },
        cta: {
          DEFAULT: "var(--color-cta-bg)",
          fg: "var(--color-cta-text)",
        },
      },
      fontFamily: {
        sans: ["var(--font-family)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        ui: "var(--radius-ui)",
        card: "var(--radius-card)",
      },
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
        smooth: "var(--ease-smooth)",
      },
      maxWidth: {
        container: "var(--container-max)",
      },
    },
  },
} satisfies Config;
