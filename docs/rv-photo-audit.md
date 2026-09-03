# RV photo / image geometry audit

## Why this gate exists

The RV gallery rendered every photo **229 x 1203 px** — a column of stretched slivers.
Cause: the markup carries `width="1600" height="1203"` for layout stability, and those
attributes become *presentational hints*. A presentational hint outranks `aspect-ratio`
unless the author sets `height` explicitly. `.photo img` set `aspect-ratio:4/3` and no
`height`, so the attribute won and the ratio was ignored.

The same bug had already been fixed once on the home page cards. This gate makes the
invariant machine-checked instead of remembered.

## Rule

Any CSS rule targeting an `img` that declares `aspect-ratio` **must** also declare `height`.

## Rules checked

| Selector | Declares height |
| --- | --- |
| `.stay-figure img` | yes |
| `.photo img` | yes |

## Measured on the built page at 1280x900

| Group | Rendered | Ratio |
| --- | --- | --- |
| gallery photo (x6) | 229 x 172 | 1.33 |
| fleet photo (x2) | 243 x 152 | 1.60 |
| fleet render (x4) | 219 x 132 | 1.66 (contained inside a 1.60 frame) |

Fleet placeholder count: 0 — Max 1 previously rendered a "Photo unavailable" tile.
