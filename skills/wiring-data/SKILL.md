---
name: wiring-data
description: Use when wiring data sources (Pexels, other media APIs) into an app through the headless media SDK — MediaProvider setup, useMediaSearch queries, load-more pagination, and view/download event tracking.
---

# Wiring data through the headless media SDK

This skill documents how to connect a media data source to your UI using the
`@headless-media` packages. The SDK is split into two concerns:

- **Data adapters** (`@headless-media/react`, `@headless-media/native`) wrap the
  framework-independent client in `@headless-media/core`.
- **Headless UI packages** (`@headless-media/ui-react`, `@headless-media/ui-native`)
  provide prop-getters for grid/lightbox/reel components. They never fetch data —
  you pass `items` and callbacks via props.

## 1. Provide the client

Wrap your app once. The provider builds a client with an injected `fetch` (the
core has **no DOM dependencies**) and an optional API key.

```tsx
import { MediaProvider } from '@headless-media/react';

export function App() {
  return (
    <MediaProvider apiKey={import.meta.env.VITE_PEXELS_API_KEY}>
      <Shell />
    </MediaProvider>
  );
}
```

`apiKey` is optional for non-authenticated use. The client exposes
`search`, `searchVideos`, `curated`, `getPhoto`, `getVideo`, `trackView`,
`trackDownload`, and an `events` emitter.

## 2. Search with pagination

`useMediaSearch` normalizes Pexels responses to `MediaItem[]` (a framework-agnostic
shape: `{ id, kind, title, src, videoSrc?, photographer, raw }`).

```tsx
const { items, isLoading, isLoadingMore, hasMore, error, search, loadMore } =
  useMediaSearch({ kind: 'photo', defaultQuery: 'nature', perPage: 30 });

// on form submit:
await search(input.value);
// infinite scroll or "load more" button:
await loadMore();
```

Guarantees:

- A stale search result is dropped (request-id guard) — rapid queries never race.
- `loadMore()` appends to the previous results and is a no-op while loading or
  when `hasMore` is false.
- Concurrent identical requests are de-duplicated by the core's in-flight cache.

## 3. Track view/download events

```tsx
const { trackView, trackDownload, events } = useMediaEvents();

function onOpen(item: MediaItem) {
  trackView(item);
}

function onDownload(item: MediaItem) {
  trackDownload(item);
}
```

Events flow through the core's `EventEmitter`, so **any** consumer subscribing to
`client.events` sees them — log panels, analytics beacons, whatever. Use
`lastEvent`/`events` for UI, and `clear()` to reset.

## 4. What NOT to do

- Do not import `@headless-media/core` from the app. The UI packages receive
  data through props; the app should only depend on the adapters (`-react`/`-native`)
  and the UI packages.
- Do not put API calls inside the headless UI hooks. Keep `@headless-media/ui-*`
  purely presentational/prop-getter code.
