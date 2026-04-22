import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Nexora futuristic palette
        background: "#05060d",
        surface: "#0a0c1a",
        "surface-2": "#10122a",
        border: "rgba(148, 130, 255, 0.12)",
        neon: {
          purple: "#a855f7",
          violet: "#8b5cf6",
          blue: "#3b82f6",
          cyan: "#22d3ee"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 20px rgba(168, 85, 247, 0.35), 0 0 40px rgba(59, 130, 246, 0.18)",
        "glow-sm": "0 0 12px rgba(168, 85, 247, 0.25)",
        "glow-blue": "0 0 28px rgba(59, 130, 246, 0.35)",
        card: "0 8px 32px rgba(2, 6, 23, 0.45)"
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse at top, rgba(139,92,246,0.18), transparent 60%), radial-gradient(ellipse at bottom, rgba(59,130,246,0.12), transparent 60%)",
        "neon-gradient":
          "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #22d3ee 100%)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" }
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" }
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "toast-progress": {
          "0%": { transform: "scaleX(1)" },
          "100%": { transform: "scaleX(0)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-slow": "pulse-slow 4s ease-in-out infinite",
        "toast-in": "toast-in 0.25s ease-out both",
        "toast-progress": "toast-progress linear forwards",
        float: "float 8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
