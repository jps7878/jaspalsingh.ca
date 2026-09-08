# jaspalsingh.ca

Personal site for Jaspal Singh. Static, no framework, no dependencies.

- `content.json` holds every string on the page.
- `node build.js` renders `index.html` (and `qa/detail.html`). The rendered `index.html` is committed; GitHub Pages serves it as-is.
- Card artwork goes in `assets/art/` as `art-0N-<company>.jpg` (1:1). Until a file exists the build uses the matching `placeholder-0N-*.svg`.
- Headshot goes in `assets/photo.jpg` (square). Until it exists the hero shows an initials tile.
- Company marks live in `assets/logos/` (see `SOURCES.md` there).
- Design spec: `docs/superpowers/specs/2026-09-08-jaspalsingh-ca-design.md`. The approved two-card proof is in `reference/`.
