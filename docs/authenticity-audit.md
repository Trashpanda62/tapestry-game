# Authenticity / de-AI audit

Date: 2026-07-21  
Scope: visible copy, layout tokens, and locked visual treatment.

- Beige-card sameness: not present. Home uses an editorial photo/note sequence; Visit, Shop, Animals, Stay, and Herd use distinct card, chapter, and story structures.
- Generic Georgia / fake handwritten notes: no cursive/handwriting font or faux-note treatment. The sturdy slab/field-note pairing is a deliberate farm-label system; Herd’s legacy canvas retains its Georgia fallback for continuity.
- Diffuse shadows: shared elevation is restrained; stronger shadows are limited to dialogs, lightboxes, and image overlays.
- Equal grids: repeating catalog/experience/RV data uses grids, while proof/story chapters break the rhythm with varied layouts and full-bleed documentary imagery.
- Slogan stacks / overclaiming: public copy stays tied to 110 acres, Monroe/Upper Cumberland, named animals, practical rates, source facts, and Square destinations.
- Decorative glyph noise: motifs are marked `aria-hidden`; controls have text or accessible labels.
- Em-dash rhythm: visible Herd chapter labels use a bounded farm-label punctuation style. `scripts/authenticity-audit.mjs` strips scripts/comments and reports the visible count (≤25); no prose depends on it for meaning.

`node scripts/authenticity-audit.mjs` PASS. The Impeccable hook’s dark-glow flag is intentional for the Herd’s photographic canvas and is constrained to that immersive chapter, not the primary conversion surfaces.
