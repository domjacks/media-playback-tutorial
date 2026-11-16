import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks
    },
    settings: {
      react: { version: "detect" }
    },
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
      ...reactHooks.configs.recommended.rules,
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "no-unused-vars": "error"
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
    files: ["scripts/**/*.mjs", "checkpoints/**/*.mjs", "vite.config.js", "eslint.config.js"],
    languageOptions: {
      globals: globals.node
    }
  }
];
