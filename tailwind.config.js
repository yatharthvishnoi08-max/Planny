/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        indigo: {
          50: "#f0f1ff",
          100: "#e3e6ff",
          200: "#cbd0ff",
          300: "#a9b1ff",
          400: "#8b94f5",
          500: "#707bea",
          600: "#5865cf",
          700: "#4853b2",
          800: "#3c4591",
          900: "#343b73",
          950: "#202443",
        },
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          50: "hsl(var(--surface-50) / <alpha-value>)",
          100: "hsl(var(--surface-100) / <alpha-value>)",
          200: "hsl(var(--surface-200) / <alpha-value>)",
          300: "hsl(var(--surface-300) / <alpha-value>)",
          border: "hsl(var(--border) / <alpha-value>)",
          hover: "hsl(var(--surface-hover) / <alpha-value>)",
        },
        priority: {
          low: "#3b82f6",
          medium: "#eab308",
          high: "#f97316",
          urgent: "#ef4444",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Text'",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
        mono: ["'SF Mono'", "'JetBrains Mono'", "Menlo", "monospace"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "slide-in-right": "slide-in-right 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-subtle": "pulse-subtle 2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};
