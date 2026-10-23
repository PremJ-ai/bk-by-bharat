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
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        ink: "var(--color-ink)",
        navy: "var(--color-navy)",
        "navy-strong": "var(--color-navy-strong)",
        gold: "var(--color-gold)",
        rust: "var(--color-rust)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        "stock-low": "var(--color-stock-low)",
        "stock-ok": "var(--color-stock-ok)",
        focus: "var(--color-focus)",
      },
      fontFamily: {
        display: ["var(--font-garamond)", "Georgia", "serif"],
        sans: ["var(--font-hanken)", "Arial", "Helvetica", "sans-serif"],
      },
      letterSpacing: {
        caps: "0.14em",
      },
    },
  },
  plugins: [],
};

export default config;
