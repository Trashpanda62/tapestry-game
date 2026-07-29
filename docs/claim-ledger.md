# Tapestry Acres claim ledger — S2 baseline

| claim/data | authority | routes | status |
|---|---|---|---|
| working family farm; 110 acres; Monroe TN | `index.html` JSON-LD + live Obscura baseline + `README.md` | Home | approved; retain source wording |
| 6 experiences; 5 live booking calendars; 5 Square checkout links | `experiences.json` + `build-content-pack.mjs` | Visit/Experiences | approved; seasonal placeholder removed |
| 8 animal groups; named/unnamed records | `animals.json` + content pack | Animals | approved; preserve spellings/nulls |
| 242 display families; 830 SKUs; Square checkout per SKU | `store-products.json` + `generate-catalog.mjs` | Shop | approved; family aliases documented in generator |
| RV: $270/night; 10% weekly; 50% reservation deposit; 24h balance; $500 refundable incidental; $400/50mi + $4/mi | current `rv-rentals.html` + `build-content-pack.mjs` exact-fact guards | Stay/RV | approved; stale `$220/wk`, `$80`, `$300` values forbidden |
| contact/NAP: Tapestry Acres; (931) 823-3266; tapestryacres@gmail.com; 396 Taylor Crossroads Rd, Monroe TN US | `index.html` LocalBusiness JSON-LD + content pack | Footer/contact | approved |
| grooming, accessibility, weather, availability, cancellation, permitting, child-policy assurances | no verified authority in checked inputs | all | forbidden; route to inquiry/contact |

Source conflicts fail the build/data gate; this ledger never authorizes inventing a third value. `build-content-pack.mjs` is the executable linter for structured claims and current RV/NAP facts.
