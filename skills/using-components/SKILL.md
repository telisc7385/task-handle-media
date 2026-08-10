---
name: using-components
description: Use when building media UI (grid, lightbox, vertical reel) with the headless UI packages — applying prop-getters to your own markup, handling keyboard/scroll interactions, and keeping the SDK out of the presentation layer.
---

# Using the headless media UI components

The `@headless-media/ui-react` package exports three hooks. Each returns
**prop-getters** — functions that return spreadable props for elements in *your*
markup. You own the tags, classes, and styles; the hooks own behavior and ARIA.

```tsx
import { useMediaGrid, useMediaLightbox, useMediaReel } from '@headless-media/ui-react';
```

## Grid with infinite scroll

```tsx
const grid = useMediaGrid({
  items,
  hasMore,
  isLoadingMore,
  onLoadMore: loadMore,
  onItemClick: (item, index) => openLightbox(index),
});

<div {...grid.getGridProps({ className: 'grid' })}>
  {items.map((item, i) => (
    <button {...grid.getItemProps(item, i, { className: 'cell' })}>
      <img src={item.src} alt="" loading="lazy" />
    </button>
  ))}
  <div {...grid.getLoadMoreProps({ className: 'sentinel' })} />
</div>
<button onClick={grid.loadMore}>Load more</button>
```

- The sentinel is observed with `IntersectionObserver`; when it scrolls into view
  while `hasMore`, `onLoadMore` fires. Works without the observer (returns `null` props).
- `getItemProps` adds `role="gridcell"`, `tabIndex`, `aria-posinset`, click, and
  Enter/Space keyboard handling.

## Lightbox

```tsx
const lb = useMediaLightbox({
  items,
  index,
  onIndexChange: setIndex,
  onClose: () => setIndex(null),
  isOpen,
  wrapAround: true,
});

<div {...lb.getOverlayProps({ className: 'overlay' })}>
  <img src={lb.item.src} alt="" />
  <button {...lb.getCloseButtonProps()}>✕</button>
  <button {...lb.getPrevButtonProps()}>‹</button>
  <button {...lb.getNextButtonProps()}>›</button>
</div>
```

- Escape closes; Arrow keys page (disabled via `enableKeyboard: false` if needed).
- Backdrop clicks close only when the target is the overlay itself.
- `disabled` on prev/next is handled unless `wrapAround` is on.

## Vertical reel / swiper

```tsx
const reel = useMediaReel({
  items,
  itemHeight: 480,
  onIndexChange: (i) => onView(items[i]),
});

<div {...reel.getViewportProps({ className: 'reel' })} style={{ height: 480 }}>
  {items.map((v, i) => (
    <div {...reel.getSlideProps(i)} style={{ height: 480 }}>
      <video src={v.videoSrc} poster={v.src} controls />
    </div>
  ))}
</div>
<button onClick={reel.prev} disabled={reel.isFirst}>↑</button>
<button onClick={reel.next} disabled={reel.isLast}>↓</button>
```

- The active index is detected from scroll position; programmatic `goTo`/`next`/`prev`
  scroll the viewport smoothly.
- The consumer owns `overflow-y: auto` / `scroll-snap-type: y mandatory` styling.

## Contract

- Hooks are **stateless about data**: they never fetch or cache. Pass `items` and
  callbacks as props.
- Overrides passed to a getter are merged under the hook's defaults and callbacks
  still fire (user click handlers run first, then the hook's).
- All props are plain DOM props — nothing couples you to a component library.
