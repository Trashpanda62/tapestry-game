# Live readiness

Read-only post-deploy check for https://sites.obscurastudio.design/s/tapestry-acres. Generated 2026-07-21T17:23:31.015Z.

- Decision: **PASS**
- Canonical routes, sitemap, and robots were fetched without form submission.
- Analytics asset points to the bounded same-origin __event endpoint; no accepted test event or lead was created.
- Lead notification code was verified by source path and remote env-name presence only; secret values were never read.
- Home OG title, description, image, and canonical tags are present.
- No Square destination was opened.

| Route | Status | Bytes | Lock attrs |
| --- | ---: | ---: | --- |
| / | 308 | 17 | n/a |\n| /experiences | 200 | 15092 | yes |\n| /shop | 200 | 18825 | yes |\n| /animals | 200 | 9825 | yes |\n| /stay | 200 | 38075 | yes |\n| /herd | 200 | 125289 | yes |\n| /thanks | 200 | 1271 | yes |\n| /sitemap.xml | 200 | 602 | n/a |\n| /robots.txt | 200 | 97 | n/a |
