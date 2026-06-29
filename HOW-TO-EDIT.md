# Editing the Tapestry Acres site yourself

The site has a built-in visual editor — no tools, no code.

## Open the editor
Add `?edit` to the end of the URL:
- Local file: open `index.html` then add `?edit` in the address bar → `…/index.html?edit`
- Deployed: `https://your-site/?edit`

An **✎ EDIT** toolbar appears at the bottom and the gate opens straight to the farm.

## What you can do
- **Move the glowing pips & lanterns** — just drag them onto the right animal / spot. They stay put on every screen size.
- **Rewrite any text** — click a headline, paragraph, button label, etc. (they show a dashed outline) and type. Click away to keep it.
- **Swap a scene's photo** — use the 📷 dropdown at the top of each scene to pick a different background, **or click ⤴ to upload your own photo** from your computer. Uploaded photos are auto-shrunk for the web and saved right into the site when you Export (no need to copy files anywhere).
- **Move a plaque** — the **L / C / R** buttons set that scene's text box to the left, center, or right.

Your changes auto-save in the browser while you work, so refreshing (with `?edit` still on) keeps them.

## Save your changes for real
1. Click **💾 Export** → it downloads a file called `edits.js`.
2. Put that `edits.js` in the `tapestry-game` folder, **replacing the old one** (next to `index.html`).
3. Open the normal site (without `?edit`) — your changes are now live for everyone.

## Other buttons
- **⤺ Reset** — throw away unsaved tweaks and start over from the last saved version.
- **👁 Preview** — leave edit mode and see the site exactly as visitors do.

## Notes
- Available background photos live in `assets/bg/` (the real farm photos) plus the painted `assets/scene*.png` scenes — both show up in the 📷 dropdown.
- Editing is non-destructive: all your tweaks live in `edits.js`. Delete that file (or empty it to `window.TA_EDITS = {};`) to return to the original.
