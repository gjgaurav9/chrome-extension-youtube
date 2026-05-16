# youtube-extension.md — project context

ReviseTube: Chrome MV3 extension that adds spaced-repetition review to YouTube. The user-facing pitch lives in `README.md`; the manual test plan in `TESTING.md`; deferred work in `ROADMAP.md`. **This file is internal engineering context** — what's surprising, what's load-bearing, what you'd want to know on day two.

## Architectural invariants

Don't violate these without explicit consent:

- **Service worker owns IndexedDB.** Content scripts run at the `youtube.com` origin; their IndexedDB is a separate store from the extension origin. All DB reads and writes go through `chrome.runtime.sendMessage` → `service-worker.ts`. Popup and options pages live at the extension origin and *could* call Dexie directly, but they currently also use messages for consistency.
- **Anthropic SDK is service-worker-only.** Never import `@anthropic-ai/sdk` into a content script — that would expose the API key to `youtube.com` page context. The SDK runs with `dangerouslyAllowBrowser: true` inside the SW because the SW is a privileged extension context, not a page.
- **Service worker has no in-memory state.** MV3 service workers are killed aggressively. IndexedDB and `chrome.storage.local` are the only sources of truth. Don't add module-level mutable state to `background/service-worker.ts`.
- **Shadow DOM for any non-trivial DOM injected into pages.** The "Add to Revision" button and the home-page card are plain DOM with inline styles (small, no Tailwind). The review modal is React + Tailwind inside a shadow root, with `globals.css?inline` injected as a `<style>` and a `:host { all: initial }` reset (see `review-modal.tsx`).

## File map

```
src/
├── background/service-worker.ts     # sole IndexedDB owner; routes RuntimeMessage union; badge updates
├── content/
│   ├── watch-page.tsx               # injects "Add to Revision" button (plain DOM)
│   ├── home-page.tsx                # injects due-card on /, /feed/* (plain DOM)
│   └── review-modal.tsx             # React + Tailwind in shadow DOM; entry: mountReviewModal()
├── popup/                           # toolbar popup (due count + open-options)
├── options/                         # API key entry, saved-video list, manual remove
├── lib/
│   ├── types.ts                     # SavedVideo, MCQ, CachedQuestions, RuntimeMessage, ERR_* codes
│   ├── db.ts                        # Dexie schema (videos, questions) + helpers
│   ├── scheduler.ts                 # SM-2-lite. INTERVALS_DAYS = [1, 3, 7, 21, 60]
│   ├── transcript.ts                # Watch-page HTML → ytInitialPlayerResponse → captionTracks → XML parse
│   ├── anthropic.ts                 # generateQuestions() with one retry; strict JSON validation
│   ├── copy.ts                      # ALL user-facing strings
│   ├── messaging.ts                 # typed `send<T>()` wrapper for chrome.runtime.sendMessage
│   └── debug.ts                     # debug() helper gated by const DEBUG
└── styles/globals.css               # @tailwind base/components/utilities only
```

## Commands

- `pnpm install` — install deps (pnpm 8.x)
- `pnpm dev` — Vite + CRXJS dev server, hot reloads `dist/`
- `pnpm build` — production build into `dist/`
- `pnpm typecheck` — `tsc -b --noEmit`. **Run before every commit.** No test framework for MVP.

## Loading the extension

`chrome://extensions` → Developer mode → Load unpacked → select `dist/`. After source changes, run `pnpm build`, then click the reload icon on the extension card. For content-script changes, you may also need to refresh the `youtube.com` tab.

## Scheduling

`INTERVALS_DAYS = [1, 3, 7, 21, 60]`. Score ≥ 2/3 → `intervalIndex` advances by 1 (capped at 4). Score < 2/3 → resets to 0. New adds start at `intervalIndex = 0` with `nextReviewAt = now + 1 day`. Logic in `lib/scheduler.ts`; inline assertions at the bottom of that file document the contract.

## Data model

```ts
SavedVideo:       { id, title, channelName, thumbnailUrl, addedAt,
                    intervalIndex (0..4), nextReviewAt, reviewCount, lastScore (0..3 | null) }
CachedQuestions:  { videoId, questions: MCQ[3], generatedAt }
MCQ:              { question, options: string[4], correctIndex (0..3), explanation }
```

Question cache TTL: 30 days. `removeVideo` also wipes the question cache for that video — orphans were a leak otherwise.

## Things that have bitten (or will)

- **SPA navigation.** YouTube doesn't full-page-reload between watch/home/feed. Content scripts re-inject via the `yt-navigate-finish` event + a 500ms-interval poll capped at 10s. A `MutationObserver` on `document.body` was considered and rejected — too expensive on YouTube's busy DOM.
- **YouTube selectors change.** `#top-level-buttons-computed`, `ytd-rich-grid-renderer`, `h1.ytd-watch-metadata yt-formatted-string` are current as of build date. If injection silently fails after a YouTube redesign, suspect these first.
- **Transcript availability.** Some videos have no captions; others only have ASR (auto-generated). `pickEnglishTrack` prefers manual over ASR. `NoTranscriptError` becomes `ERR_NO_TRANSCRIPT` over the message channel; the review modal handles this by removing the video from the queue.
- **Markdown fences from the model.** Models occasionally wrap JSON in ` ```json ` fences despite the system-prompt rule. `stripFences` is defensive. On parse or validation failure, one retry at `temperature: 0.2`.
- **Service worker death mid-fetch.** A long transcript fetch + LLM call can outlive the SW's idle timeout. The messaging wrapper surfaces "No response from service worker"; the modal shows a generic error and the user can retry.
- **`noUncheckedIndexedAccess`.** `arr[i]` is `T | undefined`. A few `!` non-null assertions live where bounds are checked just above (e.g. `scheduler.ts`, `transcript.ts`). Don't remove without restructuring.
- **API key path.** `chrome.storage.local` only. Never log it. Options page is the only writer; SW reads on-demand at question-generation time.

## Out of scope

See `ROADMAP.md`. Highlights: no accounts, no cloud sync, no FSRS, no Anki export, no auto-watch-detection, no Firefox port. If a request edges into any of these, stop and confirm.

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess`. No `any` outside the YouTube DOM boundary (comment why where present).
- No `console.log` in production paths — use `debug()` and flip the `DEBUG` const in `lib/debug.ts` for ad-hoc tracing.
- All user-facing strings in `lib/copy.ts`. If you write a string in a component, move it.
- Comments explain WHY, not WHAT. Default to none.
- Commits authored as `gjgaurav9 <gjgaurav9@gmail.com>` for this repo.
