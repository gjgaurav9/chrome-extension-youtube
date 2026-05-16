import {
  addVideo,
  cacheQuestions,
  getAllVideos,
  getCachedQuestions,
  getDueCount,
  getDueVideos,
  getVideo,
  recordReview,
  removeVideo,
} from '../lib/db';
import { computeNextReview, initialReviewAt } from '../lib/scheduler';
import { fetchTranscript, NoTranscriptError } from '../lib/transcript';
import { generateQuestions } from '../lib/llm';
import type {
  MCQ,
  RuntimeMessage,
  SavedVideo,
  VideoMetadata,
} from '../lib/types';
import { ERR_NO_API_KEY, ERR_NO_TRANSCRIPT } from '../lib/types';
import { debug } from '../lib/debug';

const QUESTION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CHECK_DUE_ALARM = 'revisetube-check-due';
const BADGE_COLOR = '#10B981';

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(CHECK_DUE_ALARM, {
    periodInMinutes: 60,
    when: Date.now() + 1000,
  });
  void refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_DUE_ALARM) void refreshBadge();
});

chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
  const message = rawMessage as RuntimeMessage;
  (async () => {
    try {
      const data = await handle(message);
      sendResponse({ ok: true, data });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      debug('handler error', message.type, error);
      sendResponse({ ok: false, error });
    }
  })();
  return true;
});

async function handle(msg: RuntimeMessage): Promise<unknown> {
  switch (msg.type) {
    case 'SAVE_VIDEO':
      return saveVideo(msg.video);
    case 'REMOVE_VIDEO':
      await removeVideo(msg.id);
      await refreshBadge();
      return null;
    case 'IS_SAVED': {
      const v = await getVideo(msg.id);
      return !!v;
    }
    case 'GET_ALL_VIDEOS':
      return getAllVideos();
    case 'GET_DUE_COUNT':
      return getDueCount();
    case 'GET_DUE_VIDEOS':
      return getDueVideos();
    case 'GENERATE_QUESTIONS':
      return ensureQuestions(msg.videoId, msg.force ?? false);
    case 'RECORD_REVIEW': {
      const v = await getVideo(msg.videoId);
      if (!v) throw new Error('Video not found');
      const next = computeNextReview(v.intervalIndex, msg.score);
      await recordReview(
        msg.videoId,
        next.intervalIndex,
        next.nextReviewAt,
        msg.score,
      );
      await refreshBadge();
      return { nextReviewAt: next.nextReviewAt };
    }
  }
}

async function saveVideo(meta: VideoMetadata): Promise<SavedVideo> {
  const existing = await getVideo(meta.id);
  if (existing) return existing;
  const v: SavedVideo = {
    ...meta,
    addedAt: Date.now(),
    intervalIndex: 0,
    nextReviewAt: initialReviewAt(),
    reviewCount: 0,
    lastScore: null,
  };
  await addVideo(v);
  await refreshBadge();
  return v;
}

async function ensureQuestions(videoId: string, force: boolean): Promise<MCQ[]> {
  if (!force) {
    const cached = await getCachedQuestions(videoId);
    if (cached && Date.now() - cached.generatedAt < QUESTION_CACHE_TTL_MS) {
      return cached.questions;
    }
  }

  const video = await getVideo(videoId);
  if (!video) throw new Error('Video not found');

  const apiKey = await getApiKey();
  if (!apiKey) throw new Error(ERR_NO_API_KEY);

  let transcript: string;
  try {
    transcript = await fetchTranscript(videoId);
  } catch (e) {
    if (e instanceof NoTranscriptError) throw new Error(ERR_NO_TRANSCRIPT);
    throw e;
  }

  const questions = await generateQuestions({
    apiKey,
    title: video.title,
    channel: video.channelName,
    transcript,
  });
  await cacheQuestions(videoId, questions);
  return questions;
}

async function getApiKey(): Promise<string | null> {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  return typeof apiKey === 'string' && apiKey.length > 0 ? apiKey : null;
}

async function refreshBadge(): Promise<void> {
  try {
    const count = await getDueCount();
    if (count > 0) {
      await chrome.action.setBadgeText({ text: String(count) });
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    debug('refreshBadge failed', e);
  }
}
