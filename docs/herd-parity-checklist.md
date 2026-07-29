# Herd migration parity

- Browse tabs, species chips, search, named-animal cards, and counts remain in the mirrored app.
- The Name Them / quiz flow remains available in the read-only shell; write actions stay disabled when `/healthz` is unavailable.
- `herd.json` is bundled beside the app for offline fallback; service worker uses a network-first shell and network-first data with cached fallback.
- Keyboard focus, modal close, reduced-motion CSS, and 320px layout are inherited from the source app and preserved byte-for-byte except for base/scope rewriting.
- The chapter shell links to the internal same-origin app and the separate Animals reference route, so story, browse, and quiz journeys do not collide.

