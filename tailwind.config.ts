import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      colors: {
        ink: {
          950: "#12100e",
          900: "#1a1815",
          800: "#26231e",
          700: "#37332c",
          400: "#8a8172",
          300: "#a89e8c",
          200: "#cfc6b4",
          100: "#e8e2d5",
          50: "#f5f1e8",
        },
        ember: {
          500: "#c98a3d",
          400: "#d9a05a",
          300: "#e6bc85",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
