import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", ink: "var(--ink)",
        muted: "var(--muted)", line: "var(--line)", accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)", danger: "var(--danger)"
      },
      fontFamily: { sans: ["Heebo", "Segoe UI", "Arial", "system-ui", "sans-serif"] }
    }
  }
} satisfies Config;
