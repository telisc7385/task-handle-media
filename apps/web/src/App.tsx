import { useState } from 'react';
import { MediaProvider, useMediaEvents, type MediaItem } from '@headless-media/react';
import { PhotoExplorer } from './components/PhotoExplorer.js';
import { VideoReels } from './components/VideoReels.js';
import { EventLog } from './components/EventLog.js';

type Tab = 'photos' | 'videos';

const API_KEY = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;

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
    <MediaProvider apiKey={API_KEY}>
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
