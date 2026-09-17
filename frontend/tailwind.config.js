/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        accent: {
          DEFAULT: "var(--color-accent)",
          soft: "var(--color-accent-soft)",
          dark: "var(--color-accent-dark)",
        },
        gold: "var(--color-gold)",
        line: "var(--color-line)",
      },
      fontFamily: {
        display: ["Literata", "serif"],
        body: ["Golos Text", "sans-serif"],
      },
    },
  },
  plugins: [],
};
