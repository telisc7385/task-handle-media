/**
 * @headless-media/core
 * Framework-independent Pexels media SDK.
 *
 * No React, no React Native, no DOM. Works in browsers, Node 18+, and RN.
 */

export { PexelsClient, createClient } from './client.js';
export type { ClientConfig, FetchLike } from './client.js';
export { TtlCache, InFlight } from './cache.js';
export type { CacheStore, TtlCacheOptions } from './cache.js';
export {
  EventEmitter,
} from './events.js';
export type { MediaEvent, MediaEventType, MediaEventListener, Unsubscribe } from './events.js';
export {
  PexelsError,
  PexelsApiError,
  PexelsAuthenticationError,
  PexelsRateLimitError,
  PexelsNotFoundError,
  PexelsClientError,
  errorFromStatus,
} from './errors.js';
export {
  toMediaItem,
} from './types.js';
export type {
  MediaItem,
  MediaKind,
  PexelsPhoto,
  PexelsPhotoResponse,
  PexelsVideo,
  PexelsVideoResponse,
  PexelsVideoFile,
  PexelsPagination,
  PhotoSearchOptions,
  VideoSearchOptions,
  PhotoOrientation,
  VideoOrientation,
  PhotoSize,
} from './types.js';
