import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // новий JSX transform — import React не потрібен
      "react/prop-types": "off", // проєкт без PropTypes/TypeScript
      "react/no-unescaped-entities": "off", // апострофи й лапки в українському тексті JSX — це нормально
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Vercel-функції та конфіги працюють у Node, а не в браузері
    files: ["api/**/*.js", "*.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier, // завжди останнім: вимикає правила, що конфліктують із Prettier
];
