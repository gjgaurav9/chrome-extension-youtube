import Dexie, { type Table } from 'dexie';
import type { CachedQuestions, MCQ, SavedVideo } from './types';

class ReviseTubeDB extends Dexie {
  videos!: Table<SavedVideo, string>;
  questions!: Table<CachedQuestions, string>;

  constructor() {
    super('revisetube');
    this.version(1).stores({
      videos: 'id, nextReviewAt, addedAt',
      questions: 'videoId, generatedAt',
    });
  }
}

export const db = new ReviseTubeDB();

export async function addVideo(video: SavedVideo): Promise<void> {
  await db.videos.put(video);
}

export async function removeVideo(id: string): Promise<void> {
  await db.transaction('rw', db.videos, db.questions, async () => {
    await db.videos.delete(id);
    await db.questions.delete(id);
  });
}

export async function getVideo(id: string): Promise<SavedVideo | undefined> {
  return db.videos.get(id);
}

export async function getAllVideos(): Promise<SavedVideo[]> {
  return db.videos.orderBy('addedAt').reverse().toArray();
}

export async function getDueVideos(now: number = Date.now()): Promise<SavedVideo[]> {
  return db.videos.where('nextReviewAt').belowOrEqual(now).toArray();
}

export async function getDueCount(now: number = Date.now()): Promise<number> {
  return db.videos.where('nextReviewAt').belowOrEqual(now).count();
}

export async function recordReview(
  id: string,
  intervalIndex: number,
  nextReviewAt: number,
  score: number,
): Promise<void> {
  await db.transaction('rw', db.videos, async () => {
    const existing = await db.videos.get(id);
    if (!existing) return;
    await db.videos.put({
      ...existing,
      intervalIndex,
      nextReviewAt,
      lastScore: score,
      reviewCount: existing.reviewCount + 1,
    });
  });
}

export async function getCachedQuestions(videoId: string): Promise<CachedQuestions | undefined> {
  return db.questions.get(videoId);
}

export async function cacheQuestions(videoId: string, questions: MCQ[]): Promise<void> {
  await db.questions.put({ videoId, questions, generatedAt: Date.now() });
}

export async function clearCachedQuestions(videoId: string): Promise<void> {
  await db.questions.delete(videoId);
}
