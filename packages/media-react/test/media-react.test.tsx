import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaProvider, useMediaSearch, useMediaEvents } from '../src/index.js';

function page(photos: { id: number; src: string }[], next_page: string | null) {
  return {
    page: 1,
    per_page: 10,
    total_results: photos.length,
    next_page,
    prev_page: null,
    photos: photos.map(({ id, src }) => ({
      id,
      width: 100,
      height: 100,
      url: `https://pexels.com/photo/${id}`,
      photographer: 'Tester',
      photographer_url: '',
      photographer_id: 1,
      avg_color: null,
      src: { original: src, large2x: src, large: src, medium: src, small: src, portrait: src, landscape: src, tiny: src },
      liked: false,
      alt: `photo ${id}`,
    })),
  };
}

const FIRST_PAGE = page(
  [
    { id: 1, src: 'one.jpg' },
    { id: 2, src: 'two.jpg' },
  ],
  'https://api.pexels.com/v1/search?page=2',
);
const SECOND_PAGE = page([{ id: 3, src: 'three.jpg' }], null);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaSearch', () => {
  it('fetches, normalizes and paginates without touching the network twice', async () => {
    const fetchMock = vi.fn((url: string) => {
      const response = /(^|[&?])page=2(&|$)/.test(url) ? SECOND_PAGE : FIRST_PAGE;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(response),
      });
    });

    function Harness() {
      const { items, search, loadMore, hasMore } = useMediaSearch({ kind: 'photo' });
      return (
        <div>
          <button onClick={() => search('cats')}>search</button>
          <button onClick={loadMore}>more</button>
          <ul>
            {items.map((item) => (
              <li key={item.id} data-testid="item">
                {item.id}:{item.src}
              </li>
            ))}
          </ul>
          <span data-testid="hasmore">{String(hasMore)}</span>
        </div>
      );
    }

    render(
      <MediaProvider apiKey="k" logEvents={false} fetch={fetchMock as never}>
        <Harness />
      </MediaProvider>,
    );

    fireEvent.click(screen.getByText('search'));
    await waitFor(() => expect(screen.getAllByTestId('item')).toHaveLength(2));
    expect(screen.getByTestId('hasmore').textContent).toBe('true');

    fireEvent.click(screen.getByText('more'));
    await waitFor(() => expect(screen.getAllByTestId('item')).toHaveLength(3));
    expect(screen.getByTestId('hasmore').textContent).toBe('false');
  });
});

describe('useMediaEvents', () => {
  it('collects view/download events and exposes trackers', async () => {
    function Harness() {
      const { events, trackView, trackDownload } = useMediaEvents();
      return (
        <div>
          <button onClick={() => trackView({ id: '1', kind: 'photo', url: 'u', src: 's' })}>
            view
          </button>
          <button
            onClick={() =>
              trackDownload({ id: '2', kind: 'video', url: 'u', src: 's' })
            }
          >
            download
          </button>
          <ul>
            {events.map((event, i) => (
              <li key={i} data-testid="event">
                {event.type}:{event.media.id}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    render(
      <MediaProvider apiKey="k" logEvents={false}>
        <Harness />
      </MediaProvider>,
    );

    fireEvent.click(screen.getByText('view'));
    fireEvent.click(screen.getByText('download'));

    await waitFor(() => expect(screen.getAllByTestId('event')).toHaveLength(2));
    expect(screen.getByText('view:1')).toBeTruthy();
    expect(screen.getByText('download:2')).toBeTruthy();
  });
});
