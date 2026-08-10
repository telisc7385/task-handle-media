/**
 * Shared types for the Pexels API. These mirror the Pexels REST shapes.
 * They are plain data types with no dependency on any framework.
 */

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string | null;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string | null;
}

export interface PexelsVideoFile {
  id: number;
  quality: 'hd' | 'sd' | 'hls' | 'uhd';
  file_type: string;
  width: number | null;
  height: number | null;
  link: string;
  fps: number | null;
}

export interface PexelsVideoPicture {
  id: number;
  picture: string;
  nr: number;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPicture[];
}

export interface PexelsPagination {
  page: number;
  per_page: number;
  total_results: number;
  next_page: string | null;
  prev_page: string | null;
}

export interface PexelsPhotoResponse extends PexelsPagination {
  photos: PexelsPhoto[];
}

export interface PexelsVideoResponse extends PexelsPagination {
  videos: PexelsVideo[];
}

export type PhotoOrientation = 'landscape' | 'portrait' | 'square';
export type VideoOrientation = 'landscape' | 'portrait';
export type PhotoSize = 'large' | 'medium' | 'small';

export interface PhotoSearchOptions {
  query?: string;
  page?: number;
  per_page?: number;
  orientation?: PhotoOrientation;
  size?: PhotoSize;
  color?: string;
  locale?: string;
}

export interface VideoSearchOptions {
  query?: string;
  page?: number;
  per_page?: number;
  orientation?: VideoOrientation;
  size?: 'large' | 'medium' | 'small';
  locale?: string;
}

export type MediaKind = 'photo' | 'video';

/**
 * A normalized, framework-agnostic media item that is easy to render anywhere
 * (web, native, plain Node). This is what event payloads carry.
 */
export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string | null;
  /** Canonical Pexels page URL. */
  url: string;
  /** Display source: photo image or a video preview frame. */
  src: string;
  /** Video file URL, present only for videos. */
  videoSrc?: string;
  width: number;
  height: number;
  photographer: string;
  raw: PexelsPhoto | PexelsVideo;
}

export function toMediaItem(photo: PexelsPhoto): MediaItem;
export function toMediaItem(video: PexelsVideo): MediaItem;
export function toMediaItem(
  media: PexelsPhoto | PexelsVideo,
): MediaItem {
  if ('photos' in media || 'src' in media) {
    const photo = media as PexelsPhoto;
    return {
      id: String(photo.id),
      kind: 'photo',
      title: photo.alt,
      url: photo.url,
      src: photo.src.medium,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      raw: photo,
    };
  }
  const video = media as PexelsVideo;
  const bestFile =
    video.video_files.find((f) => f.quality === 'hd') ??
    video.video_files.find((f) => f.file_type === 'video/mp4') ??
    video.video_files[0];
  return {
    id: String(video.id),
    kind: 'video',
    title: null,
    url: video.url,
    src: video.image,
    videoSrc: bestFile?.link,
    width: video.width,
    height: video.height,
    photographer: video.user.name,
    raw: video,
  };
}
