import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createClient, PexelsAuthenticationError, PexelsRateLimitError } from '../src/index.js';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

const photoPage = {
  page: 1,
  per_page: 1,
  total_results: 1,
  next_page: 'https://api.pexels.com/v1/search?page=2',
  prev_page: null,
  photos: [
    {
      id: 123,
      width: 800,
      height: 600,
      url: 'https://pexels.com/photo/123',
      photographer: 'Jane',
      photographer_url: 'https://pexels.com/u/jane',
      photographer_id: 9,
      avg_color: '#abcdef',
      src: {
        original: 'o.jpg',
        large2x: 'l2x.jpg',
        large: 'l.jpg',
        medium: 'm.jpg',
        small: 's.jpg',
        portrait: 'p.jpg',
        landscape: 'x.jpg',
        tiny: 't.jpg',
      },
      liked: false,
      alt: 'A cat',
    },
  ],
};

const videoPage = {
  page: 1,
  per_page: 1,
  total_results: 1,
  next_page: null,
  prev_page: null,
  videos: [
    {
      id: 7,
      width: 1920,
      height: 1080,
      url: 'https://pexels.com/video/7',
      image: 'poster.jpg',
      duration: 12,
      user: { id: 1, name: 'Bob', url: 'https://pexels.com/u/bob' },
      video_files: [{ id: 1, quality: 'hd', file_type: 'video/mp4', width: 1920, height: 1080, link: 'clip.mp4', fps: 30 }],
      video_pictures: [{ id: 1, picture: 'poster.jpg', nr: 0 }],
    },
  ],
};

describe('PexelsClient', () => {
  let calls: { url: string; init?: { headers?: Record<string, string> } }[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    calls = [];
    fetchMock = vi.fn((url: string, init?: { headers?: Record<string, string> }) => {
      calls.push({ url, init });
      if (url.includes('videos/search')) return Promise.resolve(jsonResponse(200, videoPage));
      if (url.includes('videos/')) return Promise.resolve(jsonResponse(200, videoPage.videos[0]));
      if (url.includes('photos/')) return Promise.resolve(jsonResponse(200, photoPage.photos[0]));
      return Promise.resolve(jsonResponse(200, photoPage));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeClient() {
    return createClient({ apiKey: 'test-key', fetch: fetchMock as never, logEvents: false });
  }

  it('binds the global fetch so browser window.fetch never throws Illegal invocation', async () => {
    const original = (globalThis as { fetch?: unknown }).fetch;
    const strictFetch = function (this: unknown, _url: string) {
      'use strict';
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }
      return Promise.resolve(jsonResponse(200, photoPage));
    } as never;
    (globalThis as { fetch?: unknown }).fetch = strictFetch;
    try {
      const client = createClient({ apiKey: 'test-key', logEvents: false });
      const data = await client.search();
      expect(data.page).toBe(1);
    } finally {
      (globalThis as { fetch?: unknown }).fetch = original;
    }
  });

  it('sends the API key as the Authorization header', async () => {
    const client = makeClient();
    await client.search({ query: 'cats', page: 2 });
    expect(calls[0]?.init?.headers?.Authorization).toBe('test-key');
  });

  it('builds the correct search URL', async () => {
    const client = makeClient();
    await client.search({ query: 'cats', page: 2, per_page: 5, orientation: 'landscape' });
    const url = calls[0]?.url ?? '';
    expect(url).toContain('/search?');
    expect(url).toContain('query=cats');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=5');
    expect(url).toContain('orientation=landscape');
  });

  it('supports curated, single photo, video search and single video', async () => {
    const client = makeClient();
    const curated = await client.curated({ per_page: 10 });
    expect(curated.photos).toHaveLength(1);

    const photo = await client.photo(123);
    expect(photo.id).toBe(123);

    const videos = await client.searchVideos({ query: 'drone', per_page: 5 });
    expect(videos.videos).toHaveLength(1);

    const video = await client.video(7);
    expect(video.id).toBe(7);
  });

  it('caches responses: second identical call does not hit the network', async () => {
    const client = makeClient();
    const first = await client.search({ query: 'cats' });
    const second = await client.search({ query: 'cats' });
    expect(first).toEqual(second);
    expect(calls).toHaveLength(1);
  });

  it('deduplicates concurrent identical requests into a single fetch', async () => {
    const client = makeClient();
    const [a, b, c] = await Promise.all([
      client.search({ query: 'dogs' }),
      client.search({ query: 'dogs' }),
      client.search({ query: 'dogs' }),
    ]);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
    expect(calls).toHaveLength(1);
  });

  it('maps a 401 to PexelsAuthenticationError', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'invalid key' }));
    const client = makeClient();
    await expect(client.search({ query: 'x' })).rejects.toBeInstanceOf(PexelsAuthenticationError);
  });

  it('maps a 429 to PexelsRateLimitError', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, { error: 'too many' }));
    const client = makeClient();
    await expect(client.search({ query: 'x' })).rejects.toBeInstanceOf(PexelsRateLimitError);
  });

  it('throws a typed error on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('socket hang up'));
    const client = makeClient();
    await expect(client.search({ query: 'x' })).rejects.toThrow('Network error');
  });

  it('throws when created without an API key', () => {
    expect(() => createClient({ apiKey: '', logEvents: false })).toThrow(/API key/);
  });
});

describe('events', () => {
  it('emits view and download events with media payloads', () => {
    const client = createClient({ apiKey: 'k', logEvents: false });
    const seen: string[] = [];
    const unsubscribe = client.events.subscribe((e) => seen.push(`${e.type}:${e.media.id}`));

    client.trackView({ id: '1', kind: 'photo', url: 'u', src: 's' });
    client.trackDownload({ id: '2', kind: 'video', url: 'u', src: 's' });

    expect(seen).toEqual(['view:1', 'download:2']);
    unsubscribe();
    client.trackView({ id: '3', kind: 'photo', url: 'u', src: 's' });
    expect(seen).toEqual(['view:1', 'download:2']);
  });

  it('logs to console by default', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const client = createClient({ apiKey: 'k' });
    client.trackView({ id: '1', kind: 'photo', url: 'https://x', src: 's' });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[media-core] view'));
    log.mockRestore();
  });
});
