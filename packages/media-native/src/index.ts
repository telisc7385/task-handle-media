export { MediaProvider, useMediaClient } from './context.js';
export type { MediaProviderProps } from './context.js';
export { useMediaSearch } from './use-media-search.js';
export type {
  UseMediaSearchOptions,
  UseMediaSearchResult,
  MediaKind,
} from './use-media-search.js';
export { useMediaEvents } from './use-media-events.js';
export type {
  UseMediaEventsOptions,
  UseMediaEventsResult,
  TrackableMedia,
} from './use-media-events.js';

export { toMediaItem } from '@headless-media/core';
export type {
  MediaItem,
  MediaEvent,
  PexelsError,
  PexelsPhoto,
  PexelsPhotoResponse,
  PexelsVideo,
  PexelsVideoResponse,
  FetchLike,
  CacheStore,
} from '@headless-media/core';
