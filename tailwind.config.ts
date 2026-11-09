import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#111315",
          900: "#171a1d",
          850: "#1d2125",
          800: "#24292e",
          700: "#30363d",
          600: "#444c56",
        },
        accent: {
          DEFAULT: "#f49b62",
          soft: "#ffb384",
          deep: "#d9793b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
