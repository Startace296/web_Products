import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "prisma/migrations/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // argsIgnorePattern: Express requires the 4-arg signature for error middleware
      // even when `next` is unused (errorHandler.ts).
      // ignoreRestSiblings: allows `const { passwordHash, ...safeUser } = user` to strip
      // a field via destructuring without ESLint flagging `passwordHash` as unused —
      // the TS compiler already exempts this pattern (see tsconfig noUnusedLocals), but
      // @typescript-eslint's rule needs this option set explicitly to match.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  }
);
