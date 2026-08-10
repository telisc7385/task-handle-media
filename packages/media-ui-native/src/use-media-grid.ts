import { useCallback, useRef } from 'react';

export interface UseMediaGridOptions<T> {
  items: readonly T[];
  onItemClick?: (item: T, index: number) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  label?: string;
}

export interface UseMediaGridReturn<T> {
  /** Props for the grid container (e.g. a `View`). */
  getGridProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for one cell (e.g. a `Pressable`). */
  getItemProps: (
    item: T,
    index: number,
    overrides?: Record<string, unknown>,
  ) => Record<string, unknown>;
  /**
   * Props for a scrollable list (e.g. a `FlatList`): fires `loadMore` when the
   * end is reached. Safe to call repeatedly.
   */
  getLoadMoreProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  loadMore: () => void;
}

/**
 * Headless grid for React Native. No `react-native` imports — consumers spread
 * the prop-getters onto their own `View`/`Pressable`/`FlatList`.
 */
export function useMediaGrid<T>(options: UseMediaGridOptions<T>): UseMediaGridReturn<T> {
  const {
    items,
    onItemClick,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    label = 'Media grid',
  } = options;

  const callbacksRef = useRef({ onItemClick, onLoadMore });
  callbacksRef.current = { onItemClick, onLoadMore };

  const stateRef = useRef({ hasMore, isLoadingMore });
  stateRef.current = { hasMore, isLoadingMore };

  const loadMore = useCallback(() => {
    const state = stateRef.current;
    if (!state.hasMore || state.isLoadingMore) return;
    callbacksRef.current.onLoadMore?.();
  }, []);

  const getGridProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      accessibilityRole: 'grid',
      accessibilityLabel: label,
      ...overrides,
    }),
    [label],
  );

  const getItemProps = useCallback(
    (item: T, index: number, overrides?: Record<string, unknown>) => ({
      accessibilityRole: 'gridcell',
      accessibilityLabel: `Item ${index + 1} of ${items.length}`,
      onPress: () => callbacksRef.current.onItemClick?.(item, index),
      ...overrides,
    }),
    [items.length],
  );

  const getLoadMoreProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      onEndReached: loadMore,
      onEndReachedThreshold: 0.5,
      ...overrides,
    }),
    [loadMore],
  );

  return { getGridProps, getItemProps, getLoadMoreProps, loadMore };
}
