# UI/UX checklist

Date: 2026-07-21  
Applied with the UX fundamentals skill against the locked light `pasture-ochre` / `painted-sign` direction.

| Principle | Review |
|---|---|
| Signifiers | Active nav uses `aria-current`; links, buttons, selects, focus rings, and disabled states visibly communicate affordance. |
| Hierarchy | Documentary hero leads with family/working-farm H1, primary booking CTA, secondary stay CTA, then proof and intent cards. |
| Spacing/grid | Repeating catalog/experience/RV content uses responsive grids; editorial/story sections use larger separation and readable max widths. |
| Typography | Sturdy slab headings and humanist body font have a clear size/line-height hierarchy; headings use tight 1.08 line-height. |
| Color | Pasture/ochre ramp carries brand; red/green/yellow states also include text, labels, or icons so meaning is not color-only. |
| Shadows | Cards use a restrained shared elevation token; dialogs/lightboxes carry the stronger layer treatment. |
| Buttons/icons | Primary + secondary CTAs are paired; icon-only controls have accessible names and ≥44px hit areas. |
| States/feedback | Loading, empty, error, success, hover, focus, disabled, and live status paths are present and tested. |
| Image overlays | Hero media uses gradient convergence for legibility while preserving the documentary photo. |
| Motion | Accents are playful but `prefers-reduced-motion` removes transitions/animation; no bottom-tab bar competes with the farm IA. |

The checklist passes without turning the farm proof into a premium/theme-park treatment. `node scripts/ui-ux-checklist-audit.mjs` PASS.
