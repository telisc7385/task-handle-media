import { useState, type FormEvent, type HTMLAttributes } from 'react';
import {
  useMediaSearch,
  type MediaItem,
  type PexelsError,
  type PexelsPhoto,
} from '@headless-media/react';
import { useMediaGrid, useMediaLightbox } from '@headless-media/ui-react';

interface PhotoExplorerProps {
  onView: (item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
}

const INITIAL_QUERY = 'nature';

export function PhotoExplorer({ onView, onDownload }: PhotoExplorerProps) {
  const [input, setInput] = useState(INITIAL_QUERY);

  const { items, isLoading, isLoadingMore, hasMore, error, totalResults, search, loadMore } =
    useMediaSearch({ kind: 'photo', defaultQuery: INITIAL_QUERY, perPage: 30 });

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isOpen = lightboxIndex !== null;

  const { getGridProps, getItemProps, getLoadMoreProps, loadMore: gridLoadMore } = useMediaGrid({
    items,
    hasMore,
    isLoadingMore,
    onLoadMore: loadMore,
    onItemClick: (item, index) => {
      setLightboxIndex(index);
      onView(item);
    },
  });

  const lightbox = useMediaLightbox({
    items,
    index: lightboxIndex ?? 0,
    onIndexChange: setLightboxIndex,
    onClose: () => setLightboxIndex(null),
    isOpen,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void search(input);
  };

  const current = lightbox.item;

  return (
    <section className="explorer">
      <form className="search" onSubmit={handleSubmit}>
        <label htmlFor="photo-query">Search photos</label>
        <div className="search-row">
          <input
            id="photo-query"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. mountains, night sky…"
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
          {totalResults.toLocaleString()} results · page load more enabled
        </p>
      ) : null}

      {isLoading ? <p className="status">Loading photos…</p> : null}

      <div {...getGridProps({ className: 'grid' })}>
        {items.map((item, index) => (
          <button
            key={item.id}
            className="grid-cell"
            title={item.title ?? undefined}
            {...getItemProps(item, index)}
          >
            <img src={item.src} alt={item.title ?? `Photo ${item.id}`} loading="lazy" />
            <span className="grid-cell-footer">
              {item.photographer}
              {item.kind === 'video' ? ' · video' : ''}
            </span>
          </button>
        ))}
        <div
          {...(getLoadMoreProps({ className: 'sentinel' }) as HTMLAttributes<HTMLDivElement>)}
        />
      </div>

      {hasMore && !isLoadingMore ? (
        <button className="load-more" onClick={gridLoadMore}>
          Load more
        </button>
      ) : null}
      {isLoadingMore ? <p className="status">Loading more…</p> : null}

      {isOpen && current ? (
        <div {...lightbox.getOverlayProps({ className: 'overlay' })}>
          <figure className="lightbox-content">
            <img
              src={current.kind === 'photo' ? (current.raw as PexelsPhoto).src.large : current.src}
              alt={current.title ?? `Photo ${current.id}`}
            />
            <figcaption>
              {current.title ?? `Photo ${current.id}`} by {current.photographer}
            </figcaption>
          </figure>

          <button {...lightbox.getCloseButtonProps({ className: 'lightbox-btn close' })} aria-label="Close">
            ✕
          </button>
          <button {...lightbox.getPrevButtonProps({ className: 'lightbox-btn prev' })}>‹</button>
          <button {...lightbox.getNextButtonProps({ className: 'lightbox-btn next' })}>›</button>

          <div className="lightbox-actions">
            <a href={current.url} target="_blank" rel="noreferrer">
              View on Pexels
            </a>
            <button onClick={() => onDownload(current)}>Download</button>
          </div>
        </div>
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
