import { useState } from 'react';
import { MediaProvider, useMediaEvents, type MediaItem } from '@headless-media/react';
import { PhotoExplorer } from './components/PhotoExplorer.js';
import { VideoReels } from './components/VideoReels.js';
import { EventLog } from './components/EventLog.js';

type Tab = 'photos' | 'videos';

const API_KEY = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;

// In dev the browser goes through Vite's `/pexels` proxy (see vite.config.ts) so
// api.pexels.com is never hit directly — avoids CORS and browser-side blockers.
// For a built bundle the direct API URL is used instead (Pexels sends CORS
// headers for it). Override at any time with VITE_PEXELS_BASE_URL.
const PEXELS_BASE_URL: string | undefined =
  (import.meta.env.VITE_PEXELS_BASE_URL as string | undefined) ??
  (import.meta.env.DEV ? '/pexels' : 'https://api.pexels.com/v1');

export function App() {
  if (!API_KEY) {
    return (
      <main className="setup">
        <h1>Headless Media SDK</h1>
        <p>
          Add a Pexels API key to <code>apps/web/.env</code> (see{' '}
          <code>.env.example</code>) and restart the dev server.
        </p>
      </main>
    );
  }

  return (
    <MediaProvider apiKey={API_KEY} baseUrl={PEXELS_BASE_URL}>
      <Shell />
    </MediaProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>('photos');
  const { trackView, trackDownload } = useMediaEvents();

  const handleView = (item: MediaItem) => trackView(item);
  const handleDownload = (item: MediaItem) => trackDownload(item);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Headless Media SDK</h1>
        <nav className="tabs" aria-label="Media type">
          <button
            className={tab === 'photos' ? 'tab tab-active' : 'tab'}
            onClick={() => setTab('photos')}
          >
            Photos
          </button>
          <button
            className={tab === 'videos' ? 'tab tab-active' : 'tab'}
            onClick={() => setTab('videos')}
          >
            Video Reels
          </button>
        </nav>
      </header>

      <main className="app-body">
        {tab === 'photos' ? (
          <PhotoExplorer onView={handleView} onDownload={handleDownload} />
        ) : (
          <VideoReels onView={handleView} onDownload={handleDownload} />
        )}
      </main>

      <EventLog />
    </div>
  );
}
