import { send } from '../lib/messaging';
import { copy } from '../lib/copy';
import { debug } from '../lib/debug';
import type { SavedVideo } from '../lib/types';
import { mountReviewModal } from './review-modal';

declare global {
  interface WindowEventMap {
    'yt-navigate-finish': Event;
  }
}

const CARD_ID = 'revisetube-home-card';

function isHomePage(): boolean {
  const p = location.pathname;
  return p === '/' || p.startsWith('/feed');
}

function buildCard(count: number, onStart: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.id = CARD_ID;
  Object.assign(wrap.style, {
    margin: '16px 0',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
    color: '#fff',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: '"Roboto", "Arial", sans-serif',
    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
  });

  const text = document.createElement('span');
  text.textContent = copy.homeCardTitle(count);
  text.style.fontSize = '15px';
  text.style.fontWeight = '500';

  const btn = document.createElement('button');
  btn.textContent = copy.homeCardCta;
  Object.assign(btn.style, {
    background: '#fff',
    color: '#047857',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  });
  btn.addEventListener('click', onStart);

  wrap.appendChild(text);
  wrap.appendChild(btn);
  return wrap;
}

async function inject(): Promise<void> {
  if (!isHomePage()) {
    document.getElementById(CARD_ID)?.remove();
    return;
  }
  if (document.getElementById(CARD_ID)) return;

  let due: SavedVideo[];
  try {
    due = await send<SavedVideo[]>({ type: 'GET_DUE_VIDEOS' });
  } catch (e) {
    debug('GET_DUE_VIDEOS failed', e);
    return;
  }
  if (due.length === 0) return;

  const mountPoint =
    document.querySelector('ytd-rich-grid-renderer') ??
    document.querySelector('#primary');
  if (!mountPoint || !mountPoint.parentElement) return;

  const card = buildCard(due.length, () => {
    mountReviewModal(due);
  });
  mountPoint.parentElement.insertBefore(card, mountPoint);
}

function scheduleRetries(): void {
  let attempts = 0;
  const id = window.setInterval(() => {
    attempts += 1;
    void inject();
    if (document.getElementById(CARD_ID) || attempts > 20 || !isHomePage()) {
      window.clearInterval(id);
    }
  }, 500);
}

scheduleRetries();
window.addEventListener('yt-navigate-finish', () => {
  document.getElementById(CARD_ID)?.remove();
  scheduleRetries();
});
