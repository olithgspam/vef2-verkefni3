import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { files: ["**/*.{ts,js}"] },
  { ignores: ["node_modules/", "prisma/"] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];