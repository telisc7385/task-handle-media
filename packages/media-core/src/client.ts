/**
 * Pexels API client.
 *
 * Framework-independent: no React, no DOM. The transport is injected
 * (`fetch` defaults to the global), so it runs in browsers, Node 18+, and
 * React Native environments alike.
 */

import { TtlCache, InFlight, type CacheStore } from './cache.js';
import { PexelsClientError, errorFromStatus } from './errors.js';
import { EventEmitter, type MediaEvent } from './events.js';
import {
  type MediaItem,
  type PexelsPagination,
  type PexelsPhoto,
  type PexelsPhotoResponse,
  type PexelsVideo,
  type PexelsVideoResponse,
  type PhotoSearchOptions,
  type VideoSearchOptions,
} from './types.js';

export type { MediaEvent } from './events.js';
export type { CacheStore } from './cache.js';

/**
 * Minimal fetch-compatible transport. Keeps `media-core` free of DOM types so
 * it compiles against lib `ES2020` only.
 */
export interface FetchLike {
  (
    input: string,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
  }>;
}

export interface ClientConfig {
  /** Pexels API key. Required. */
  apiKey: string;
  /** API base URL. Overridable for tests/proxies. */
  baseUrl?: string;
  /** Injectable fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: FetchLike;
  /** Cache TTL in ms. Defaults to 5 minutes. Pass `false` to disable caching. */
  cacheTtlMs?: number | false;
  /** Custom cache store. Defaults to a `TtlCache`. */
  cache?: CacheStore<unknown> | null;
  /** Emit a console.log for every `view`/`download` event. Defaults to `true`. */
  logEvents?: boolean;
  /** Shared emitter. Defaults to a per-client emitter. */
  emitter?: EventEmitter<MediaEvent>;
}

const DEFAULT_BASE_URL = 'https://api.pexels.com/v1';

export class PexelsClient {
  readonly events: EventEmitter<MediaEvent>;

  private readonly config: Required<Pick<ClientConfig, 'apiKey' | 'baseUrl'>> & {
    logEvents: boolean;
  };
  private readonly fetchImpl: FetchLike;
  private readonly cache: CacheStore<unknown> | null;
  private readonly inFlight = new InFlight();

  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new PexelsClientError('A Pexels API key is required. Pass `{ apiKey }` to createClient().');
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ''),
      logEvents: config.logEvents ?? true,
    };
    this.fetchImpl = config.fetch ?? ((globalThis as { fetch?: FetchLike }).fetch as FetchLike);
    if (!this.fetchImpl) {
      throw new PexelsClientError(
        'No global `fetch` available. Pass `{ fetch }` to createClient() or run in Node 18+/browser.',
      );
    }
    this.cache = config.cache ?? (config.cacheTtlMs === false ? null : new TtlCache({ ttlMs: config.cacheTtlMs }));
    this.events = config.emitter ?? new EventEmitter<MediaEvent>();

    if (this.config.logEvents) {
      this.events.subscribe((event) => {
        console.log(
          `[media-core] ${event.type} ${event.media.kind} ${event.media.id} ${event.media.url}`,
        );
      });
    }
  }

  // ------------------------------------------------------------------ photos

  search(options: PhotoSearchOptions = {}): Promise<PexelsPhotoResponse> {
    return this.requestList<PexelsPhotoResponse, PhotoSearchOptions>('search', options);
  }

  curated(options: PhotoSearchOptions = {}): Promise<PexelsPhotoResponse> {
    return this.requestList<PexelsPhotoResponse, PhotoSearchOptions>('curated', options);
  }

  photo(id: number | string): Promise<PexelsPhoto> {
    return this.request(`photos/${id}`, {}, { cache: true });
  }

  // ------------------------------------------------------------------ videos

  searchVideos(options: VideoSearchOptions = {}): Promise<PexelsVideoResponse> {
    return this.requestList<PexelsVideoResponse, VideoSearchOptions>('videos/search', options);
  }

  video(id: number | string): Promise<PexelsVideo> {
    return this.request(`videos/${id}`, {}, { cache: true });
  }

  // ------------------------------------------------------------------ events

  /** Emits a `view` event. Purely client-side analytics hook. */
  trackView(media: Pick<MediaItem, 'id' | 'kind' | 'url' | 'src'>): void {
    this.events.emit({
      type: 'view',
      media: { id: media.id, kind: media.kind, url: media.url, src: media.src },
      timestamp: Date.now(),
    });
  }

  /** Emits a `download` event. Purely client-side analytics hook. */
  trackDownload(media: Pick<MediaItem, 'id' | 'kind' | 'url' | 'src'>): void {
    this.events.emit({
      type: 'download',
      media: { id: media.id, kind: media.kind, url: media.url, src: media.src },
      timestamp: Date.now(),
    });
  }

  clearCache(): void {
    this.cache?.clear();
    this.inFlight.clear();
  }

  // --------------------------------------------------------------- internals

  private requestList<ResponseType extends PexelsPagination, Options>(
    path: string,
    options: Options,
  ): Promise<ResponseType> {
    return this.request<ResponseType>(path, options as Record<string, unknown>, { cache: true });
  }

  private async request<ResponseType>(
    path: string,
    params: Record<string, unknown>,
    opts: { cache: boolean },
  ): Promise<ResponseType> {
    const query = buildQuery(params);
    const url = `${this.config.baseUrl}/${path}${query}`;
    const cacheKey = `${path}${query}`;

    if (opts.cache) {
      const cached = this.cache?.get(cacheKey) as ResponseType | undefined;
      if (cached !== undefined) return cached;
    }

    return this.inFlight.run(cacheKey, async () => {
      const data = await this.rawRequest<ResponseType>(url);
      if (opts.cache) this.cache?.set(cacheKey, data);
      return data;
    });
  }

  private async rawRequest<ResponseType>(url: string): Promise<ResponseType> {
    let response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { Authorization: this.config.apiKey },
      });
    } catch (cause) {
      throw new PexelsClientError(`Network error while calling Pexels: ${url}`, { url, cause });
    }

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw errorFromStatus(response.status, url, detail);
    }

    const json = await response.json();
    return json as ResponseType;
  }
}

async function readErrorDetail(response: {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: string };
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // Non-JSON error body; fall through to the default message.
  }
  return undefined;
}

function buildQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function createClient(config: ClientConfig): PexelsClient {
  return new PexelsClient(config);
}
