import { useMediaEvents } from '@headless-media/react';

export function EventLog() {
  const { events, clear } = useMediaEvents();

  return (
    <aside className="event-log" aria-label="Media events">
      <header>
        <h2>Event log</h2>
        <button onClick={clear} disabled={events.length === 0}>
          Clear
        </button>
      </header>

      {events.length === 0 ? (
        <p className="event-empty">
          Views and downloads tracked by the client emitter will appear here.
        </p>
      ) : (
        <ul>
          {events.map((event, index) => (
            <li key={`${event.timestamp}-${index}`} className="event-item">
              <span className="event-type">{event.type}</span>
              <span className="event-media">
                {event.media.kind} · {event.media.id}
              </span>
              <span className="event-time">{new Date(event.timestamp).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
