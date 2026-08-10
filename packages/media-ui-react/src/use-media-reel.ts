import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseMediaReelOptions<T> {
  items: readonly T[];
  /** Controlled active index. Leave undefined for uncontrolled mode. */
  activeIndex?: number;
  /** Initial index in uncontrolled mode. Defaults to 0. */
  defaultActiveIndex?: number;
  /** Fired whenever the active item changes (scroll or programmatic). */
  onIndexChange?: (index: number) => void;
  /** Height of one slide in px. Falls back to the viewport's clientHeight. */
  itemHeight?: number;
  /** `aria-label` for the viewport region. */
  label?: string;
}

export interface UseMediaReelReturn<T> {
  activeIndex: number;
  item: T | undefined;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  /**
   * Props for the scrolling viewport: a ref, a scroll listener that detects
   * the active slide, and keyboard paging (ArrowUp / ArrowDown).
   */
  getViewportProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for one slide element. The consumer sets its height/style. */
  getSlideProps: (
    index: number,
    overrides?: Record<string, unknown>,
  ) => Record<string, unknown>;
}

/**
 * Headless vertical reel/swiper. Detects the active slide from scroll position
 * and supports programmatic paging. The consumer styles the viewport and
 * slides; typically with `scroll-snap` or fixed slide heights.
 */
export function useMediaReel<T>(options: UseMediaReelOptions<T>): UseMediaReelReturn<T> {
  const {
    items,
    activeIndex: controlledActive,
    defaultActiveIndex = 0,
    onIndexChange,
    itemHeight,
    label = 'Media reel',
  } = options;

  const isControlled = controlledActive !== undefined;
  const optionsRef = useRef({ itemHeight, onIndexChange });
  optionsRef.current = { itemHeight, onIndexChange };

  const [internalActive, setInternalActive] = useState(
    controlledActive ?? defaultActiveIndex,
  );
  const activeIndex = isControlled ? (controlledActive as number) : internalActive;

  const viewportRef = useRef<HTMLElement | null>(null);
  const lastCommitted = useRef<number>(activeIndex);

  const commit = useCallback(
    (index: number) => {
      if (index === lastCommitted.current) return;
      lastCommitted.current = index;
      if (!isControlled) setInternalActive(index);
      optionsRef.current.onIndexChange?.(index);
    },
    [isControlled],
  );

  const goTo = useCallback(
    (nextIndex: number) => {
      if (items.length === 0) return;
      const clamped = Math.min(Math.max(nextIndex, 0), items.length - 1);
      commit(clamped);
    },
    [items.length, commit],
  );

  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || el.clientHeight === 0) return;
    const height = itemHeight ?? el.clientHeight;
    if (height <= 0) return;
    const top = activeIndex * height;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top, behavior: 'smooth' });
    } else {
      el.scrollTop = top;
    }
  }, [activeIndex, itemHeight]);

  const handleScroll = useCallback(
    (event: { currentTarget: { scrollTop: number; clientHeight?: number } }) => {
      const el = event.currentTarget;
      const height = itemHeight ?? el.clientHeight ?? 0;
      if (height <= 0) return;
      const raw = el.scrollTop / height;
      const index = Math.min(Math.max(Math.round(raw), 0), Math.max(items.length - 1, 0));
      commit(index);
    },
    [itemHeight, items.length, commit],
  );

  const handleKeyDown = useCallback(
    (event: { key: string; preventDefault(): void }) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        prev();
      }
    },
    [next, prev],
  );

  const getViewportProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      ref: viewportRef,
      role: 'region',
      'aria-label': label,
      tabIndex: 0,
      onScroll: handleScroll,
      onKeyDown: handleKeyDown,
      ...overrides,
    }),
    [handleKeyDown, handleScroll, label],
  );

  const getSlideProps = useCallback(
    (index: number, overrides?: Record<string, unknown>) => ({
      role: 'group',
      'aria-label': `Slide ${index + 1} of ${items.length}`,
      ...overrides,
    }),
    [items.length],
  );

  return {
    activeIndex,
    item: items[activeIndex],
    isFirst: activeIndex <= 0,
    isLast: activeIndex >= items.length - 1,
    next,
    prev,
    goTo,
    getViewportProps,
    getSlideProps,
  };
}
