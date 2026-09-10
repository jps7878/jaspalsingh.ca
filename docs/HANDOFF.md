# jaspalsingh.ca — handoff

Last updated 2026-09-09 (31 commits on `main`, latest `cd53f7a`). Site is LIVE at https://jaspalsingh.ca on GitHub Pages with a valid certificate and HTTPS enforced.

## What this is

Jas's personal brand site. Concept: an homage to Yu-Gi-Oh trading cards. Career roles and skills are rendered as physically convincing cards (brushed-metal frames, struck coins, recessed art windows, parchment text, holographic foil on the rare ones) on a honed-slate backdrop. Copy is plain and professional; the whimsy lives in the objects. Audience: people who look Jas up (peers, founders, recruiters).

## Repo and deploy

- Repo: `~/jaspalsingh.ca`, GitHub `jps7878/jaspalsingh.ca` (PUBLIC; Jas decided to stay public so free GitHub Pages works). Work directly on `main`; `git push origin main` deploys in about a minute.
- Zero-dependency Node generator: `node build.js` reads `content.json` and writes `index.html` (committed) plus `qa/detail.html`. Never edit `index.html` by hand.
- Domain: registered at Network Solutions; DNS there points the apex at the four GitHub Pages A records and `www` CNAME at `jps7878.github.io`. `CNAME` file in the repo pins the custom domain. GitHub auto-commits `CNAME` changes when the domain is touched via the API; if a push is rejected as non-fast-forward, `git fetch` and merge (a merge is safe with a dirty tree; a rebase is not).
- A Cloudflare migration (Cloudflare Pages + private repo) was discussed and parked once HTTPS worked. Steps are in the session history if Jas revisits it; the only motivation left is repo privacy.

## Files

- `content.json`: every string on the page. Hero (name, headline, tagline, bio, photo path, links with icons), career `cards` (7; RBC has `"hidden": true`), `skills` (10, flat array with `type` spell|trap|rare, `group`, optional `kindLabel`, `foil`), footer (set code, copyright, note, `madeWith` link to Claude Code).
- `build.js`: frame token table (`FRAMES`: eng, founder, ops, sales, spell, trap, rare), glyph coins, glyph-measured text fitting (name condensing, effect-text stepping), the card renderer `fullCard(card, kind, rel, opts)`, hero, skills shelf, footer, the slate backdrop CSS, the inline script (tilt, deal-in, ambient sweep, cursor light, inspect dialog). Content-free by design.
- `assets/art/placeholder-NN-<id>.svg`: code-drawn art per card (17 files). Real art is optional: drop `assets/art/art-NN-<id>.jpg` (1:1) and rebuild; the build prefers it when present. Jas is happy with the placeholders.
- `assets/logos/`: white company marks (sources in `SOURCES.md`). `assets/icons/`: LinkedIn, Qotiv marks for the link coins (mail and github icons remain on disk but are unused).
- `assets/photo.jpg` does not exist yet; the hero shows a "JS" initials tile until it does (square or 4:5 portrait, any size).
- `docs/superpowers/specs/2026-09-08-jaspalsingh-ca-design.md`: the design spec, kept current through every change.
- `reference/`: the approved two-card proof the engine grew from. `qa/` is gitignored scratch (renders, harnesses).

## Page, top to bottom

1. Hero: name (Space Grotesk), headline "Incentives Engineer at Anthropic. Founder, Qotiv.", tagline "10+ years in GTM. Now I engineer it.", a scale-story bio (Clio unicorn, Deel $30M to $1B ARR, Engine doubled sales team, Anthropic by role only), two coin links (LinkedIn https://www.linkedin.com/in/jaspalsingh4/, Qotiv https://qotiv.com), portrait slot on the right.
2. Experience: six cards, three per row: Anthropic (silver, foil), Qotiv (violet, foil), Engine (copper), Deel RevOps (copper), Deel AE (gold), Clio (gold). RBC card hidden.
3. Skills: intro line, one full-bleed scroll-snap shelf of ten full cards with prev/next buttons. Order: GTM Engineer (royal-blue Secret Rare, foil) first, then the compensation block (Comp Plan Design, Payout Controls, Comp Compliance & Governance, Data Integrity), then GTM in journey order (GTM Strategy, Funnel Mapping, Quota & Territory Planning, Account Management & CSM Flows), Data Analysis last. Set codes JS-EN008 to 017.
4. Footer: set code, copyright, ownership note, "Designed and built with Claude Code", the two coin links.

Motion: pointer tilt; deal-in entrance per section; one-directional foil sweep on the three foil cards (on landing, then about every 24s, one at a time); cursor-following light on the slate; click-to-inspect native dialog with FLIP flight, blurred dim, close button, selectable text. All off under reduced motion and touch where appropriate; page complete with JS disabled.

## Jas's standing rules (learned the hard way)

- Never publish claude.ai Artifacts; deliver in chat, repo docs, or local files. Open local pages in Chrome with `open -a "Google Chrome" <path>`.
- Main only, no branches or PRs. Commit with the Claude Code trailer.
- No Anthropic superlatives or revenue figures anywhere ("I do not want to get in trouble"). Describe Anthropic by his role only.
- No "Forward Deployed Engineer" wording. No Email or GitHub links (a friend's advice: harassment, and GitHub adds nothing to his profile).
- He decides from pictures, fast. For taste calls, render 3 or 4 variants as CSS overrides on page copies under `qa/`, build a PIL contact sheet, open the sheet and the live variants in Chrome, then ask. Rejected so far: flat CSS cards, light backdrop, walnut/linen backdrops, serif and grotesque display faces (Fraunces, Cormorant, Bricolage), a hand-laid tilt on shelf cards.
- Keep copy professional; the theme carries the whimsy. Themed labels are fine (Spell/Trap/Secret Rare); jokes in copy are not.

## QA workflow

Headless Chrome: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,3300 --screenshot=qa/desktop.png "file://$PWD/index.html"`. Headless clamps width to 500px, so phone renders go through `qa/_mobile.html` (an iframe at 390px). Use `--force-prefers-reduced-motion` for deterministic at-rest screenshots now that the deal-in exists; `--virtual-time-budget` does not reliably tick rAF/IntersectionObserver, so motion states need a real-time driver (a CDP script lived in the session scratchpad; recreate if needed). Read PNGs with the Read tool; crop with PIL. The Bash sandbox blocks network; use `dangerouslyDisableSandbox` for `curl`, `gh`, and `git push`.

To rebuild from the committed engine without disturbing an in-progress `build.js`: `git worktree add /tmp/wt HEAD && (cd /tmp/wt && node build.js) && cp /tmp/wt/index.html . && git worktree remove --force /tmp/wt`.

## Open items

1. **Projects section (next up).** Jas chose a "ledger" over cards: one row per project with name, company and years, a one-sentence outcome, two or three metric chips, and a small era-coloured metal marker. He still owes edits to the draft rows: (1) Global sales compensation program, Deel 2022-2025, ~500 reps; (2) Comp infrastructure for every variable role, Engine 2025-2026, sales team 2x; (3) Funnel and launch mapping, Deel; (4) Qotiv, founder, 2025-present, deal + usage-based comp platform, link qotiv.com; (5) Incentive systems at Anthropic, one line, no detail; (6) jaspalsingh.ca built with Claude Code; (7) optional side builds (macOS IPTV player in Swift, AI sports analysis tool, Pokémon ROM hack). Add `projects` to `content.json` and a `projectsSection()` to `build.js`; spec section to add.
2. Photo: `assets/photo.jpg` from Jas.
3. Optional real card art (prompts in `~/Desktop/jaspalsingh-card-art-prompts.md`); Jas is content with the placeholders.
4. Optional: Cloudflare Pages + private repo, if he wants the repo private.
5. Optional: inspect dialog could carry extra per-card content (outcomes, tools) if Jas writes it; a reviewer noted the enlarged card currently repeats text already read.

## Memory

Project memory: `~/.claude/projects/-Users-jassingh/memory/project-jaspalsingh-ca.md` (indexed in `MEMORY.md`). Keep it in sync with decisions.
