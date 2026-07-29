# Tapestry Acres live handoff

## Canonical URL

https://sites.obscurastudio.design/s/tapestry-acres

## Current release (live)

- Release hash: `e7ae93c6cde5602177e6216bf472f5592c4f1521c4eb8ae429db1223edd1ac7d`
- Published: 2026-07-29. 771 files, 35,761,847 bytes.
- Adds the thumb-zone call bar, footer social row, home-page proof band, and
  content-hashed asset URLs.
- Rollback targets, newest first: `16a6006ab9f324315ca8568d8704d6e2f49514bd7ca0bf68627b198dfacf7300`,
  `23d0c3ca675c71af1693bc5073835534dea57369f7f365f139fc1b36c4099226`,
  `89028fadd05ee9797d48965bd83e8d62a9a8badbe1ea8b7bdfda05cba2e9726f` (pre-July-29 state)

### Verified external references

Point-in-time facts baked into the pages. Re-check before assuming they still hold:

| What | Value | Where it appears |
|---|---|---|
| Google listing | maps cid `12843989383253935347` | proof band, footer |
| Google rating | 4.3 from 6 reviews (2026-07-29) | proof band |
| TikTok | `@tapestry.acres`, ~14,000 followers (2026-07-29) | proof band, footer |
| Instagram | `@tapestryacres` | proof band, footer |
| Facebook | `/tapestryacres` | proof band, footer |

`tapestryacres` without the dot is **not** a real TikTok account; only the dotted
handle resolves. No `aggregateRating` structured data was added: Google discourages
self-serving review markup on your own business and it risks a manual action.

### Cache busting

Built HTML references `assets/*.css` and `assets/*.js` as `?v=<first 8 of the file's
sha256>`. The bundle is served with `Cache-Control: public, max-age=14400` while HTML
is only cached 60s, so before this a returning visitor could run four hours of stale
CSS/JS against fresh markup. That is exactly what happened on the first deploy of the
call bar: the origin had the new shell, browsers kept the old one.
- Lock unchanged: `documentary / pasture-ochre / sturdy-slab / painted-sign / accent / comfortable / lively / rail`
- Contents: impeccable adapt/layout/polish/optimize passes, the availability-calendar
  rebuild on `/book`, the hero motion removal and contrast scrim, and the rewritten
  visit guide. See [impeccable-audit-2026-07-28.md](impeccable-audit-2026-07-28.md).

### Publishing

The publisher lives in the Webstudio repo, not this one, and runs inside the app
container on the TrueNAS host (that is where `MINIO_*` and `DATABASE_URL` are set —
they are not in any local `.env`):

```
tar -cf - -C dist . | ssh root@10.42.0.37 'mkdir -p /tmp/tapestry-dist && tar -xf - -C /tmp/tapestry-dist'
scp <webstudio-repo>/scripts/publish-static-bundle.mjs root@10.42.0.37:/tmp/
ssh root@10.42.0.37 'docker cp /tmp/publish-static-bundle.mjs webstudio-app-1:/app/ && docker cp /tmp/tapestry-dist webstudio-app-1:/app/'
ssh root@10.42.0.37 'docker exec -w /app webstudio-app-1 node publish-static-bundle.mjs \
  --slug tapestry-acres --name "Tapestry Acres" --dir /app/tapestry-dist \
  --origin https://sites.obscurastudio.design --release-id <npm run test:acceptance hash> --activate'
```

The script must run from `/app` so Node resolves the container's `node_modules`.
Release objects are immutable (`IfNoneMatch: '*'`) and the `active.json` pointer is
written last, so an interrupted upload cannot go live. Remove `/app/tapestry-dist`
and the copied script from the container afterwards.

Rollback is pointer-only and instant:

```
docker exec -w /app webstudio-app-1 node publish-static-bundle.mjs \
  --slug tapestry-acres --rollback 89028fadd05ee9797d48965bd83e8d62a9a8badbe1ea8b7bdfda05cba2e9726f
```

## Prior accepted release

- Release hash: `83dc83bcc6da1cdfa5e27ef5e1d1e2410a6775615415ef3ba0ef84541bddbb7d`
- Active pointer: same release hash, verified after rollback-fixture reactivation.
- Mobile visual QA: PASS at 375×667; tenant base path fixes the unstyled extensionless root route.
- Live smoke: [deployment-live-smoke.md](deployment-live-smoke.md)
- Readiness: [live-readiness.md](live-readiness.md)

## Handoff notes

- Home has LocalBusiness metadata, canonical/OG tags, sitemap, and robots.
- Experiences expose 7 cards: 5 Square checkout links and 2 inquiry fallbacks.
- Shop catalog is 242 families / 830 SKUs with bounded chunking and Square links.
- Public forms/events were not submitted during verification; invalid payloads were used for safe guards.
- No announcement, social post, email, directory submission, DNS cutover, or custom-domain activation was performed.
- Rollback remains pointer-only via the Webstudio publisher; old release objects are retained.
