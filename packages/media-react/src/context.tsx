import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  createClient,
  PexelsClient,
  type CacheStore,
  type ClientConfig,
  type FetchLike,
} from '@headless-media/core';

export interface MediaProviderProps
  extends Pick<ClientConfig, 'apiKey' | 'baseUrl' | 'logEvents' | 'cacheTtlMs'> {
  cache?: CacheStore<unknown>;
  fetch?: FetchLike;
  children?: ReactNode;
}

const MediaContext = createContext<PexelsClient | null>(null);

/**
 * Creates a PexelsClient once and makes it available to every hook below.
 * This is the only place in the React world that constructs a client.
 */
export function MediaProvider({
  apiKey,
  baseUrl,
  logEvents,
  cacheTtlMs,
  cache,
  fetch,
  children,
}: MediaProviderProps) {
  const client = useMemo(
    () => createClient({ apiKey, baseUrl, logEvents, cacheTtlMs, cache, fetch }),
    [apiKey, baseUrl, logEvents, cacheTtlMs, cache, fetch],
  );

  return <MediaContext.Provider value={client}>{children}</MediaContext.Provider>;
}

export function useMediaClient(): PexelsClient {
  const client = useContext(MediaContext);
  if (!client) {
    throw new Error('useMediaClient must be used within a <MediaProvider>.');
  }
  return client;
}
