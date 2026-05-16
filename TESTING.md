# Manual test checklist

Run after every meaningful change. There is no automated test suite for the MVP — the spec calls out manual verification only.

## Setup

1. `pnpm build` (or `pnpm dev`)
2. Load `dist/` in `chrome://extensions` (Developer mode → Load unpacked)
3. Open the extension's Options page and paste a valid OpenAI API key (`sk-…`)
4. Confirm the masked key appears as "Stored: sk-… ABCD"

## Core flow

### Add a video with captions

- [ ] Open any YouTube video that has subtitles (e.g. a Veritasium / 3Blue1Brown / Vsauce video)
- [ ] Confirm a green **📚 Add to Revision** button appears next to the Like/Share row
- [ ] Click it → label changes to **…** then **✓ Added** within ~1 second; button becomes disabled
- [ ] Reload the page → button shows **✓ Added** immediately (state persisted)
- [ ] Open the Options page → the video appears in **Saved videos** with a "next review" date of "tomorrow"

### Add a video without captions

- [ ] Open a YouTube video known to have no captions (e.g. many music videos, very short clips)
- [ ] Click **📚 Add to Revision** → it gets added (no failure here; transcript is only checked at review time)
- [ ] In Options, manually edit the saved video's `nextReviewAt` via DevTools (Application → IndexedDB → revisetube → videos) to make it due
- [ ] Return to `youtube.com` → "Start Review" → modal should show **"This video has no transcript — can't generate questions. Removing from queue."** and the video disappears from Options after closing the modal

### Manually remove a video

- [ ] In Options, click **Remove** next to any saved video
- [ ] The row disappears immediately
- [ ] Refresh the Options page → it stays removed

## Scheduling

Easiest way to test scheduling without waiting days: bump the saved video's `nextReviewAt` to `Date.now()` via DevTools → Application → IndexedDB → revisetube → videos → edit row.

### Due card appears

- [ ] Make at least one saved video due (set `nextReviewAt = Date.now()`)
- [ ] Open `https://www.youtube.com/` → a green card reading **"🧠 You have 1 video due for revision"** appears above the video grid
- [ ] Confirm the count updates if you make more videos due

### Score 3/3 → interval advances

- [ ] Start a review for a video at `intervalIndex = 0` (the default for new adds)
- [ ] Answer all three questions correctly → score panel shows **3/3** and a "Next review on …" date roughly 3 days out
- [ ] After closing the modal, check the video in Options: `intervalIndex` should now be `1`

### Score 0/3 → interval resets

- [ ] Start a review for a video at `intervalIndex >= 2`
- [ ] Answer all three questions incorrectly → score panel shows **0/3** and a "Next review on …" date roughly 1 day out
- [ ] Check the video in Options: `intervalIndex` should now be `0`

### Interval caps at 60 days

- [ ] Manually set a video's `intervalIndex = 4` via DevTools
- [ ] Make it due, review with score ≥ 2 → next review should be 60 days out, `intervalIndex` stays at `4`

## SPA navigation

YouTube is a single-page app — the content scripts must re-inject on navigation.

- [ ] Open `youtube.com` (homepage), then click any video to navigate to its watch page → **📚 Add to Revision** button appears
- [ ] Click back to the homepage → if videos are due, the green card appears again
- [ ] Click another video without doing a full reload → button still injects on the new watch page

## Popup + badge

- [ ] Click the extension icon → popup shows the current due count, with an **Open settings** button
- [ ] When due count > 0, the toolbar badge shows the count in green
- [ ] Recording a review and ending up with no further dues → badge clears

## Edge cases to verify

- [ ] **No API key set**: open a review on a due video → modal shows the "No API key set" message; instructs to open options
- [ ] **Invalid API key**: temporarily save an invalid key → review modal shows a generic error message including the SDK's authentication error
- [ ] **Cached questions reused**: review the same video twice within 30 days → second time skips the loading skeleton (questions come from the cache table)
- [ ] **Service worker restart**: in `chrome://extensions`, click the extension's **service worker** "inspect" link, then in DevTools' Application tab click "Stop" on the worker. Click a content script trigger (e.g. open a review). The worker should restart and the action should still succeed.
