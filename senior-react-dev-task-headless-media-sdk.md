# Senior React Developer — Take-Home: Headless Media SDK

A TypeScript monorepo (pnpm workspaces) implementing a headless media SDK for the
Pexels API plus a demo app, with strict package boundaries.

## Task summary

Build a set of headless npm packages ("SDK") and a consumer app:

1. A framework-independent data layer for the Pexels API (photos + videos).
2. Thin adapters for React and React Native.
3. Headless UI primitives (grid, lightbox, video reel) that own behavior + ARIA but
   not markup/styles.
4. A web app that wires everything: search, infinite grid, lightbox, video reel,
   and an event log of view/download tracking.

## Deliverables

- `packages/media-core` — framework-independent core (no DOM types, injected `fetch`).
  Client endpoints, typed errors, TTL + in-flight cache, `EventEmitter`.
- `packages/media-react` — React data adapter (`MediaProvider`, `useMediaSearch`,
  `useMediaEvents`). Depends only on core.
- `packages/media-native` — React Native data adapter with the same contract; no DOM
  at runtime. Depends only on core.
- `packages/media-ui-react` — headless UI hooks: `useMediaGrid`, `useMediaLightbox`,
  `useMediaReel`. No data fetching; props-only.
- `packages/media-ui-native` — the same three hooks for React Native.
- `apps/web` — Vite + React demo app importing only `@headless-media/react` and
  `@headless-media/ui-react` (never core directly).
- `skills/` — `wiring-data` and `using-components` skill docs.
- `README.md` — overview, graph, commands.

## Verification (headless)

Everything is verified without a browser or manual testing:

- `pnpm test` — vitest suites (core unit tests; React hooks tested with
  `@testing-library/react` + jsdom).
- `pnpm typecheck` — strict TypeScript for all packages.
- `pnpm build` — compiles every package and runs `vite build` for the app.
- `pnpm dev` — Vite dev server for the app (requires `pnpm build` first, and an
  API key to fetch live data).

## Package boundaries

- `media-core` compiles against `lib: ["ES2020"]` only — no DOM or Node globals.
  `fetch` is injected via a `FetchLike` transport, query strings are built by hand,
  and `console` is declared in an ambient `globals.d.ts`.
- `media-react` is the only package that knows both React and the core.
- `media-native` mirrors `media-react` but uses no DOM APIs.
- `media-ui-*` packages never import core; they accept `items` and callbacks as props.
- `apps/web` wires adapters + UI packages and styles everything itself (demonstrating
  the headless contract).

## Key design decisions

- **Typed errors** (`error.name`) let apps branch on auth vs rate-limit vs network.
- **One event emitter** in core powers view/download tracking; any subscriber sees
  every event (the app renders a live event log from it).
- **Request caching** with in-flight de-duplication means StrictMode double-mounts
  and rapid re-searches cost one network request.
- **Prop-getter hooks** return spreadable props with ARIA defaults and an
  `overrides` escape hatch; consumer click/scroll handlers always run before the
  hook's own.
- **Request-id guards** in `useMediaSearch` drop stale responses, so typing fast
  can never clobber newer results.
- **Testing pitfalls handled**: `page=2` in a mock URL matches `per_page=20`, so
  page assertions use regex; jsdom's read-only `clientHeight` means scroll behavior
  is tested via the `onScroll` callback, not `fireEvent.scroll`.
