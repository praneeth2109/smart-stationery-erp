import type { Config } from "tailwindcss";

// Design tokens — Smart Stationery ERP "Executive Desk" identity.
// Palette: deep charcoal, black leather, dark walnut, brushed brass/gold.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: "#14120F",
          950: "#0D0B09",
          900: "#14120F",
          800: "#1C1815",
          700: "#241F1A",
        },
        walnut: {
          DEFAULT: "#3E2A1E",
          900: "#2A1B12",
          800: "#3E2A1E",
          700: "#4E3626",
          600: "#664732",
        },
        brass: {
          DEFAULT: "#C9A227",
          200: "#EFDE9F",
          300: "#E4C766",
          400: "#D4B347",
          500: "#C9A227",
          600: "#A9841D",
          700: "#856616",
        },
        steel: {
          DEFAULT: "#8B8B8D",
          200: "#C7C7C9",
          300: "#A6A6A8",
          400: "#8B8B8D",
          500: "#6B6B6D",
          600: "#4C4C4E",
        },
        ivory: "#EDE6D6",
        parchment: "#D8CFBB",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        ledger: ["var(--font-ledger)", "monospace"],
      },
      boxShadow: {
        embossed:
          "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 4px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03)",
        "inset-deep": "inset 0 2px 6px rgba(0,0,0,0.65), inset 0 -1px 0 rgba(255,255,255,0.04)",
        panel: "0 20px 50px -12px rgba(0,0,0,0.7), 0 2px 0 rgba(201,162,39,0.08)",
        "brass-glow": "0 0 0 1px rgba(201,162,39,0.35), 0 0 24px rgba(201,162,39,0.12)",
      },
      backgroundImage: {
        leather:
          "radial-gradient(120% 120% at 10% 0%, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 40%), repeating-linear-gradient(135deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 4px)",
        walnutgrain:
          "linear-gradient(160deg, #3E2A1E 0%, #2A1B12 45%, #3E2A1E 100%), repeating-linear-gradient(95deg, rgba(0,0,0,0.08) 0px, transparent 2px, transparent 6px)",
        "brass-sheen": "linear-gradient(115deg, #856616 0%, #E4C766 35%, #C9A227 55%, #856616 100%)",
        ambient: "radial-gradient(80% 60% at 50% -10%, rgba(228,199,102,0.08) 0%, rgba(0,0,0,0) 60%)",
      },
      borderRadius: {
        panel: "18px",
        control: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
