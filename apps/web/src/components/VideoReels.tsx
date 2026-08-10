import { useState, type FormEvent } from 'react';
import { useMediaSearch, type MediaItem, type PexelsError } from '@headless-media/react';
import { useMediaReel } from '@headless-media/ui-react';

interface VideoReelsProps {
  onView: (item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
}

const INITIAL_QUERY = 'drone';
const SLIDE_HEIGHT = 480;

export function VideoReels({ onView, onDownload }: VideoReelsProps) {
  const [input, setInput] = useState(INITIAL_QUERY);

  const { items, isLoading, hasMore, error, totalResults, search, loadMore } = useMediaSearch({
    kind: 'video',
    defaultQuery: INITIAL_QUERY,
    perPage: 20,
  });

  const reel = useMediaReel({
    items,
    itemHeight: SLIDE_HEIGHT,
    onIndexChange: (index) => {
      const item = items[index];
      if (item) onView(item);
    },
  });

  const current = reel.item;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void search(input);
  };

  return (
    <section className="explorer">
      <form className="search" onSubmit={handleSubmit}>
        <label htmlFor="video-query">Search videos</label>
        <div className="search-row">
          <input
            id="video-query"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. city, ocean waves…"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error ? (
        <p className="error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <p className="count">
          {totalResults.toLocaleString()} results · use arrow keys or buttons to page
        </p>
      ) : null}

      {isLoading ? <p className="status">Loading videos…</p> : null}

      {items.length > 0 ? (
        <>
          <div
            {...reel.getViewportProps({ className: 'reel-viewport' })}
            style={{ height: SLIDE_HEIGHT }}
          >
            {items.map((video, index) => (
              <div
                key={video.id}
                {...reel.getSlideProps(index, { className: 'reel-slide' })}
                style={{ height: SLIDE_HEIGHT }}
              >
                <video
                  src={video.videoSrc}
                  poster={video.src}
                  controls
                  playsInline
                  preload="none"
                />
              </div>
            ))}
          </div>

          <div className="reel-controls">
            <button onClick={reel.prev} disabled={reel.isFirst}>
              ↑ Previous
            </button>
            <span className="reel-position" role="status">
              Slide {reel.activeIndex + 1} of {items.length}
            </span>
            <button onClick={reel.next} disabled={reel.isLast}>
              Next ↓
            </button>
          </div>

          {current ? (
            <div className="reel-actions">
              <p>
                {current.title ?? `Video ${current.id}`} by {current.photographer}
              </p>
              <div>
                <a href={current.url} target="_blank" rel="noreferrer">
                  View on Pexels
                </a>
                <button onClick={() => onDownload(current)}>Download</button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {hasMore && !isLoading ? (
        <button className="load-more" onClick={() => void loadMore()}>
          Load more videos
        </button>
      ) : null}
    </section>
  );
}

function errorMessage(error: PexelsError): string {
  switch (error.name) {
    case 'PexelsAuthenticationError':
      return 'Invalid API key. Check VITE_PEXELS_API_KEY.';
    case 'PexelsRateLimitError':
      return 'Rate limit hit. Wait a moment and retry.';
    default:
      return error.message || 'Something went wrong.';
  }
}
