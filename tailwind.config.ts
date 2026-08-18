import type { Config } from "tailwindcss";

/**
 * "Letterpress" design tokens. Two worlds share one warm palette:
 * paper (sacred, family-facing surfaces) and the dark study (writing and
 * utility surfaces), joined by a single sealing-wax accent.
 *
 * The ink-300…50 and ember shades exist so pre-refresh utility views keep
 * resolving to sensible study colors; new code should use paper/parch/wax.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Charter", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
      colors: {
        paper: {
          50: "#F6F1E6",
          100: "#ECE4D2",
          200: "#D9D0BC",
          300: "#C9BFA8",
        },
        ink: {
          950: "#191511",
          900: "#221E18",
          800: "#2C261E",
          700: "#3A332A",
          600: "#494235",
          500: "#6D6353",
          400: "#8C8270",
          // Legacy aliases for pre-refresh utility views (parch/paper tones).
          300: "#A89A82",
          200: "#C9BDA4",
          100: "#F2EAD9",
          50: "#F6F1E6",
        },
        stone: {
          400: "#A89E8A",
        },
        parch: {
          300: "#A89A82",
          200: "#C9BDA4",
          100: "#F2EAD9",
        },
        wax: {
          400: "#C65B44",
          600: "#A33D2A",
          700: "#8A3222",
        },
        candle: {
          400: "#E0A458",
        },
        // Legacy accent aliases → wax.
        ember: {
          500: "#A33D2A",
          400: "#C65B44",
          300: "#D08A73",
        },
      },
      boxShadow: {
        sheet: "0 3px 18px rgba(34,30,24,0.12)",
        "sheet-dark": "0 10px 50px rgba(0,0,0,0.55)",
        photo: "0 2px 10px rgba(34,30,24,0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
