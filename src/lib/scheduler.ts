export const INTERVALS_DAYS = [1, 3, 7, 21, 60] as const;
export const MAX_INTERVAL_INDEX = INTERVALS_DAYS.length - 1;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewOutcome {
  intervalIndex: number;
  nextReviewAt: number;
}

function intervalDays(index: number): number {
  const clamped = Math.max(0, Math.min(index, MAX_INTERVAL_INDEX));
  return INTERVALS_DAYS[clamped]!;
}

export function initialReviewAt(now: number = Date.now()): number {
  return now + intervalDays(0) * DAY_MS;
}

export function computeNextReview(
  currentIntervalIndex: number,
  score: number,
  now: number = Date.now(),
): ReviewOutcome {
  const passed = score >= 2;
  const intervalIndex = passed
    ? Math.min(currentIntervalIndex + 1, MAX_INTERVAL_INDEX)
    : 0;
  return {
    intervalIndex,
    nextReviewAt: now + intervalDays(intervalIndex) * DAY_MS,
  };
}

/*
SM-2-lite contract — sanity assertions (run in dev console to verify):

  const DAY = 24 * 60 * 60 * 1000;

  // passing (>= 2/3) advances by one
  console.assert(computeNextReview(0, 2, 0).intervalIndex === 1);
  console.assert(computeNextReview(0, 3, 0).intervalIndex === 1);
  console.assert(computeNextReview(2, 2, 0).intervalIndex === 3);

  // advance caps at last index
  console.assert(computeNextReview(4, 3, 0).intervalIndex === 4);

  // failing (< 2/3) resets to 0
  console.assert(computeNextReview(2, 1, 0).intervalIndex === 0);
  console.assert(computeNextReview(4, 0, 0).intervalIndex === 0);

  // timestamps match the interval schedule [1, 3, 7, 21, 60]
  console.assert(computeNextReview(0, 3, 0).nextReviewAt === 3 * DAY);
  console.assert(computeNextReview(1, 3, 0).nextReviewAt === 7 * DAY);
  console.assert(computeNextReview(3, 3, 0).nextReviewAt === 60 * DAY);
  console.assert(computeNextReview(4, 3, 0).nextReviewAt === 60 * DAY);
  console.assert(computeNextReview(3, 0, 0).nextReviewAt === 1 * DAY);

  // first-add schedule
  console.assert(initialReviewAt(0) === 1 * DAY);
*/
