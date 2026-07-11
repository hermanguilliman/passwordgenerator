# AGENTS.md

## Commands

- `npm run check` — typecheck (svelte-check + tsc). No lint, no tests, no formatter.
- `npm run build` — production build via Vite.
- `npm run dev` — dev server at localhost:5173.

## Architecture

Single-page Svelte 5 app, no routing, no backend, no tests. Everything runs client-side.

All business logic and UI lives in **one file**: `src/Generator.svelte` (~2200 lines). State, entropy math, password generation, and rendering are not split into stores or utilities.

Entry: `src/main.ts` → mounts `App.svelte` → composes Header + Generator + Footer.

PWA via `vite-plugin-pwa` (autoUpdate). Manifest icons are `.webp` files in `public/`.

## Conventions

- TypeScript strict mode, but `noUnusedLocals`/`noUnusedParameters` are **not** enabled — verify before assuming an edit broke something.
- No state management library; all state is local to Generator.svelte.
- Crypto RNG: `crypto.getRandomValues()` with rejection sampling (`secureRandomInt`).
- Design tokens: `--toxic-green: #9ef523`, font JetBrains Mono, dark background `#0a0a0a`.
- OG image: `public/og_image.png` (1200×630), referenced in `index.html` OG + Twitter Card meta tags.

## Gotchas

- `npm run check` runs two commands sequentially (`svelte-check` then `tsc`). If the first fails, the second won't run.
- `public/` contains all static assets (icons, manifest, images). Changes there don't trigger HMR.
- Deploy is auto from `main` branch on Netlify — no CI checks gate it.
