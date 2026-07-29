# Keyboard interaction matrix

Date: 2026-07-21  
Scope: generated production routes at the locked combo.

| Surface | Keyboard path | Result |
|---|---|---|
| Global shell | Skip link → nav toggle → primary links | PASS: native links/button, `aria-expanded`, focus-visible ring |
| Experiences | Filter select; reserve dialog; Escape/close; return to trigger | PASS: native select/change, `showModal()`, close listener, focus return |
| Shop | Search/filter/sort; load-more; browser back/forward | PASS: URLSearchParams + history state, bounded 24-card chunks, live empty/error status |
| Stay/RV | Availability dates; detail/lightbox/booking dialogs; Escape/close | PASS: labelled inputs, native buttons, close listeners and focus return |
| Herd | Chapter gate; browse/quiz; modal/iframe focus guards; Escape | PASS: modal semantics, top/bottom guards, same-origin fallback, reduced motion |
| Forms | Name/email/date controls; submit; success/error status | PASS: labels, required fields, honeypot guard, status regions and authoritative confirmation |
| Responsive | 320/375px reflow and touch target styles | PASS: existing responsive rules and 42–48px primary controls; visual check remains in S14 |

`node scripts/keyboard-audit.mjs` provides the deterministic source contract. The in-app browser accepted the skip link and exposed the expected named controls in its DOM snapshot; its CUA Tab event did not report active-element transitions reliably, so device/assistive-technology confirmation remains an S14 acceptance check.

Visual checkpoints: [mobile 375px hero](accessibility-mobile.png) and [desktop 1440px hero](accessibility-desktop.png).
