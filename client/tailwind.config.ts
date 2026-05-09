import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0d10",
          elev: "#13161b",
          card: "#181c22",
        },
        border: {
          DEFAULT: "#262a31",
        },
        text: {
          DEFAULT: "#e6e8eb",
          muted: "#8a929c",
        },
        accent: {
          DEFAULT: "#f59f0a",
          hover: "#ffb12a",
          ring: "rgba(245, 159, 10, 0.4)",
        },
        good: "#3ecf8e",
        bad: "#f15c5c",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
