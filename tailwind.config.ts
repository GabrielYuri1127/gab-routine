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
        ink: "#15161a",
        paper: "#f8fafc",
        line: "#d9dee8",
        mint: "#0f9f7a",
        coral: "#e35d45",
        sky: "#2b7fff",
        gold: "#b7791f"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(21, 22, 26, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
