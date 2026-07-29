# Visual state and layout audit

Date: 2026-07-21  
Scope: generated locked production bundle.

The UI-state gate covers horizontal overflow protection, focus rings, reduced motion, 48px primary touch targets, dialog/sticky layering, loading/empty/error/success fixtures, bounded Shop rendering, and broken-image fallback prevention. The Herd card image now has a crest fallback until the selected animal image is assigned.

`node scripts/ui-state-audit.mjs` PASS. No orphaned controls or layout defects were found in the 40 live viewport probes documented in `docs/visual-board.md`; dark-canvas glow and framed photo borders are intentional Herd/Obscura treatments, not overflow or interaction defects.
