import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0069B7",
          50: "#e6f1fa",
          100: "#cfe3f5",
          200: "#9ec7eb",
          300: "#6daae1",
          400: "#3c8ed7",
          500: "#0b72cd",
          600: "#00579a",
          700: "#004576",
          800: "#003352",
          900: "#00212e"
        },
        accent: {
          DEFAULT: "#7CC100",
          600: "#64a300",
          700: "#4e8100"
        }
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" }
    }
  },
  plugins: []
} satisfies Config;
