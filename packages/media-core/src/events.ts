/**
 * A minimal, framework-independent event emitter.
 *
 * Contract: `subscribe()`, `unsubscribe()`, `emit()`.
 */

export type MediaEventType = 'view' | 'download';

export interface MediaEvent {
  type: MediaEventType;
  media: {
    id: string;
    kind: 'photo' | 'video';
    url: string;
    src: string;
  };
  timestamp: number;
}

export type MediaEventListener = (event: MediaEvent) => void;

/** Returns an unsubscribe function. */
export type Unsubscribe = () => void;

export class EventEmitter<TEvent = MediaEvent> {
  private readonly listeners = new Set<(event: TEvent) => void>();

  /** Adds a listener. Returns an unsubscribe function. */
  subscribe(listener: (event: TEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  /** Removes a previously added listener. */
  unsubscribe(listener: (event: TEvent) => void): void {
    this.listeners.delete(listener);
  }

  /** Synchronously notifies every listener. Listener errors never break the loop. */
  emit(event: TEvent): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {
        // A listener must not break the emitter for everyone else.
      }
    }
  }

  listenerCount(): number {
    return this.listeners.size;
  }

  clear(): void {
    this.listeners.clear();
  }
}
