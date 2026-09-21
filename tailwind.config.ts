import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        contrast: "rgb(var(--color-contrast) / <alpha-value>)",
        "contrast-hover": "rgb(var(--color-contrast-hover) / <alpha-value>)",
        strong: "rgb(var(--color-strong) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        slate: {
          50: "rgb(var(--color-slate-50) / <alpha-value>)",
          100: "rgb(var(--color-slate-100) / <alpha-value>)",
          200: "rgb(var(--color-slate-200) / <alpha-value>)",
          300: "rgb(var(--color-slate-300) / <alpha-value>)",
          400: "rgb(var(--color-slate-400) / <alpha-value>)",
          500: "rgb(var(--color-slate-500) / <alpha-value>)",
          600: "rgb(var(--color-slate-600) / <alpha-value>)",
          700: "rgb(var(--color-slate-700) / <alpha-value>)"
        },
        mint: "#0f9f7a",
        coral: "#e35d45",
        sky: "#2b7fff",
        gold: "#b7791f"
      },
      boxShadow: {
        soft: "var(--shadow-soft)"
      }
    }
  },
  plugins: []
};

export default config;
