import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useMediaReel } from '../src/index.js';

function ReelHarness({
  items,
  onIndexChange,
}: {
  items: string[];
  onIndexChange?: (index: number) => void;
}) {
  const { activeIndex, item, getViewportProps, getSlideProps, next, prev } =
    useMediaReel<string>({ items, onIndexChange, itemHeight: 200, label: 'Reel' });

  const viewportProps = getViewportProps();

  return (
    <div>
      <div data-testid="viewport" {...viewportProps}>
        {items.map((slide, index) => (
          <div key={index} {...getSlideProps(index)}>
            {slide}
          </div>
        ))}
      </div>
      <button onClick={next}>next</button>
      <button onClick={prev}>prev</button>
      <button
        data-testid="scroll"
        onClick={() =>
          viewportProps.onScroll?.({
            currentTarget: { scrollTop: 400, clientHeight: 200 },
          })
        }
      >
        scroll
      </button>
      <span data-testid="active">{activeIndex}:{item}</span>
    </div>
  );
}

describe('useMediaReel', () => {
  it('detects the active slide from the scroll position', () => {
    const onIndexChange = vi.fn();
    render(<ReelHarness items={['a', 'b', 'c', 'd']} onIndexChange={onIndexChange} />);

    fireEvent.click(screen.getByTestId('scroll'));

    expect(onIndexChange).toHaveBeenCalledWith(2);
    expect(screen.getByTestId('active').textContent).toBe('2:c');
  });

  it('pages with next/prev and exposes the active item', () => {
    render(<ReelHarness items={['a', 'b', 'c']} />);

    fireEvent.click(screen.getByText('next'));
    expect(screen.getByTestId('active').textContent).toBe('1:b');

    fireEvent.click(screen.getByText('prev'));
    expect(screen.getByTestId('active').textContent).toBe('0:a');
  });

  it('pages with ArrowDown/ArrowUp keys on the viewport', () => {
    render(<ReelHarness items={['a', 'b', 'c']} />);

    const viewport = screen.getByTestId('viewport');
    fireEvent.keyDown(viewport, { key: 'ArrowDown' });
    expect(screen.getByTestId('active').textContent).toBe('1:b');
    fireEvent.keyDown(viewport, { key: 'ArrowUp' });
    expect(screen.getByTestId('active').textContent).toBe('0:a');
  });

  it('labels slides relative to the total', () => {
    render(<ReelHarness items={['a', 'b', 'c']} />);
    const slides = screen.getAllByRole('group');
    expect(slides).toHaveLength(3);
    expect(slides[0]!.getAttribute('aria-label')).toBe('Slide 1 of 3');
  });
});
