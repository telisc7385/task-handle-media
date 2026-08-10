import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { useMediaLightbox } from '../src/index.js';

function LightboxHarness({ items }: { items: string[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);

  const {
    item,
    isFirst,
    isLast,
    getOverlayProps,
    getCloseButtonProps,
    getPrevButtonProps,
    getNextButtonProps,
  } = useMediaLightbox({
    items,
    index,
    onIndexChange: setIndex,
    onClose: () => setOpen(false),
    isOpen: open,
    label: 'Lightbox',
  });

  return (
    <div data-testid="overlay" {...getOverlayProps()}>
      <div data-testid="dialog-content">{item}</div>
      <button {...getPrevButtonProps()}>prev</button>
      <button {...getNextButtonProps()}>next</button>
      <button {...getCloseButtonProps()}>close</button>
      <span data-testid="flags">
        {String(isFirst)}:{String(isLast)}:{String(open)}
      </span>
    </div>
  );
}

describe('useMediaLightbox', () => {
  it('exposes the current item and paging flags', () => {
    render(<LightboxHarness items={['one', 'two', 'three']} />);
    expect(screen.getByTestId('dialog-content').textContent).toBe('one');
    expect(screen.getByTestId('flags').textContent).toBe('true:false:true');
  });

  it('navigates with next/prev buttons and disables them at the edges', () => {
    render(<LightboxHarness items={['one', 'two', 'three']} />);

    const prev = screen.getByText('prev');
    const next = screen.getByText('next');
    expect(prev.hasAttribute('disabled')).toBe(true);

    fireEvent.click(next);
    expect(screen.getByTestId('dialog-content').textContent).toBe('two');
    expect(prev.hasAttribute('disabled')).toBe(false);
    expect(next.hasAttribute('disabled')).toBe(false);

    fireEvent.click(next);
    expect(screen.getByTestId('dialog-content').textContent).toBe('three');
    expect(next.hasAttribute('disabled')).toBe(true);
  });

  it('closes via the close button', () => {
    render(<LightboxHarness items={['one', 'two', 'three']} />);
    fireEvent.click(screen.getByText('close'));
    expect(screen.getByTestId('flags').textContent).toContain('false');
  });

  it('handles ArrowRight and Escape keys while open', () => {
    render(<LightboxHarness items={['one', 'two', 'three']} />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('dialog-content').textContent).toBe('two');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('flags').textContent).toContain('false');
  });

  it('closes only when the backdrop (not the dialog) is clicked', () => {
    render(<LightboxHarness items={['one', 'two', 'three']} />);
    fireEvent.click(screen.getByTestId('dialog-content'));
    expect(screen.getByTestId('flags').textContent).toContain('true');
    fireEvent.click(screen.getByTestId('overlay'));
    expect(screen.getByTestId('flags').textContent).toContain('false');
  });
});
