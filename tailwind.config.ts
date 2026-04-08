import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Core Brand ───────────────────────────────────────────────
        "cubby-green": "#104538",       // Primary brand green (CTA buttons, active states)
        "cubby-green-light": "#1a5c4b", // Lighter green hover state
        "cubby-lime": "#AEE169",        // Lime/success green (progress bars, badges)

        // ─── Warm Neutrals ────────────────────────────────────────────
        "cubby-stone": "#EFECE5",       // Main background (warm stone)
        "cubby-cream": "#FDFBF7",       // Card/input backgrounds (cream white)
        "cubby-charcoal": "#3A3530",    // Primary text (warm charcoal, replaces slate-800)
        "cubby-taupe": "#8C867D",       // Muted/secondary text (warm taupe, replaces slate-500)

        // ─── Accent / Warning ─────────────────────────────────────────
        // Two-tier warning system (see gap analysis review note)
        "cubby-salmon": "#E07A5F",      // Tier 1 — warm accent for soft UI (tags, highlights)
        "cubby-urgent": "#D94F3B",      // Tier 2 — functional urgency (expiry, errors, destructive)

        // ─── Pastel Category Palette ──────────────────────────────────
        "cubby-pastel-pink": "#FAD4D4",
        "cubby-pastel-blue": "#D4E9FA",
        "cubby-pastel-yellow": "#FAF0D4",
        "cubby-pastel-green": "#D4FAE0",
        "cubby-pastel-lavender": "#E4D4FA",
        "cubby-pastel-peach": "#FAE4D4",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontWeight: {
        // Gap analysis: new design uses font-black (900) for headings
        black: "900",
      },
      fontSize: {
        // Gap analysis: headings larger — 4xl for page titles, 2xl for section heads
        "page-title": ["2.25rem", { lineHeight: "1.1", fontWeight: "900" }],
        "section-head": ["1.5rem", { lineHeight: "1.2", fontWeight: "900" }],
      },
      borderRadius: {
        // Gap analysis: dramatically larger radii across the board
        "card": "2rem",          // Standard cards
        "tile": "2.5rem",        // Item tiles
        "modal": "3rem",         // Full-screen modals / sheets
        "fab": "1.25rem",        // Floating action button (Log food)
      },
      boxShadow: {
        // Gap analysis: shadows stripped — only ultra-subtle border definition
        "card": "none",
        "subtle": "0 1px 3px rgba(0, 0, 0, 0.04)",
      },
      screens: {
        // Mobile-first — Cubby is a PWA, max width ~430px
        "xs": "375px",
        "sm": "430px",
      },
      animation: {
        "slide-up": "slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-down": "slideDown 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fadeIn 0.2s ease-out",
        "spring-pop": "springPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "confetti-drop": "confettiDrop 1s ease-out forwards",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        springPop: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        confettiDrop: {
          "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
