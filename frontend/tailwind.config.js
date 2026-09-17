/** @type {import('tailwindcss').Config} */
function withOpacity(variableName) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `rgb(var(${variableName}))`
      : `rgb(var(${variableName}) / ${opacityValue})`;
}

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: withOpacity("--color-bg"),
        surface: withOpacity("--color-surface"),
        ink: withOpacity("--color-ink"),
        "ink-soft": withOpacity("--color-ink-soft"),
        accent: {
          DEFAULT: withOpacity("--color-accent"),
          soft: withOpacity("--color-accent-soft"),
          dark: withOpacity("--color-accent-dark"),
        },
        gold: withOpacity("--color-gold"),
        line: withOpacity("--color-line"),
      },
      fontFamily: {
        display: ["Literata", "serif"],
        body: ["Golos Text", "sans-serif"],
      },
    },
  },
  plugins: [],
};
