import { useCallback, useRef, useState } from 'react';

/** Minimal scroll-event shape shared by RN scrollables. */
export interface ReelScrollEvent {
  nativeEvent: {
    contentOffset: { y: number };
  };
}

export interface UseMediaReelOptions<T> {
  items: readonly T[];
  /** Controlled active index. Leave undefined for uncontrolled mode. */
  activeIndex?: number;
  defaultActiveIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Height of one slide in px. Required for paging and detection. */
  itemHeight: number;
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
   * Props for the vertical `ScrollView`: detects the active slide on scroll /
   * momentum end and enables snap paging.
   */
  getViewportProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for one slide element. */
  getSlideProps: (index: number, overrides?: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Headless vertical reel/swiper for React Native. Detects the active slide from
 * `nativeEvent.contentOffset.y` and exposes snap-paging props. Consumers own
 * the `ScrollView`, its style, and the slide markup.
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

  const [internalActive, setInternalActive] = useState(controlledActive ?? defaultActiveIndex);
  const activeIndex = isControlled ? (controlledActive as number) : internalActive;

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

  const readIndex = useCallback(
    (offsetY: number) => {
      const height = optionsRef.current.itemHeight;
      if (!height || height <= 0) return;
      const raw = offsetY / height;
      const index = Math.min(Math.max(Math.round(raw), 0), Math.max(items.length - 1, 0));
      commit(index);
    },
    [items.length, commit],
  );

  const handleScroll = useCallback(
    (event: ReelScrollEvent) => {
      readIndex(event.nativeEvent.contentOffset.y);
    },
    [readIndex],
  );

  const getViewportProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      accessibilityRole: 'region',
      accessibilityLabel: label,
      onScroll: handleScroll,
      scrollEventThrottle: 16,
      snapToInterval: itemHeight,
      decelerationRate: 'fast',
      ...overrides,
    }),
    [handleScroll, itemHeight, label],
  );

  const getSlideProps = useCallback(
    (index: number, overrides?: Record<string, unknown>) => ({
      accessibilityRole: 'group',
      accessibilityLabel: `Slide ${index + 1} of ${items.length}`,
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
