import { useCallback, useEffect } from 'react';

export interface UseMediaLightboxOptions<T> {
  items: readonly T[];
  /** Index of the currently displayed item. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  isOpen: boolean;
  /** Wrap from first to last and vice versa. Defaults to false. */
  wrapAround?: boolean;
  /** Close when clicking the backdrop (not the dialog). Defaults to true. */
  closeOnBackdropClick?: boolean;
  /** Handle Escape / ArrowLeft / ArrowRight keys while open. Defaults to true. */
  enableKeyboard?: boolean;
  /** `aria-label` for the dialog. */
  label?: string;
}

export interface UseMediaLightboxReturn<T> {
  /** Currently displayed item. */
  item: T | undefined;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  /** Props for the full-screen overlay. Handles backdrop click + focus. */
  getOverlayProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for the close button. */
  getCloseButtonProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for the "previous" button. */
  getPrevButtonProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for the "next" button. */
  getNextButtonProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Headless lightbox with keyboard handling and paging. The consumer owns the
 * overlay markup, styles, and the image/media itself.
 */
export function useMediaLightbox<T>(
  options: UseMediaLightboxOptions<T>,
): UseMediaLightboxReturn<T> {
  const {
    items,
    index,
    onIndexChange,
    onClose,
    isOpen,
    wrapAround = false,
    closeOnBackdropClick = true,
    enableKeyboard = true,
    label = 'Media lightbox',
  } = options;

  const isFirst = index <= 0;
  const isLast = index >= items.length - 1;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (items.length === 0) return;
      if (wrapAround) {
        const wrapped = ((nextIndex % items.length) + items.length) % items.length;
        onIndexChange(wrapped);
      } else {
        onIndexChange(Math.min(Math.max(nextIndex, 0), items.length - 1));
      }
    },
    [items.length, wrapAround, onIndexChange],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (!isOpen || !enableKeyboard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'ArrowRight':
          event.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          prev();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enableKeyboard, onClose, next, prev]);

  const getOverlayProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': label,
      tabIndex: -1,
      onClick: (event: { target: unknown; currentTarget: unknown }) => {
        if (closeOnBackdropClick && event.target === event.currentTarget) {
          onClose();
        }
      },
      ...overrides,
    }),
    [closeOnBackdropClick, label, onClose],
  );

  const getCloseButtonProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      type: 'button',
      'aria-label': 'Close',
      onClick: onClose,
      ...overrides,
    }),
    [onClose],
  );

  const getPrevButtonProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      type: 'button',
      'aria-label': 'Previous',
      disabled: !wrapAround && isFirst,
      onClick: prev,
      ...overrides,
    }),
    [isFirst, prev, wrapAround],
  );

  const getNextButtonProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      type: 'button',
      'aria-label': 'Next',
      disabled: !wrapAround && isLast,
      onClick: next,
      ...overrides,
    }),
    [isLast, next, wrapAround],
  );

  return {
    item: items[index],
    index,
    isFirst,
    isLast,
    next,
    prev,
    goTo,
    getOverlayProps,
    getCloseButtonProps,
    getPrevButtonProps,
    getNextButtonProps,
  };
}
