# 1.4 Frontend — PWA Offline-First

Status: ready · FREE · Est: 10 pts
NO `vite-plugin-pwa` — hand-rolled service worker (~150 lines total including precache list).
Ladder: platform features cover this; a plugin adds a build-config layer we'd never read again.

## Scope (keep tight — this is v1)
1. Installability: `manifest.webmanifest` (existing app icons) + SW registration.
2. App shell offline: shell (HTML/CSS/JS assets) precached.
3. API offline-read: trailing GET responses cached, stale-while-revalidate.
4. Offline mutations: queued in IndexedDB, replayed on reconnect.
5. Offline indicator chip (uses existing `lib/useOnline.js`).

## Files
```
frontend/public/sw.js                 (SW: install precache, fetch handler, replay on sync)
frontend/public/manifest.webmanifest  (name, short_name, icons 192/512, theme_color from tokens, standalone)
frontend/src/lib/offlineQueue.js      (IndexedDB helpers, tiny idb wrapper ~60 lines)
frontend/src/hooks/useOfflineSync.js  (wraps useOnline; drains queue; emits replayed/failed counts to Toast)
```

## Cache strategy (sw.js fetch handler)
| Request class | Strategy | Notes |
|---|---|---|
| `/` + hashed build assets (`index-*.js` etc.) | precache on install; version-bumped on new SW | skipWaiting on message from SW-update toast |
| Static fonts/icons | stale-while-revalidate, cap 30 | |
| `GET /api/*` | network-first, timeout 3s → cache fallback; cache successful 200s (cap 50 per path-family, evict oldest) | never cache auth/session endpoints (401s) |
| `POST/PATCH/DELETE /api/*` | never cache. If network fails → enqueue to IndexedDB (`offline_queue` store: {url, method, body, ts}, ordered) → return synthetic 503 `{offline: true}` | UI shows queued state in Toast |
| Others | passthrough (no caching) | |

`sync` event + visibilitychange both drain the queue (sequential, preserve order, Authorization
header attached from app at replay time — tokens may have rotated: queue stores URL/body only,
the app re-authenticates each entry on drain).
- Conflict rule: **server wins** per-resource; on replay 409 → drop queued copy, surface toast
  "A newer change exists on another device".
- Idempotency: attach `Idempotency-Key` header (uuid v4 per queued entry) — the PDF-import
  confirm endpoint and txns create already expect it (spec 1.1); add a Rails middleware to honor
  it generically if the endpoints don't yet.

## Update flow
- New build (different asset hash) vs precached assets in SW → new SW installs, `skipWaiting`
  when user clicks via `useServiceWorkerReady` message → page `controllerchange` → reload once.
- Dev-op note: bump `CACHE_NAME` per build via `import.meta.env` build stamp — Vite define.

## Out of scope (v1, say no)
- Background sync retries with backoff beyond 1 retry (rely on next app-open drain).
- Full offline conflict merge UI.
- Web Push already exists (`web_push_notification_service.rb` + `lib/push.js`) — don't touch.

## Tests
- Node tests: `offlineQueue` store/serial/drain with fake indexedDB (already have node test setup
  in `test/`).
- Manual CI checklist (added to `tasks/CHROME.md` style doc, not automated in v1):
  kill network → app loads from SW, GETs read last data; create txn → queued, tooltip visible →
  reconnect → replayed, appears in Transactions.
