import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 20px 80px rgba(12, 16, 28, 0.12)"
      },
      colors: {
        ink: {
          50: "#f6f7fb",
          100: "#ebeef6",
          200: "#d2d9ea",
          300: "#b0bbd5",
          400: "#8697bb",
          500: "#586a94",
          600: "#41507a",
          700: "#2f3a5d",
          800: "#1d2440",
          900: "#11182a"
        },
        sand: {
          50: "#fff9f1",
          100: "#fff0dd",
          200: "#fedfb7",
          300: "#fbcf8f",
          400: "#f6b85a",
          500: "#e99a25"
        }
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.24) 1px, transparent 0)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;

