export interface SavedVideo {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  addedAt: number;
  intervalIndex: number;
  nextReviewAt: number;
  reviewCount: number;
  lastScore: number | null;
}

export interface MCQ {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CachedQuestions {
  videoId: string;
  questions: MCQ[];
  generatedAt: number;
}

export interface VideoMetadata {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

export type RuntimeMessage =
  | { type: 'SAVE_VIDEO'; video: VideoMetadata }
  | { type: 'REMOVE_VIDEO'; id: string }
  | { type: 'IS_SAVED'; id: string }
  | { type: 'GET_ALL_VIDEOS' }
  | { type: 'GET_DUE_COUNT' }
  | { type: 'GET_DUE_VIDEOS' }
  | { type: 'GENERATE_QUESTIONS'; videoId: string; force?: boolean }
  | { type: 'RECORD_REVIEW'; videoId: string; score: number };

export const ERR_NO_TRANSCRIPT = 'NO_TRANSCRIPT';
export const ERR_NO_API_KEY = 'NO_API_KEY';
