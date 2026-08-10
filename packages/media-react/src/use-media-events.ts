import { useCallback, useEffect, useState } from 'react';
import { type MediaEvent } from '@headless-media/core';
import { useMediaClient } from './context.js';

export interface TrackableMedia {
  id: string;
  kind: 'photo' | 'video';
  url: string;
  src: string;
}

export interface UseMediaEventsOptions {
  /** Maximum number of events kept in memory. Defaults to 100. */
  max?: number;
}

export interface UseMediaEventsResult {
  /** Events in chronological order, newest last. */
  events: MediaEvent[];
  lastEvent: MediaEvent | null;
  trackView: (media: TrackableMedia) => void;
  trackDownload: (media: TrackableMedia) => void;
  clear: () => void;
}

/**
 * Subscribes to the client's event emitter and exposes `view`/`download`
 * tracking helpers backed by the same emitter.
 */
export function useMediaEvents(options: UseMediaEventsOptions = {}): UseMediaEventsResult {
  const client = useMediaClient();
  const max = options.max ?? 100;

  const [events, setEvents] = useState<MediaEvent[]>([]);

  const pushEvent = useCallback(
    (event: MediaEvent) => {
      setEvents((prev) => {
        const next = [...prev, event];
        return next.length > max ? next.slice(next.length - max) : next;
      });
    },
    [max],
  );

  useEffect(() => {
    const unsubscribe = client.events.subscribe(pushEvent);
    return unsubscribe;
  }, [client, pushEvent]);

  const trackView = useCallback(
    (media: TrackableMedia) => {
      client.trackView(media);
    },
    [client],
  );

  const trackDownload = useCallback(
    (media: TrackableMedia) => {
      client.trackDownload(media);
    },
    [client],
  );

  const clear = useCallback(() => setEvents([]), []);

  return {
    events,
    lastEvent: events[events.length - 1] ?? null,
    trackView,
    trackDownload,
    clear,
  };
}
