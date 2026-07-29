# Screen-reader narrative review

Date: 2026-07-21  
Scope: generated locked production routes.

- The Home hero names the host-and-guest moment and associates its region with the H1; booking and stay actions are distinct.
- Animals explicitly says it is the reference/for-sale guide and points to Meet the Herd as the interactive personality journey.
- Visit/Experiences exposes a loading/live result region and a visible FAQ; unknown weather, accessibility, availability, cancellation, and child-policy facts route to contact rather than invented answers.
- Shop exposes labelled search/sort controls, a polite result count, a status region, and Square links that announce new-tab navigation.
- Stay/RV keeps “Bring your own RV” and “Supplied RV rental” as separate choices, exposes availability as a status, and labels the request form.
- Herd dialogs/iframe carry spoken titles, modal labels, close controls, and focus guards; emoji is supplementary, not the only name.
- Shared and Herd-specific reduced-motion overrides disable animation/transition when requested.

`node scripts/screen-reader-audit.mjs` PASS. A real screen-reader session is not available in the in-app browser, so S14 acceptance still includes an independent AT walkthrough.
