import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // ponytail: eslint-plugin-react-hooks v7 (analizador tipo React Compiler)
  // puede invalidar un eslint-disable-next-line legítimo en un pase de fix
  // previo y luego reportar el error de la regla ya sin el disable (visto en
  // login/page.tsx). Desactivar el auto-remove de directivas "no usadas"
  // evita que `eslint --fix` corrompa comentarios de supresión intencionales.
  { linterOptions: { reportUnusedDisableDirectives: "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
