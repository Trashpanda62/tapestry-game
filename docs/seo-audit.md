# SEO / discoverability audit

Date: 2026-07-21  
Scope: six indexable canonical pages; 404/thanks are noindex utility routes.

- Unique title, description, canonical, OG title/description/image, and route-specific metadata are present on Home, Animals, Experiences, Herd, Stay/RV, and Shop.
- Home structured data is LocalBusiness with PostalAddress and GeoCoordinates. No invented aggregate rating/review count schema is present.
- Sitemap now contains exactly the six canonical URLs. 404, thanks, preview, and Herd internal assets are excluded. Robots points to the explicit Obscura sitemap URL.
- Monroe, Dale Hollow, and Upper Cumberland local intent appear in visible copy/metadata without keyword stuffing.
- Product/experience schema is generated from real catalog/experience data; no price or review claims are invented by the SEO layer.

`node scripts/seo-audit.mjs` PASS. Live crawl/indexation and OG rendering remain S14/S15 checks.
