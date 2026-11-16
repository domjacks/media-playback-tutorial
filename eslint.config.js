import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z]" }]
    }
  },
  {
    files: ["checkpoints/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: globals.browser
    }
  },
  {
    files: ["scripts/**/*.mjs", "vite.config.js", "eslint.config.js"],
    languageOptions: {
      globals: globals.node
    }
  }
];
