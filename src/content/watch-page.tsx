import { send } from '../lib/messaging';
import { copy } from '../lib/copy';
import { debug } from '../lib/debug';
import type { SavedVideo, VideoMetadata } from '../lib/types';

declare global {
  interface WindowEventMap {
    'yt-navigate-finish': Event;
  }
}

const BUTTON_CLASS = 'revisetube-add-button';

function getVideoId(): string | null {
  const url = new URL(location.href);
  return url.searchParams.get('v');
}

// YouTube DOM boundary: selector strings and any-typed window globals
// originate outside our control, hence the targeted casts below.
function getMetadata(): VideoMetadata | null {
  const id = getVideoId();
  if (!id) return null;
  const title =
    document
      .querySelector<HTMLElement>(
        'h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string',
      )
      ?.textContent?.trim() ??
    document.title.replace(/ - YouTube$/, '').trim();
  const channelName =
    document
      .querySelector<HTMLElement>('ytd-channel-name a, #channel-name a')
      ?.textContent?.trim() ?? '';
  return {
    id,
    title,
    channelName,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function makeButton(label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = BUTTON_CLASS;
  btn.textContent = label;
  Object.assign(btn.style, {
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '18px',
    padding: '0 14px',
    height: '36px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    marginLeft: '8px',
    fontFamily: '"Roboto", "Arial", sans-serif',
  });
  return btn;
}

async function onAddClick(btn: HTMLButtonElement): Promise<void> {
  const meta = getMetadata();
  if (!meta) {
    btn.textContent = copy.buttonError;
    return;
  }
  btn.disabled = true;
  btn.textContent = copy.buttonAdding;
  try {
    await send<SavedVideo>({ type: 'SAVE_VIDEO', video: meta });
    btn.textContent = copy.buttonAdded;
  } catch (e) {
    debug('SAVE_VIDEO failed', e);
    btn.textContent = copy.buttonError;
    btn.disabled = false;
  }
}

async function paintInitialState(btn: HTMLButtonElement): Promise<void> {
  const id = getVideoId();
  if (!id) return;
  try {
    const saved = await send<boolean>({ type: 'IS_SAVED', id });
    btn.textContent = saved ? copy.buttonAdded : copy.buttonAdd;
    btn.disabled = saved;
  } catch (e) {
    debug('IS_SAVED failed', e);
  }
}

function tryInject(): boolean {
  if (location.pathname !== '/watch') return false;
  const container = document.querySelector(
    '#top-level-buttons-computed, #actions-inner',
  );
  if (!container) return false;
  if (container.querySelector(`.${BUTTON_CLASS}`)) return true;
  const btn = makeButton(copy.buttonAdd);
  btn.addEventListener('click', () => void onAddClick(btn));
  container.appendChild(btn);
  void paintInitialState(btn);
  return true;
}

function scheduleRetries(): void {
  let attempts = 0;
  const interval = window.setInterval(() => {
    attempts += 1;
    if (tryInject() || attempts > 20) {
      window.clearInterval(interval);
    }
  }, 500);
}

scheduleRetries();
window.addEventListener('yt-navigate-finish', () => {
  scheduleRetries();
});
