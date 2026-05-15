import { useEffect, useState } from 'react';
import { send } from '../lib/messaging';
import { copy } from '../lib/copy';
import type { SavedVideo } from '../lib/types';

export function Options() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto py-10 px-6 space-y-10">
        <h1 className="text-2xl font-bold">{copy.optionsTitle}</h1>
        <ApiKeySection />
        <VideoListSection />
      </div>
    </div>
  );
}

function ApiKeySection() {
  const [key, setKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get('apiKey').then(({ apiKey }) => {
      const k = typeof apiKey === 'string' ? apiKey : '';
      setSavedKey(k || null);
      setKey(k);
    });
  }, []);

  async function save() {
    await chrome.storage.local.set({ apiKey: key });
    setSavedKey(key);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }

  const masked = savedKey
    ? `${savedKey.slice(0, 8)}…${savedKey.slice(-4)}`
    : null;

  return (
    <section className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium">{copy.optionsApiKeyLabel}</span>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={copy.optionsApiKeyPlaceholder}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={!key}
          className="px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {justSaved ? copy.optionsApiKeySaved : copy.optionsApiKeySave}
        </button>
        {masked && (
          <span className="text-xs text-gray-500">Stored: {masked}</span>
        )}
      </div>
      <p className="text-xs text-gray-500">{copy.optionsApiKeyHelp}</p>
    </section>
  );
}

function VideoListSection() {
  const [videos, setVideos] = useState<SavedVideo[] | null>(null);

  async function refresh() {
    const list = await send<SavedVideo[]>({ type: 'GET_ALL_VIDEOS' });
    setVideos(list);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function remove(id: string) {
    await send({ type: 'REMOVE_VIDEO', id });
    await refresh();
  }

  if (videos === null) {
    return (
      <section>
        <p className="text-sm text-gray-500">Loading…</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{copy.optionsVideoListTitle}</h2>
      {videos.length === 0 ? (
        <p className="text-sm text-gray-500">{copy.optionsVideoListEmpty}</p>
      ) : (
        <ul className="divide-y divide-gray-200 bg-white rounded border border-gray-200">
          {videos.map((v) => (
            <li key={v.id} className="flex items-center gap-3 p-3">
              <img
                src={v.thumbnailUrl}
                alt=""
                className="w-20 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{v.title}</div>
                <div className="text-xs text-gray-500">
                  {v.channelName} · next review{' '}
                  {new Date(v.nextReviewAt).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })}
                </div>
              </div>
              <button
                onClick={() => void remove(v.id)}
                className="text-sm text-red-600 hover:text-red-800 px-2"
              >
                {copy.optionsRemove}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
