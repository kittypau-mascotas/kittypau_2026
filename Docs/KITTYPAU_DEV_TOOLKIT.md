# Kittypau Dev Toolkit

Guia para desarrollo seguro y consistente.

Equipo: Javo · Mauro  
Proyecto: Kittypau

## 1. Objetivo

Estandarizar verificaciones antes de subir codigo para:

- Reducir errores de CI
- Mantener consistencia
- Detectar bugs comunes de React/Next
- Encontrar problemas antes del deploy

## 2. Herramientas usadas

- `eslint`
- `prettier`
- `typescript`
- `eslint-plugin-unused-imports`
- `eslint-plugin-sonarjs`
- `husky`
- `lint-staged`

## 3. Scripts disponibles (`kittypau_app/package.json`)

- `npm run lint`
- `npm run lint:fix`
- `npm run format`
- `npm run clean:imports`
- `npm run type-check`
- `npm run build-check`
- `npm run security-check`
- `npm run fix:all`
- `npm run dev:check`
- `npm run ci:check`
- `npm run staged:check`

## 4. Comandos recomendados

Antes de commit:

```bash
npm run fix:all
```

Antes de push:

```bash
npm run ci:check
```

## 5. Hook de pre-commit

Hook versionado en:

- `.husky/pre-commit`

Ejecuta:

```bash
npm --prefix kittypau_app run fix:all
```

Para activarlo localmente (una vez por PC):

```bash
git config core.hooksPath .husky
```

## 6. lint-staged

Configurado en:

- `kittypau_app/.lintstagedrc`

Uso manual opcional:

```bash
npm --prefix kittypau_app run staged:check
```

## 7. Reglas clave del proyecto

- No usar hooks condicionales.
- No crear componentes dentro de render.
- Evitar `setState` sincronico dentro de `useEffect`.
- No subir secretos ni archivos grandes.

## 8. Flujo recomendado Kittypau

```bash
git checkout -b feature/nueva-funcion
npm --prefix kittypau_app run dev:check
git commit -m "feat: nueva funcion"
git push
```

## 9. Nota operativa

`npm run lint` puede reportar warnings existentes del repo.  
Los bloqueantes de PR son errores (`error`), no warnings.


