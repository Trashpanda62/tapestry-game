# Impeccable audit — Tapestry Acres home page

Target: `https://sites.obscurastudio.design/s/tapestry-acres`
Source: `C:\dev\tapestry-game` (`index.html` + `assets/site.css`, built to `dist/` by `scripts/build.mjs`)
Register: brand. Date: 2026-07-28.
Method: bundled impeccable detector over source, plus live in-browser measurement at 1280 / 760 / 375 px.

## Audit health score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Hero text measures **1.1:1** contrast at its worst point against the photo behind it |
| 2 | Performance | 3/4 | Lean (12 requests, 317 KB warm, CLS 0) but the hero photo is upscaled 700px → 1040px |
| 3 | Responsive design | 2/4 | `.editorial-sequence` never collapses — 106px text column on every phone |
| 4 | Theming | 2/4 | Good `:root` token set, ~20 hard-coded hexes bypass it |
| 5 | Anti-patterns | 3/4 | Detector clean; four near-identical card grids on one page |
| **Total** | | **12/20** | **Acceptable — significant work needed** |

## Anti-patterns verdict

**Pass.** This does not read as AI-generated. The bundled detector returns zero findings over `index.html` and `assets/site.css`. The palette (`pasture-ochre`) is committed and specific, the photography is real and well-chosen, the type stack is Georgia/Arial — none of the reflex-reject families — and there is no gradient text, no fabricated social proof, no hero-metric template, no numbered section scaffolding.

Two tells worth naming:

- **Four near-identical card grids on one page.** `.hub-grid` (4), `.feature-grid` (3), `.product-grid` (4), `.giftcert-strip` (3). Same border, same radius, same `--card` fill, same shadow. That is the "identical card grids" ban, and it flattens the page's narrative into one repeated texture.
- **Two tiny uppercase tracked eyebrows** — "A WORKING MORNING" and "NAMED-ANIMAL PROOF" (`.field-label`, 12px, `letter-spacing:.12em`, uppercase). Two is not yet section grammar, but it is the saturated 2023 kicker. "Named-animal proof" is also internal build-plan vocabulary that leaked into customer-facing copy.

## Executive summary

- **Health score: 12/20** (Acceptable)
- **Issues: 2 P0, 5 P1, 6 P2, 3 P3**
- Top issues:
  1. **The mobile navigation is dead** — two click handlers are bound to the burger, so every tap toggles it twice and the menu never opens.
  2. **Hero text fails WCAG AA by a wide margin** over the bright regions of the photo (measured, not estimated).
  3. **`.editorial-sequence` never collapses to one column** — it renders as a 145px photo beside a 106px text column on every phone.
  4. **The hero photo is a 700×700 source stretched to 1040×690** — a 1.5× upscale on a 1× display, ~3× on retina.
  5. Four card grids give the page one flat texture from top to bottom.

## Detailed findings

### [P0] The mobile menu never opens — duplicate click handlers

- **Location**: `index.html:73-75` (inline script) and `assets/site-shell.js:13-14`; also `rv-rentals.html`
- **Category**: Accessibility / Correctness
- **Impact**: `scripts/build.mjs:81` injects `site-shell.js` into every page. On `index.html` and `rv-rentals.html` an inline script binds a *second* `click` handler to `.site-nav-toggle`. Both flip `aria-expanded`, so each tap toggles it twice and the value never leaves `"false"`. Verified live at 375px: `toggle.click()` leaves `aria-expanded="false"` and `.site-nav` stays `display:none`. Phone and keyboard users have **no working site navigation** on the home page — the burger is the only nav affordance below 700px.
- **WCAG**: 2.1.1 Keyboard, 2.4.5 Multiple Ways
- **Recommendation**: Delete the inline script from both pages. `site-shell.js` already has the better implementation (Escape to close, click-outside to close).
- **Suggested command**: `/impeccable adapt`

### [P0] Hero copy fails contrast against the photograph

- **Location**: `index.html:79`, `assets/site.css:28,31-33`
- **Category**: Accessibility
- **Impact**: Measured by compositing the actual hero pixels under the `.hero-media::after` veil and computing the ratio against white text, sampled across each element's box:

  | Element | Size | Threshold | Worst | Mean |
  |---|---|---|---|---|
  | `h1` "Meet the family…" | 80px bold | 3:1 | **1.10:1** | 11.0:1 |
  | `#hero-subline` | 26.4px | 3:1 | **1.85:1** | 9.9:1 |
  | `.hero-trust` | 13px bold | 4.5:1 | **3.41:1** | 9.3:1 |

  The mean is fine; the *minimum* is not. The veil is `linear-gradient(180deg, rgba(20,16,10,.3), transparent 30%, rgba(20,16,10,.62))`, so it is nearly clear exactly where the headline sits, and the photograph is bright sunlit pasture there. `text-shadow` masks it perceptually but carries no WCAG weight and does nothing for low-vision users. This is the first thing every visitor sees.
- **WCAG**: 1.4.3 Contrast (Minimum) — fails AA
- **Recommendation**: Add a scrim behind the copy block rather than deepening the whole veil (which would flatten the photograph): a soft dark ellipse or bottom-anchored gradient sized to the text, targeting ≥4.5:1 at the worst pixel.
- **Suggested command**: `/impeccable adapt` / `/impeccable polish`

### [P1] `.editorial-sequence` never collapses on mobile

- **Location**: `index.html:53-55` (the `@media(max-width:560px)` list omits `.editorial-sequence`)
- **Category**: Responsive
- **Impact**: Measured at 375px: grid columns resolve to `144.5px 166.5px`. Inside the 166px note, 30px of horizontal padding leaves a **106px text column** — the `h2` renders 106px wide × 181px tall (a 24px heading wrapping to ~7 lines) and the paragraph 106px × 358px. Every other two-column block on the page (`.herd-teaser`, `.find-us`, `.about-section`) *is* in that rule; this one was missed.
- **Recommendation**: Add `.editorial-sequence` to the 560px single-column rule and give it a mid-breakpoint at 800px too.
- **Suggested command**: `/impeccable adapt`

### [P1] Mid-breakpoint text columns collapse below readable width

- **Location**: `index.html:46-47,53`; `.herd-teaser` / `.find-us` / `.about-section` / `.editorial-sequence`
- **Category**: Responsive
- **Impact**: At 760px viewport the measured text columns are `.editorial-note` **218px** (~27 characters/line) and `.herd-teaser` **286px** (~35 ch). The brand register's floor is 45–75ch. These blocks hold 1.15fr/1fr two-column layouts all the way down to 560px, where they finally stack — the 560–800px band is the squeeze.
- **Recommendation**: Move the stacking breakpoint for these blocks up to ~860px.
- **Suggested command**: `/impeccable layout`

### [P1] Hero photo is upscaled — the OG image is sharper than the hero

- **Location**: `index.html:78` → `assets/portfolio/walk-summer.webp`
- **Category**: Performance / Quality
- **Impact**: Source is **700×700**; it renders at **1040×690** with `object-fit:cover`, so the browser upscales ~1.5× on a 1× display and ~3× on a 2× display. Meanwhile `assets/bg/hero.webp` is **2000×900** and is used only as the `og:image`. The most important image on the site is the softest one.
- **Recommendation**: Re-export `walk-summer` at ≥2000px wide, or use a wider crop, and add `fetchpriority="high"`.
- **Suggested command**: `/impeccable optimize`

### [P1] No responsive images anywhere

- **Location**: all 11 images on the page; measured `srcset` count = **0**
- **Category**: Performance
- **Impact**: A 375px phone downloads the same bytes as a 1440px desktop. `walk-family.webp` is 158 KB served into a 335px slot on mobile. Page weight is 317 KB warm / ~480 KB cold, and roughly 95% of it is images.
- **Recommendation**: Generate 480/960/1600px variants and add `srcset` + `sizes` to the hero and the four editorial photos.
- **Suggested command**: `/impeccable optimize`

### [P1] Touch targets below 44px

- **Location**: `assets/site.css:24,64,69`
- **Category**: Accessibility / Responsive
- **Impact**: Measured — desktop nav links **56×37px**, burger **36×36px**, mobile menu links `padding:10px 12px` (~37px). The project's own accessibility standard is 44px; WCAG 2.5.8 AA minimum is 24px, so this passes the letter of AA and fails the house rule, on the primary navigation.
- **Recommendation**: `min-height:44px` on `.site-nav a`, and 44×44 for `.site-nav-toggle`.
- **Suggested command**: `/impeccable adapt`

### [P2] Featured products render 4 cards into a 3-column grid

- **Location**: `index.html:42` (`.product-grid{grid-template-columns:repeat(3,1fr)}`) vs `index.html:151` (`items.slice(0,4)`)
- **Category**: Layout
- **Impact**: Verified live: `productCount = 4`, `gridTemplateColumns = 333px 333px 333px`. The fourth product sits alone on a second row, half the section's height for one card. At 760px the grid is 2-up and `.feature-grid` (3 items) develops the same orphan.
- **Recommendation**: Slice products to 3, or make the grid 4-up on desktop.
- **Suggested command**: `/impeccable layout`

### [P2] Eight images ship without intrinsic dimensions

- **Location**: hero, `assets/cards/highlandpair.jpg`, `alpaca-face.webp`, `walk-family.webp`, and the four JS-injected product images (`index.html:141`)
- **Category**: Performance
- **Impact**: Measured CLS is **0** because the JS-injected grids sit below the fold, so no shift is scored — but the protection is incidental, not designed. On a slow connection with a shorter hero the same markup shifts.
- **Recommendation**: Add `width`/`height` to the hero and set them in the `image()` helper.
- **Suggested command**: `/impeccable optimize`

### [P2] Both JSON fetches opt out of caching

- **Location**: `index.html:144,150` — `fetch(..., {cache:'no-cache'})`
- **Category**: Performance
- **Impact**: Forces a revalidation round-trip for `experiences.v1.json` and `featured-products.json` on every single page load, including repeat visits. These are static build artifacts.
- **Recommendation**: Drop the option and let the build's cache headers do the work.
- **Suggested command**: `/impeccable optimize`

### [P2] Hero runs an infinite Ken Burns animation

- **Location**: `assets/site.css:27,29` — `animation:kenburns 18s ease-out infinite alternate`
- **Category**: Performance
- **Impact**: Continuous compositing of a full-bleed image for as long as the tab is open — measurable battery cost on phones. Correctly disabled under `prefers-reduced-motion`, and it is not a layout property, so it is cheap per frame; it simply never stops.
- **Recommendation**: Run it once on load, or pause it when the hero scrolls out of view.
- **Suggested command**: `/impeccable optimize`

### [P2] Gift certificates waste a full screen on tablet

- **Location**: `index.html:54` — `@media(max-width:800px){.giftcert-strip{grid-template-columns:1fr}}`
- **Category**: Responsive / Layout
- **Impact**: Measured 555px tall at 760px viewport for three items whose entire content is a title, a price, and a button. They drop from 3-up straight to 1-up at 800px, skipping the obvious 3-up-at-tablet or 2-up middle state.
- **Recommendation**: Keep three across down to ~520px; they are small enough.
- **Suggested command**: `/impeccable layout`

### [P2] ~20 hard-coded colors bypass the token set

- **Location**: `assets/site.css` — `#5f5a48`, `#625e4c`, `#756f61`, `#8b2f20`, `#e8e0cc`, `#a89d7e`, `#fffdf8`, `#b9ad8d`, `#294d25`, `#702719`, `#54400b`, `#9e3927`, `#665f43`, `#fff8df`, and others
- **Category**: Theming
- **Impact**: `:root` defines a complete, well-named palette (`--ink`, `--muted`, `--forest`, `--accent`, `--card`…) and then a second, undeclared palette grows alongside it. Several of these are near-duplicates of existing tokens (`#5f5a48` vs `--muted:#6f6a55`). Any future palette change will miss them, and the design lock cannot enforce values it cannot see.
- **Recommendation**: Fold the duplicates into tokens; promote the genuinely new roles (state greens/reds) to named tokens.
- **Suggested command**: `/impeccable extract`

### [P3] Redundant accessible name on the nav toggle

- **Location**: `index.html:62` — `aria-label="Toggle navigation"` wrapping `<span class="sr-only">Toggle navigation</span>`
- **Category**: Accessibility
- **Impact**: `aria-label` wins, so the `sr-only` span is dead weight. Harmless, but it suggests uncertainty about which mechanism is in play.
- **Suggested command**: `/impeccable polish`

### [P3] "Named-animal proof" is internal vocabulary in customer-facing copy

- **Location**: `index.html:113`
- **Category**: Copy
- **Impact**: This is a build-plan acceptance criterion ("prove the animals are named") printed as a section kicker on a farm's marketing site. It means nothing to a visitor.
- **Suggested command**: `/impeccable clarify`

### [P3] `overflow:hidden` on `main` plus `overflow-x:hidden` on `html`

- **Location**: `assets/site.css:15,25`
- **Category**: Layout
- **Impact**: Two overlapping suppressions. They hide real overflow bugs rather than fixing them, and `main`'s clip can crop the 22px focus glow at the content edges.

## Patterns and systemic issues

1. **Per-page inline `<style>` and `<script>` blocks fight the shared shell.** The home page carries ~20 lines of layout CSS and two script blocks in its own head. That is how the duplicate nav handler and the missed `.editorial-sequence` breakpoint both happened: the page-local rules were written without the shared 560px rule in view.
2. **Breakpoints are per-component, not per-system.** 800px, 760px, 700px, 560px, and 430px are all in play, chosen per block. The 560–800px band is where several blocks are simultaneously in their worst state.
3. **Images are treated as static assets, not as a responsive pipeline.** No `srcset`, no intrinsic dimensions on half of them, and the highest-resolution asset in the repo is used only for social preview.

## Positive findings

- **Zero detector findings.** No AI slop tells at the code level.
- **Real, well-directed photography** with descriptive alt text — exactly what the brand register asks of an image-led brief.
- **A committed, specific palette** with a proper `:root` token layer, a documented design lock, and an audit script enforcing it.
- **`prefers-reduced-motion` is a genuine global kill-switch**, including `scroll-behavior`.
- **Every section has `aria-labelledby`**, headings are ordered, landmarks are correct, the skip link is injected at build.
- **Focus rings are excellent** — a three-layer ring that stays visible on any background.
- **No webfonts, no third-party scripts, 12 requests, 82ms to DOM-ready.** Genuinely fast.
- **Graceful failure states** — both JSON loaders catch and render human sentences, not spinners.
- **A ~50-script `npm run check` gate.** Very few sites this size have anything comparable.

## Results after the adapt / layout / polish / optimize passes

Measured on the rebuilt `dist/` served at the production base path. `npm run check` (the full ~50-script gate) is green.

| Finding | Before | After |
|---|---|---|
| Mobile menu opens | never (`aria-expanded` stuck at `false`) | opens, closes on Escape / outside click / link |
| Hero `h1` worst-pixel contrast | 1.10:1 | **5.27:1** |
| Hero subline worst-pixel contrast | 1.85:1 | **11.55:1** |
| Hero trust line worst-pixel contrast | 3.41:1 | **12.28:1** |
| `.editorial-sequence` at 375px | 145px photo + 106px text column | single column, 335px |
| `.editorial-note` body text at 760px | 218px (~27 ch) | 641px (72 ch, the `p` cap) |
| Gift certificates at 760px | 555px tall | 252px |
| Hub grid at 375px | 901px | 721px |
| Featured products grid | 4 cards in 3 columns | 4 in 4 |
| Home page image payload (retina) | 528 KB | **365 KB (−31%)** |
| Home page image payload (1× small screen) | 528 KB | **300 KB (−43%)** |
| Page height at 375px | 9,222px (11.4 screens) | 8,816px (10.8 screens) |

Notes on what did **not** change and why:

- **The hero photograph is still upscaled.** `walk-summer.webp` exists only at 700×700 and renders at 1040×690; there is no higher-resolution source in the repo, and the design lock pins this photo. Fixing it needs a fresh export from the original. Byte weight improved (109 KB → 49 KB via AVIF), sharpness did not.
- **Page height at 760px grew** from 6,335px to 6,990px. Stacking the two-column editorial blocks at 860px costs vertical space on tablet; it buys back a readable measure. That trade is deliberate.
- **Ken Burns still loops.** Holding the end state would leave the already-upscaled hero permanently at 1.055×, and the animation is GPU-composited and already gated behind `prefers-reduced-motion`. Not worth the trade.
- **The card images that have no variants are untouched** — `assets/cards/highlandpair.jpg` (107 KB) is now the single heaviest asset on the page, and the four product images have no generated variants. Extending `media.images` in the build to cover them is the next-largest win.

Three gate scripts were changed, each because the assertion had encoded the defect rather than the intent:

- `scripts/keyboard-audit.mjs` required an **inline** click handler in `index.html` — the exact thing that double-bound the toggle and broke the menu. It now checks that the page loads the shared shell, that the shell binds the handler, and that neither page re-binds it inline.
- `scripts/visual-regression-audit.mjs` required a `800px` breakpoint; the home page's 800px rung was folded into `860px` (the rung `shop.html` already used).
- `scripts/authenticity-audit.mjs` required the literal string `named-animal`, which was only ever satisfied by the "Named-animal proof" kicker. It now requires real animal names to appear.

## Second round (2026-07-29)

Steve's follow-up: stop the hero movement, lighten the hero, and fix the booking calendar.

- **Ken Burns removed** — the `animation` declaration and the `@keyframes` block are gone from `assets/site.css`, so the hero is static on every page. Verified live: `animationName: none`.
- **Hero lightened.** The veil was pulled back and more of the contrast work moved onto an ellipse tied to the copy block, so the photograph keeps its light. Worst-pixel contrast: h1 **4.08:1** (needs 3:1), subline **7.73:1**, trust line **7.87:1** — down from the too-dark 5.27 / 11.55 / 12.28 but still clear of AA.
- **The calendar was the defect, not the payment.** The booking APIs and live Square were healthy the whole time. `/book` shipped twelve month chips driven by a hard-coded season rule plus a bare date input; it defaulted to today (out of season half the year), and a month chip jumped to the 1st or 15th, which usually had no slots. Nothing ever showed which days were bookable. It now derives a month grid from `/api/booking/slots`: only days with openings are clickable, each shows its open-time count, the first genuinely available date is auto-selected, and month arrows are bounded by real availability. Party size filters the grid live and reports the real reason when it empties ("This experience takes up to 6 guests") instead of the old blanket "Closed for the season".
- **Three more bugs fixed in passing**: the off-season email button was permanently visible because an inline `display:inline-block` outranked the `hidden` attribute; `book.html` carried eight mojibake sequences that rendered as `Loading experiencesâ€¦` and `$20/pp Â·`; and `animals.html` and `experiences.html` had the same duplicate nav handler in a two-line form the first sweep's grep missed, so the mobile menu was dead on four of six pages, not two. The `keyboard-audit.mjs` guard now covers all eleven routes.
- **Visit guide rewritten.** The closed-toe-shoe line claimed the rule applied only to Coffee with the Cows; per Steve it applies anywhere on the farm, and `docs/visit-faq.md` is corrected with that attribution. The guide also now answers "When is the farm open?", which nothing on the site previously did.

Published as release `23d0c3ca675c71af1693bc5073835534dea57369f7f365f139fc1b36c4099226` on 2026-07-29. All eleven routes return 200, and the live calendar renders the four September Saturdays the API reports. Home-page image payload measured **139 KB** on the live site, against 528 KB of originals before this work.

## Third round (2026-07-29) — call bar, social, proof

Closes two of the critique's P1s.

- **Thumb-zone call bar.** Injected by `site-shell.js` on every route except the two
  transaction pages and `rv-rentals`, which already owns the fixed bottom slot. Two
  48px targets: call and directions. `footer { padding-bottom: 110px }` at ≤700px
  already reserved the space, so nothing is covered.
- **Social links** in the footer sitewide, and in the home-page proof band.
- **Proof band** on the home page, between the herd teaser and the story: the real
  Google rating (4.3 from 6 reviews, linked to the listing), a prompt to leave one,
  and the social handles with TikTok's ~14,000 followers named. Deliberately not a
  fifth bordered card grid — an asymmetric split band with a hairline divider.

What is **not** there: verbatim review quotes with names. Bright Data reached the SERP
and the knowledge panel (which is where the 4.3/6 came from) but Google's review
endpoints refused, and Hipcamp and Campendium have no reviews to pull. Nothing was
invented to fill the gap. Three real quotes pasted from the Google Business Profile
dashboard would drop straight into the band.

**A deployment defect surfaced and was fixed.** The first publish of the call bar went
live at the origin but did not reach browsers: `assets/*` is served with
`max-age=14400` while HTML is cached 60s, so returning visitors ran up to four hours of
stale `site-shell.js` against fresh markup. `scripts/build.mjs` now appends
`?v=<content hash>` to every first-party CSS/JS reference, making each deploy
self-busting while keeping the long TTL.

Released as `16a6006a…` then `e7ae93c6…` (the cache-busting build).

## Fourth round (2026-07-29) — the remaining backlog, and a re-audit

| # | Dimension | Was | Now | Note |
|---|---|---|---|---|
| 1 | Accessibility | 2/4 | **3/4** | Contrast fixed and measured, menu works, 44px targets. Calendar day cells land at 41px; the `main` overflow guard still clips the focus glow. |
| 2 | Performance | 3/4 | **4/4** | AVIF on every image that has a variant, content-hashed asset URLs, no third-party requests. |
| 3 | Responsive | 2/4 | **3/4** | Editorial block and mid-band squeeze fixed; a 2px pseudo-element overflow remains on experiences at 320px, caught by the `html` guard. |
| 4 | Theming | 2/4 | **4/4** | Duplicate hexes folded into named roles; an undeclared token bug found and fixed. |
| 5 | Anti-patterns | 3/4 | **3/4** | Four card grids still. Detector reports 3 warnings, all per-file scans blind to the shared stylesheet (see below). |
| **Total** | | **12/20** | **17/20** | **Good** |

Work in this round:

- **`highlandpair.jpg` (107 KB) now has AVIF/WebP variants** — 23 KB at 760w, 14 KB at 480w — wired into both the home page and the experiences card renderer. The four product images stayed as-is: they are 22–46 KB already and the featured set is data-driven, so pinning manifest entries to them would be brittle for little gain.
- **Token extraction.** `#5f5a48` / `#625e4c` / `#756f61` were three near-identical greys doing one job; they collapsed into `--muted-deep`. `--alert`, `--ok`, `--field-bg`, `--field-border` and `--placeholder` name the roles that had grown a second undeclared palette. **This surfaced a live bug**: `book.html` referenced `var(--surface)`, which is declared nowhere, so the booking form's inputs had no background and the calendar shell had no tint. Both now use declared roles.
- **The Animals / Meet the Herd confusion turned out to be a mis-route, not a label nit.** `meet-the-herd.html` is the *game*; `animals.html` is the animal directory. The home page's herd teaser named five real alpacas, promised "come meet them", and linked to the quiz, as did the "Meet the Herd" hub card whose copy described animal profiles. Both now go to `animals.html`; the nav item is labelled "Herd Game"; the game keeps a secondary link from the teaser.
- **Third telling of the story removed.** The "About Tapestry Acres" half of the contact block was a generic restatement of Our story. That slot now answers *when are you open*, which nothing on the page did.
- **Gift certificate buttons** name what they buy instead of offering three identical "Shop gifts" that resolve to one URL. **JSON-LD `priceRange`** corrected from `$25–$100` to `$20–$270`, which covers the $200 certificate and the $270 RV night.
- **The overflow guard: tried, reverted, deliberately.** Lifting `main{overflow:hidden}` to see what it was masking immediately exposed a real 61px horizontal overflow — the home hero's own contrast scrim, which deliberately overhangs the copy block. That is now fixed at source with `.home-hero{overflow:hidden}`. A 2px pseudo-element overflow on experiences at 320px also appeared. With both known, the guard went back: its cost is a clipped focus glow, and that is the smaller risk on a live site whose full page-by-viewport matrix is not machine-verified. Recorded rather than quietly dropped.
- **The breakpoint ladder was not consolidated.** It spans 430/470/480/520/560/600/620/700/760/820/850/860/900/1100 across nine files. The defects it actually caused are fixed, and a fourteen-rung refactor without a pixel-diff harness is how a working site breaks. Left deliberately.

**Detector: 3 warnings, all classified false positive.** `single-font` on `index.html:84` reads only the page-local `<style>` block, where `--serif` happens to be the sole family named; the site pairs Georgia with Arial in `site.css`. `flat-type-hierarchy` on `animals.html:20` and `book.html:12` measures utility and form microcopy scales (13–23px) and cannot see the h1/h2 `clamp()` hierarchy that lives in the shared stylesheet. Nothing was restyled to satisfy a per-file scan.

**Page height grew** from 8,816px to 9,797px on a phone. The proof band accounts for 647px of that. Real social proof for the extra scroll is a trade worth making; it does mean the page is now 12 screens.

## Recommended actions

1. **[P0] `/impeccable adapt`** — kill the duplicate nav handler, fix the hero scrim, collapse `.editorial-sequence`, raise touch targets to 44px.
2. **[P1] `/impeccable layout`** — move the two-column stacking breakpoint to ~860px, fix the 4-into-3 product grid, keep gift certificates 3-up on tablet.
3. **[P1] `/impeccable optimize`** — re-export the hero at 2000px, add `srcset`, add intrinsic dimensions, drop `cache:'no-cache'`, stop the infinite Ken Burns.
4. **[P2] `/impeccable extract`** — fold the ~20 stray hexes into the token set.
5. **[P3] `/impeccable clarify`** — replace "Named-animal proof".
6. **[P3] `/impeccable polish`** — final alignment and consistency pass.
