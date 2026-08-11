# Headless Media SDK

A TypeScript pnpm-workspaces monorepo implementing a **headless media SDK** for the
Pexels API: a framework-independent core client, thin React / React Native adapters,
and headless (prop-getter) UI hooks. The demo app in `apps/web` wires the web packages
together.

## Package graph

```
apps/web (Vite + React)
 ├─ @headless-media/react   (data adapter — React bindings around core)
 │    └─ @headless-media/core   (framework-independent client, cache, events)
 ├─ @headless-media/ui-react (headless UI hooks: grid, lightbox, reel)
 └─ @headless-media/ui-native (headless UI hooks for React Native)

@headless-media/native       (data adapter — React Native mirror, no DOM)
 └─ @headless-media/core
```

Rules enforced by the graph:

- `media-core` has **zero** DOM/Node types — it needs only an injected `fetch`
  (`lib: ["ES2020"]`).
- The UI packages (`media-ui-*`) are fully independent; they receive data and
  callbacks **via props only** and never touch the network or the core.
- Only the app imports the adapters + UI packages; the app never imports core
  directly (it re-exports types through `@headless-media/react`).

## Packages

| Package | Description |
| --- | --- |
| `packages/media-core` | `PexelsClient` (search, searchVideos, curated, getPhoto, getVideo), TTL+in-flight cache, typed errors, `EventEmitter`, `MediaItem` normalization. |
| `packages/media-react` | `MediaProvider`/`useMediaClient`, `useMediaSearch`, `useMediaEvents`. |
| `packages/media-native` | Same contract as `media-react` for React Native (no DOM at runtime). |
| `packages/media-ui-react` | `useMediaGrid` (infinite scroll + ARIA grid), `useMediaLightbox` (keyboard, backdrop, paging), `useMediaReel` (vertical swiper). |
| `packages/media-ui-native` | Same three hooks with RN-native scroll events. |
| `apps/web` | Demo app: photo search + grid + lightbox, video reel, live event log. |

## Commands

```sh
pnpm install     # install all workspace dependencies
pnpm build       # build every package and the app (typecheck + tsc + vite build)
pnpm test        # run all vitest suites (headless; jsdom for React hooks)
pnpm typecheck   # typecheck every package without emitting
pnpm dev         # start the Vite dev server for apps/web
```

> **Note:** `pnpm dev` serves built output from the workspace packages, so run
> `pnpm build` first (or once after changing a package). The app itself is a
> consumer, not a bundler of source.

## Running the demo

1. `pnpm install`
2. `pnpm build`
3. Get a free key at <https://www.pexels.com/api/> and create `apps/web/.env` from
   `.env.example` (`VITE_PEXELS_API_KEY=...`).
4. `pnpm dev` and open <http://localhost:5173>.

In dev the browser never calls `api.pexels.com` directly: Vite proxies
`/pexels/*` to the Pexels API (see `apps/web/vite.config.ts`), which avoids CORS
and browser-side blockers. Production builds use the direct API URL (Pexels
sends the right CORS headers), overridable with `VITE_PEXELS_BASE_URL`.

Without a key the app shows a setup screen; everything else builds and tests fine
headlessly (no browser or manual verification required).

## Design notes

- **Errors** are typed (`PexelsAuthenticationError`, `PexelsRateLimitError`,
  `PexelsNetworkError`, `PexelsError`) so consumers can branch on `error.name`.
- **Events** flow through one emitter: `client.trackView` / `client.trackDownload`
  emit, and any subscriber (event log, analytics) receives the same payload.
- **Caching** is request-TTL based with in-flight de-duplication, so double mounts
  (React StrictMode) cost one network call.
- **Headless UI** hooks return spreadable prop-getters with ARIA defaults and
  override support — consumers own all markup and styling.

## Documentation

- `skills/wiring-data/SKILL.md` — connecting data sources through the SDK.
- `skills/using-components/SKILL.md` — applying the headless UI hooks.
