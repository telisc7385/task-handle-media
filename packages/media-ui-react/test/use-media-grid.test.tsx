import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { useMediaGrid } from '../src/index.js';

interface Photo {
  id: number;
  src: string;
}

function GridHarness({
  items,
  onItemClick,
  hasMore = false,
  onLoadMore,
  label,
}: {
  items: Photo[];
  onItemClick?: (item: Photo, index: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  label?: string;
}) {
  const { getGridProps, getItemProps, getLoadMoreProps } = useMediaGrid<Photo>({
    items,
    onItemClick,
    hasMore,
    onLoadMore,
    label,
  });

  return (
    <div {...getGridProps()}>
      {items.map((item, index) => (
        <div key={item.id} {...getItemProps(item, index)}>
          {item.src}
        </div>
      ))}
      <div {...getLoadMoreProps()} data-testid="sentinel" />
    </div>
  );
}

const ITEMS: Photo[] = [
  { id: 1, src: 'a' },
  { id: 2, src: 'b' },
];

describe('useMediaGrid', () => {
  let originalObserver: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    originalObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(private cb: IntersectionObserverCallback) {}
      observe() {
        this.cb(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    };
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalObserver;
  });

  it('renders grid and item props with ARIA semantics', () => {
    const onItemClick = vi.fn();
    render(<GridHarness items={ITEMS} onItemClick={onItemClick} label="Gallery" />);

    const grid = screen.getByRole('grid');
    expect(grid.getAttribute('aria-label')).toBe('Gallery');

    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(2);
    expect(cells[0]!.getAttribute('aria-posinset')).toBe('1');
    expect(cells[1]!.getAttribute('aria-posinset')).toBe('2');
    expect(cells[0]!.getAttribute('tabindex')).toBe('0');
  });

  it('calls onItemClick on click and on Enter/Space', () => {
    const onItemClick = vi.fn();
    render(<GridHarness items={ITEMS} onItemClick={onItemClick} />);

    fireEvent.click(screen.getAllByRole('gridcell')[1]!);
    expect(onItemClick).toHaveBeenCalledWith(ITEMS[1], 1);

    fireEvent.keyDown(screen.getAllByRole('gridcell')[0]!, { key: 'Enter' });
    expect(onItemClick).toHaveBeenCalledWith(ITEMS[0], 0);

    fireEvent.keyDown(screen.getAllByRole('gridcell')[0]!, { key: ' ' });
    expect(onItemClick).toHaveBeenLastCalledWith(ITEMS[0], 0);
  });

  it('calls onLoadMore when the sentinel intersects while hasMore is true', () => {
    const onLoadMore = vi.fn();
    render(<GridHarness items={ITEMS} hasMore onLoadMore={onLoadMore} />);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call onLoadMore when hasMore is false', () => {
    const onLoadMore = vi.fn();
    render(<GridHarness items={ITEMS} onLoadMore={onLoadMore} />);
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
