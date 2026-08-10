import { useCallback } from 'react';

export interface UseMediaLightboxOptions<T> {
  items: readonly T[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  isOpen: boolean;
  wrapAround?: boolean;
  label?: string;
}

export interface UseMediaLightboxReturn<T> {
  item: T | undefined;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  /** Props for the overlay container (e.g. a `Modal`). */
  getOverlayProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for the close control (e.g. a `Pressable`). */
  getCloseButtonProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for the "previous" control. */
  getPrevButtonProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  /** Props for the "next" control. */
  getNextButtonProps: (overrides?: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Headless lightbox for React Native. Keyboard handling is intentionally left
 * to the consumer (RN keyboards differ per platform); paging is exposed via
 * `next` / `prev` / `goTo` for buttons or gestures.
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

  const getOverlayProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      accessibilityRole: 'dialog',
      accessibilityLabel: label,
      visible: isOpen,
      onRequestClose: onClose,
      ...overrides,
    }),
    [isOpen, label, onClose],
  );

  const getCloseButtonProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      accessibilityRole: 'button',
      accessibilityLabel: 'Close',
      onPress: onClose,
      ...overrides,
    }),
    [onClose],
  );

  const getPrevButtonProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      accessibilityRole: 'button',
      accessibilityLabel: 'Previous',
      disabled: !wrapAround && isFirst,
      onPress: prev,
      ...overrides,
    }),
    [isFirst, prev, wrapAround],
  );

  const getNextButtonProps = useCallback(
    (overrides?: Record<string, unknown>) => ({
      accessibilityRole: 'button',
      accessibilityLabel: 'Next',
      disabled: !wrapAround && isLast,
      onPress: next,
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
