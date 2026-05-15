# ReviseTube

**Spaced repetition for YouTube.** Add a video to your revision queue from any watch page; ReviseTube schedules reviews (1 → 3 → 7 → 21 → 60 days) and quizzes you with three LLM-generated MCQs derived from the video transcript. Local-first, no backend, no accounts.

## Setup

```bash
pnpm install
pnpm build
```

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` directory

Right-click the extension icon → **Options** → paste your Anthropic API key. Question generation uses Claude Haiku 4.5; cost is roughly $0.001–$0.005 per review session.

## Develop

```bash
pnpm dev
```

CRXJS rebuilds the extension to `dist/` on file changes and hot-reloads where possible. Reload at `chrome://extensions` if a content script changes.

## Daily flow

- On a YouTube watch page, click **📚 Add to Revision**. The video is queued for review in 1 day.
- On `youtube.com` (homepage / feeds), a green card appears when reviews are due. Click **Start Review** to open the quiz modal.
- Score ≥ 2/3 → interval advances. Score < 2/3 → interval resets to 1 day.

See `TESTING.md` for the manual test checklist, `ROADMAP.md` for explicitly-deferred items.

## Stack

Manifest V3 · Vite + `@crxjs/vite-plugin` · React 18 · TypeScript (strict) · Dexie · Zustand · Tailwind (in shadow DOM) · `@anthropic-ai/sdk`.
