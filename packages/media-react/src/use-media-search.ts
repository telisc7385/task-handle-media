import { useCallback, useEffect, useRef, useState } from 'react';
import {
  toMediaItem,
  type MediaItem,
  type PexelsError,
} from '@headless-media/core';
import { useMediaClient } from './context.js';

export type MediaKind = 'photo' | 'video';

export interface UseMediaSearchOptions {
  kind?: MediaKind;
  /** Runs a search on mount when provided. */
  defaultQuery?: string;
  perPage?: number;
  orientation?: string;
  size?: string;
  locale?: string;
  /** Set to false to skip the initial automatic search. */
  enabled?: boolean;
}

export interface UseMediaSearchResult {
  items: MediaItem[];
  page: number;
  totalResults: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: PexelsError | null;
  query: string;
  /** Starts a new search (resets pagination). Pass a query to override the default. */
  search: (query?: string) => Promise<void>;
  /** Fetches the next page and appends it. No-op while loading or when there is none. */
  loadMore: () => Promise<void>;
  /** Clears results and error state. */
  reset: () => void;
}

/**
 * Thin React binding around `PexelsClient.search` / `searchVideos`.
 * Normalizes responses to `MediaItem[]` via the core's `toMediaItem`.
 */
export function useMediaSearch(options: UseMediaSearchOptions = {}): UseMediaSearchResult {
  const client = useMediaClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const requestId = useRef(0);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<PexelsError | null>(null);
  const [query, setQuery] = useState(options.defaultQuery ?? '');

  const latest = useRef({ hasMore, isLoading, isLoadingMore });
  latest.current = { hasMore, isLoading, isLoadingMore };

  const search = useCallback(
    async (nextQuery?: string) => {
      const {
        kind = 'photo',
        perPage = 20,
        orientation,
        size,
        locale,
      } = optionsRef.current;
      const q = nextQuery ?? optionsRef.current.defaultQuery ?? '';
      const id = ++requestId.current;

      setIsLoading(true);
      setError(null);

      try {
        const response =
          kind === 'video'
            ? await client.searchVideos({
                query: q || undefined,
                page: 1,
                per_page: perPage,
                orientation: orientation as never,
                size: size as never,
                locale,
              })
            : await client.search({
                query: q || undefined,
                page: 1,
                per_page: perPage,
                orientation: orientation as never,
                size: size as never,
                locale,
              });

        if (id !== requestId.current) return;
        const nextItems =
          'videos' in response
            ? response.videos.map((video) => toMediaItem(video))
            : response.photos.map((photo) => toMediaItem(photo));

        setQuery(q);
        setItems(nextItems);
        setPage(response.page);
        setTotalResults(response.total_results);
        setHasMore(response.next_page !== null);
      } catch (e) {
        if (id !== requestId.current) return;
        setError(e as PexelsError);
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [client],
  );

  const loadMore = useCallback(async () => {
    const current = latest.current;
    if (current.isLoading || current.isLoadingMore || !current.hasMore) return;

    const {
      kind = 'photo',
      perPage = 20,
      orientation,
      size,
      locale,
    } = optionsRef.current;
    const id = requestId.current;
    const nextPage = page + 1;

    setIsLoadingMore(true);
    try {
      const response =
        kind === 'video'
          ? await client.searchVideos({
              query: query || undefined,
              page: nextPage,
              per_page: perPage,
              orientation: orientation as never,
              size: size as never,
              locale,
            })
          : await client.search({
              query: query || undefined,
              page: nextPage,
              per_page: perPage,
              orientation: orientation as never,
              size: size as never,
              locale,
            });

      if (id !== requestId.current) return;
      const nextItems =
        'videos' in response
          ? response.videos.map((video) => toMediaItem(video))
          : response.photos.map((photo) => toMediaItem(photo));

      setPage(response.page);
      setHasMore(response.next_page !== null);
      setItems((prev) => [...prev, ...nextItems]);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e as PexelsError);
    } finally {
      if (id === requestId.current) setIsLoadingMore(false);
    }
  }, [client, page, query]);

  const reset = useCallback(() => {
    requestId.current += 1;
    setItems([]);
    setPage(1);
    setTotalResults(0);
    setHasMore(false);
    setIsLoading(false);
    setIsLoadingMore(false);
    setError(null);
  }, []);

  useEffect(() => {
    const { enabled, defaultQuery } = optionsRef.current;
    if (enabled !== false && defaultQuery) {
      void search();
    }
  }, [search]);

  return {
    items,
    page,
    totalResults,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    query,
    search,
    loadMore,
    reset,
  };
}
