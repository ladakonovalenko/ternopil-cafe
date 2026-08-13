/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F6F3",
        surface: "#FFFFFF",
        ink: "#202A24",
        "ink-soft": "#5B6660",
        accent: {
          DEFAULT: "#2B6C5E",
          soft: "#E4EEEA",
          dark: "#1F4F45",
        },
        gold: "#B98A3E",
        line: "#DFE3DD",
      },
      fontFamily: {
        display: ["Literata", "serif"],
        body: ["Golos Text", "sans-serif"],
      },
    },
  },
  plugins: [],
};
