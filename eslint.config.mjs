import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      "node_modules",
      "dist",
      ".next",
      "out/",
      "coverage/",
      "public/",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "*.log",
      ".DS_Store",
    ],
  },
  ...compat.extends(
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:react-hooks/recommended"
  ),
  {
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/explicit-function-return-type": "off",
      // React
      "react-hooks/exhaustive-deps": "warn",
      // Accessibility
      "jsx-a11y/anchor-is-valid": "warn",
    },
  },
];

export default config;
