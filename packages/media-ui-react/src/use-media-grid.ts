import { useEffect, useRef, useCallback, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';

export interface UseMediaGridOptions<T> {
  items: readonly T[];
  onItemClick?: (item: T, index: number) => void;
  /** Whether more pages are available. Defaults to false. */
  hasMore?: boolean;
  /** Whether a load-more request is currently running. Defaults to false. */
  isLoadingMore?: boolean;
  /** Called when the sentinel becomes visible or a manual load is triggered. */
  onLoadMore?: () => void;
  /** `aria-label` for the grid region. */
  label?: string;
  /** Number of columns, used only for `aria-setsize` semantics. */
  columns?: number;
}

export interface MediaGridItemProps {
  role: 'gridcell';
  tabIndex: number;
  'aria-posinset': number;
  'aria-setsize': number;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface MediaGridLoadMoreProps {
  ref: RefObject<HTMLElement | null>;
  'aria-hidden': true;
}

export interface UseMediaGridReturn<T> {
  /** Props for the `role="grid"` container element. */
  getGridProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for one `role="gridcell"` element. */
  getItemProps: (
    item: T,
    index: number,
    overrides?: Record<string, unknown>,
  ) => MediaGridItemProps & Record<string, unknown>;
  /**
   * Props for a sentinel element placed after the last item. When it scrolls
   * into view and `hasMore` is true, `onLoadMore` fires (infinite scroll).
   * Returns `null` when the environment has no IntersectionObserver.
   */
  getLoadMoreProps: (overrides?: Record<string, unknown>) => MediaGridLoadMoreProps;
  /** Manually trigger the next page. Safe to call repeatedly. */
  loadMore: () => void;
}

/**
 * Headless grid with infinite scrolling. Returns spreadable prop-getters;
 * the consumer owns all markup and styles.
 */
export function useMediaGrid<T>(options: UseMediaGridOptions<T>): UseMediaGridReturn<T> {
  const {
    items,
    onItemClick,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    label = 'Media grid',
    columns = 3,
  } = options;

  const callbacksRef = useRef({ onItemClick, onLoadMore });
  callbacksRef.current = { onItemClick, onLoadMore };

  const stateRef = useRef({ hasMore, isLoadingMore });
  stateRef.current = { hasMore, isLoadingMore };

  const sentinelRef = useRef<HTMLElement | null>(null);

  const loadMore = useCallback(() => {
    const { hasMore, isLoadingMore } = stateRef.current;
    if (!hasMore || isLoadingMore) return;
    callbacksRef.current.onLoadMore?.();
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const getGridProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      role: 'grid',
      'aria-label': label,
      ...overrides,
    }),
    [label],
  );

  const getItemProps = useCallback(
    (item: T, index: number, overrides?: Record<string, unknown>) => {
      const userOnClick = overrides?.onClick as
        | ((event: MouseEvent<HTMLElement>) => void)
        | undefined;
      const userOnKeyDown = overrides?.onKeyDown as
        | ((event: KeyboardEvent<HTMLElement>) => void)
        | undefined;

      const handleClick = (event: MouseEvent<HTMLElement>) => {
        userOnClick?.(event);
        callbacksRef.current.onItemClick?.(item, index);
      };
      const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        userOnKeyDown?.(event);
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          callbacksRef.current.onItemClick?.(item, index);
        }
      };

      return {
        role: 'gridcell',
        tabIndex: 0,
        'aria-posinset': index + 1,
        'aria-setsize': Math.max(items.length, columns),
        ...overrides,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
      } as MediaGridItemProps & Record<string, unknown>;
    },
    [columns, items.length],
  );

  const getLoadMoreProps = useCallback(
    (overrides?: Record<string, unknown>) =>
      ({
        ref: sentinelRef,
        'aria-hidden': true,
        ...overrides,
      }) as MediaGridLoadMoreProps,
    [],
  );

  return { getGridProps, getItemProps, getLoadMoreProps, loadMore };
}
