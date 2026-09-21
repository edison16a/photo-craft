import { FlatCompat } from "@eslint/eslintrc";

/**
 * ESLint flat config. Uses the rules Next.js ships for the App Router and
 * TypeScript, and ignores build output.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default config;
