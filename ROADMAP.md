# Roadmap — deferred work

Items explicitly out of scope for the MVP. Do **not** start any of these without an explicit go-ahead.

## Algorithm
- **FSRS scheduling.** Replace the fixed-interval SM-2-lite with FSRS once the MVP has enough review history to estimate parameters meaningfully. The current intervals are hard-coded in `src/lib/scheduler.ts`.

## Capture
- **Auto-watch detection.** Use YouTube's history (or a `chrome.history` query) to surface "you watched this 3 days ago — want to revise it?" suggestions. Requires explicit opt-in and a clear privacy posture.

## Cross-device
- **Cloud sync via Supabase.** Sync the videos table + review schedule across browsers/devices. Needs accounts, auth, conflict resolution.

## Export
- **Anki export.** Emit `.apkg` files of the generated MCQs, optionally with the video URL as the source field. Format spec: https://github.com/ankitects/anki/blob/main/docs/sync.md (or the simpler `genanki` JS port).

## Browser support
- **Firefox / Edge port.** Manifest V3 on Firefox has different service-worker semantics and event-page lifetimes. Edge is mostly Chromium-compatible but needs a separate listing.

## Monetization
- **Pro tier gating.** Free tier capped at e.g. 25 videos; paid tier unlocks unlimited + sync. Stripe + a thin backend would be the minimum.

## Telemetry
- **Opt-in anonymous usage metrics.** Currently the extension reports nothing. If added, must be off by default and never include video IDs / titles / transcripts.
