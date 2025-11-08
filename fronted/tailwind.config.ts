import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(0 0% 2%)",
        foreground: "hsl(0 0% 96%)",
        muted: {
          DEFAULT: "hsl(0 0% 12%)",
          foreground: "hsl(0 0% 65%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 4%)",
          foreground: "hsl(0 0% 98%)",
        },
        primary: {
          DEFAULT: "hsl(0 0% 98%)",
          foreground: "hsl(0 0% 2%)",
        },
        secondary: {
          DEFAULT: "hsl(0 0% 10%)",
          foreground: "hsl(0 0% 90%)",
        },
        accent: {
          DEFAULT: "hsl(210 10% 20%)",
          foreground: "hsl(0 0% 90%)",
        },
        border: "hsl(0 0% 15%)",
        input: "hsl(0 0% 12%)",
        ring: "hsl(0 0% 50%)",
      },
      fontFamily: {
        display: ["Space Grotesk", "JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 60px rgba(255,255,255,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
