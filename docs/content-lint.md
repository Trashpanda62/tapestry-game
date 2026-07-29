# Content / stale-claim lint

Date: 2026-07-21  
Scope: all generated HTML, JS, CSS, JSON, XML, and text artifacts.

The lint rejects retired GitHub Pages URLs, the removed `products.js` runtime, placeholder/AI boilerplate, empty or `#!` hrefs, and emoji-only controls. Emoji remains allowed as supplementary illustration when a visible text/ARIA name is present.

`node scripts/content-lint.mjs` PASS: zero stale claims, zero placeholders, zero empty hrefs, and zero emoji-only controls in dist.
