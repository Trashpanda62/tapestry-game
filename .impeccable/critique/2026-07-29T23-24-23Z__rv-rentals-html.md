---
target: rv-rentals.html
total_score: 24
p0_count: 1
p1_count: 3
timestamp: 2026-07-29T23-24-23Z
slug: rv-rentals-html
---
Method: dual-agent (A: a538b280def57ac2d · B: a10c9c0d26e36318b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Picking check-in alone produced no feedback at all — fixed this pass. |
| 2 | Match System / Real World | 3 | Summary printed ISO dates; "Limited" fired when any single rig was taken — both fixed. |
| 3 | User Control and Freedom | 2 | **P0**: two arrow keys stranded the roving tabindex on a disabled cell and made the whole grid untabbable. Fixed. |
| 4 | Consistency and Standards | 2 | Availability panel enforced `min=today`; the form that sends the lead enforced nothing. Fixed. |
| 5 | Error Prevention | 2 | `rvform` validated true for reversed and past dates. Fixed. |
| 6 | Recognition Rather Than Recall | 2 | Calendar dates never reached the form except via one CTA of five. Fixed. |
| 7 | Flexibility and Efficiency | 3 | Real accelerators (arrow grid, month steppers, next-open jump, `#rv/<id>` deep links); arrow keys were broken. |
| 8 | Aesthetic and Minimalist Design | 2 | Seven consecutive card grids, nine identical centred h2s, three byte-identical Odyssey cards. Not addressed. |
| 9 | Error Recovery | 2 | `setTimeout(…,50)` reports "Request received" with no load/error handler on the cross-origin lead iframe. Not addressed. |
| 10 | Help and Documentation | 3 | Ten sourced FAQ answers, legend, campground list. Phone number was absent; added. |
| **Total** | | **24/40** | **Acceptable — significant improvements needed** |

Score reflects the state *at assessment time*, before this pass's fixes.

## Anti-Patterns Verdict

**LLM assessment:** the aesthetic passes, the structure does not. Nobody would say a model wrote the copy — Georgia + Arial with zero webfonts, and FAQ lines like "we would rather talk than keep your money" are not generated sentences. But the page has one layout idea repeated seven times: `stay-choice-grid` 2, `steps` 3, `stay-cards` 2, `fleet-grid` 6, `included` 6, `gallery` 6, `cross-sell-grid` 4, all on `var(--card)` + `var(--cardborder)` + `var(--shadow)` under nine centred h2s at the identical clamp and 88px margin. That is the "identical card grids" ban plus a uniform motion reflex on top. `--cream:#f7f4ec` is the named-in-SKILL.md warm-neutral tell, but `data-palette` is locked, so it is recorded, not actioned.

**Deterministic scan:** `detect.mjs --json rv-rentals.html` and `dist/rv-rentals.html` both returned **0 findings, exit 0** — and Assessment B established that result is close to meaningless. A canary file with `font-family:Inter` and a bounce easing returned exit 2, so the detector works; but it does **not** follow `<link rel="stylesheet">` despite its `--help` claiming it catches linked CSS, and neither target has any inline CSS. So the clean pass analysed 0 bytes of the 29 KB stylesheet. Not a clean bill — a coverage gap. No suppression involved: no `.impeccable/config.json`, no `impeccable-disable` comments.

**Visual overlays:** none. Screenshots failed throughout with "the Browser pane is not displayed, so the page is not compositing frames". No visual capture exists; every finding below is source reading plus JS measurement of real layout after `resize_window` took effect.

## Overall Impression

The infrastructure is honest and the copy has a pulse; the conversion path leaked at every seam. The calendar reads real data, gets timezone and exclusive-checkout semantics right, publishes its own staleness, and degrades to email when the fetch fails. Then the guest picks a range and the page throws it away. The single biggest opportunity is not visual: it is that this page asks a stranger for a 50% deposit while showing zero photographs of the farm, zero guests, and — until this pass — no phone number.

## What's Working

1. **The availability engine is real.** All arithmetic on integer day-numbers via `Date.UTC`, never `new Date(string)`, with the reasoning documented; the exclusive-checkout overlap test is exactly right, so a stay ending the 29th frees the 29th. Verified independently by both agents: Max 2 booked 6 Sep–4 Nov shows Nov 4 bookable.
2. **The FAQ rewrite is the best copy on the site.** The insurance answer dissolves the objection that most often kills an RV booking, by pointing out there is nothing to insure.
3. **Contrast discipline is real.** Every body-copy value clears 4.5:1 with room (6.40, 6.28, 6.73, 7.69, 12.07). The `--muted-deep` consolidation was done specifically to lift contrast on `--card`. This is the most common AI-design failure and the page does not have it.

## Priority Issues

- **[P0] Keyboard trap in the calendar** — arrowing onto a past/booked day dropped focus to `<body>` and left `tabindex="0"` on an unfocusable cell; 0 of 42 cells tabbable, no route back without a reload. Reachable in two keystrokes on the default view. **Fixed**: cells now use `aria-disabled` rather than `disabled`, so they stay focusable; the recovery guard excludes blanks; out-of-range arrows restore the previous month instead of stranding focus. Re-verified: focus never reaches `<body>`, one tab stop maintained throughout, zero cells carry the `disabled` property.
- **[P1] Dates and rig died between calendar and form** — only "Request this RV" carried them; the hero CTA, both stay-card CTAs and the mobile bar did not, and the form had no field for which RV at all. **Fixed**: shared `syncDatesToForm()` on every CTA, plus a hidden `rv` field carried into the message body.
- **[P1] Validation inversion** — the panel rejected past and reversed dates; the form that actually sends the lead accepted both, so the farm could receive stays ending before they start. **Fixed**: `min=today` mirrored onto the form inputs and a `setCustomValidity` cross-check; verified `checkValidity()` now false for a reversed range.
- **[P1] Zero social proof on a page taking a 50% deposit** — no testimonial, review, rating, guest name, host face or founder video; 14 images, all empty interiors and manufacturer renders. Not one alpaca, cow, pasture, or person, on a page selling "Alpacas out your window". **Not fixed — needs real assets from the owner.** Fabricating any of it is an automatic P0 under the absolute bans.
- **[P2] Seven identical card grids and three byte-identical fleet cards** — Max 3/4/5 differ only by `id` and `name`; the overview text even admits "One of three identical Odyssey bunkhouses". **Not fixed** — collapsing the fleet listing is the owner's call about how his fleet is presented, not a defect to unilaterally resolve.

Also fixed this pass, below the top five: "Request delivery" landed on a form pre-set to "On the farm"; every lead was attributed `source="meet-the-herd-game"`; the breadcrumb rendered "RV Rentals Farm Stays" because a sanitiser deleted the ampersand from an already-decoded `document.title` (site-wide); "Limited" amber fired on any single booking, painting 20 September days amber with 5 of 6 rigs free; selecting an RV silently wiped the guest's range and jumped months with no message; booked cards were dead ends and now say "next open 4 Nov 2026"; alt text read "a Entegra".

## Persona Red Flags

**Jordan (first-timer):** `<h1>` "Choose how you stay" names no product, place or price — a message-match miss against "RV rental Monroe TN". "Class A/B/C" pills appear on all six cards and the term is never defined. "Ask about BYO" opens a blank mail client. Clicking a check-in date produced no acknowledgement (fixed). The page said "call us" three times with no number anywhere (fixed).

**Riley (stress tester):** the P0 trap (fixed); form accepted impossible dates (fixed); selecting an RV silently destroyed the range (now announced); a lead could still be submitted for dates the page just called unavailable; submission always reports success regardless of endpoint state; refresh loses dates while `#rv/max-3` survives; `rv-1.jpg` appears in four places.

**Casey (distracted mobile):** no tap-to-call on the highest-intent page because `site-shell.js:84` skips the call bar wherever a `.mobile-cta` already exists (fixed — Call button added beside Request); `.hero-plaque .btn{display:none}` at ≤700px leaves the first screen showing a price and a deposit with nothing to tap; 11 inputs including two date pickers and a free-text address; no draft persistence, so an interruption loses everything.

## Minor Observations

- Two thank-you surfaces, one invisible: `return_to=/s/tapestry-acres/thanks` is injected while the form targets a 0×0 iframe and the inline `#confirmation` shows instead, so `thanks.html` renders where nobody sees it.
- `card.setAttribute('role','button')` on an `<article>` containing a real `<button>` — nested interactive content, and the `aria-label` suppresses price, class, sleeps and availability for AT users.
- The campground list (six parks with distances and hookup types) is the most useful content on the page and is three layers deep inside a modal.
- Deposit terms appear verbatim in four places; the cancellation policy appeared once, inside a closed `<details>` — now also beside the deposit ask.
- `.stay-choice-card .field-label` is a deliberate A/B label used twice, within the "one kicker" allowance — checked and cleared, not the banned every-section eyebrow.
- No `gclid`/click-ID in `allowedUtm`, so paid clicks cannot tie back to revenue.

## Questions to Consider

1. The differentiator is "Alpacas out your window" and there is not one photograph of an alpaca. Is this page selling a motorhome that four RVshare competitors also rent, or a night on a working Highland-cattle farm nobody else within 50 miles has?
2. `nextAvailableDate()` now backs every dead end on the page. Should the same treatment extend to the "0 of 6 open" case — offering the nearest range that does work, rather than only the nearest date?
3. Two of the three highest-impact conversion elements — a founder video and guest testimonials — cost one afternoon and a phone. The effort so far went into a timezone-safe six-unit availability engine. Which one actually gets a stranger to hand over a 50% deposit?
