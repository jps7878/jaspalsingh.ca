# jaspalsingh.ca — handoff

Last updated 2026-10-29 (foil sweep removed to fix load lag in `4408b1e`; this handoff update follows it). Site is LIVE at https://jaspalsingh.ca on GitHub Pages with a valid certificate and HTTPS enforced.

## What this is

Jas's personal brand site. Concept: an homage to Yu-Gi-Oh trading cards. Career roles and skills are rendered as physically convincing cards (brushed-metal frames, struck coins, recessed art windows, parchment text, holographic foil on the rare ones) on a honed-slate backdrop. Copy is plain and professional; the whimsy lives in the objects. Audience: people who look Jas up (peers, founders, recruiters).

## Repo and deploy

- Repo: `~/jaspalsingh.ca`, GitHub `jps7878/jaspalsingh.ca` (PUBLIC; Jas decided to stay public so free GitHub Pages works). Work directly on `main`; `git push origin main` deploys in about a minute.
- Zero-dependency Node generator: `node build.js` reads `content.json` and writes `index.html` (committed) plus `qa/detail.html`. Never edit `index.html` by hand.
- Domain: registered at Network Solutions; DNS there points the apex at the four GitHub Pages A records and `www` CNAME at `jps7878.github.io`. `CNAME` file in the repo pins the custom domain. GitHub auto-commits `CNAME` changes when the domain is touched via the API; if a push is rejected as non-fast-forward, `git fetch` and merge (a merge is safe with a dirty tree; a rebase is not).
- A Cloudflare migration (Cloudflare Pages + private repo) was discussed and parked once HTTPS worked. Steps are in the session history if Jas revisits it; the only motivation left is repo privacy.

## Files

- `content.json`: every string on the page. Hero (name, headline, tagline, bio, photo path, links with icons), career `cards` (7; RBC has `"hidden": true`), `skills` (10, flat array with `type` spell|trap|rare, `group`, optional `kindLabel`, `foil`), footer (set code, copyright, note, `madeWith` link to Claude Code).
- `build.js`: frame token table (`FRAMES`: eng, founder, ops, sales, spell, trap, rare), glyph coins, glyph-measured text fitting (name condensing, effect-text stepping), the card renderer `fullCard(card, kind, rel, opts)`, hero, skills shelf, footer, the slate backdrop CSS, the inline script (tilt, deal-in, cursor light, inspect dialog). Content-free by design.
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

Motion: pointer tilt; deal-in entrance per section; cursor-following light on the slate; click-to-inspect native dialog with FLIP flight, blurred dim, close button, selectable text. All off under reduced motion and touch where appropriate; page complete with JS disabled.

## Performance (2026-10-25)

Jas reported the site "very slow to load" in every browser, on his Mac, and laggy even without scrolling. Root cause: the automatic foil sweep (`@keyframes pass` animating registered custom properties `--ax/--ay/--fo/--ga` on the foil cards, on landing and every ~24s). Custom-property animation cannot run on the compositor, so every frame restyled, repainted and re-rasterized all the blended foil layers (`mix-blend-mode` hard-light/overlay/color-dodge). Idle frame rate at 1512x982 @2x: ~38-41fps with the sweep, steady 60fps without. Fixed in `4408b1e` by removing the sweep (Jas's choice over rebuilding it); hover tilt, foil response to the hand, deal-in, cursor light and inspect unchanged.

Ruled out with measurements: network/DNS/redirects/IPv6 (122 KB page, ~0.2s), JavaScript (no long tasks), Chrome hardware acceleration (on), extensions (lag was in every browser), the `feTurbulence` noise textures (no measurable difference, even at 2x), Google Fonts `display=block`.

Rules for future motion: animate only `transform`/`opacity` on a pre-rendered layer; never loop an animation of custom properties that feed blended layers; measure idle fps before shipping any ambient effect.

Harness: `qa/perf/` (gitignored, CDP scripts, Node 25 built-in WebSocket). `node qa/perf/idle-h.mjs <url> <port>` = idle fps buckets, no input, @2x; `trace2.mjs` = load trace + raster totals + frame stats (env `THROTTLE=4` for CPU throttling); `smoke.mjs <url>` = foil hover + inspect dialog + console errors; `noscroll.mjs <url> <port> <w> <h>` = which on-screen cards get dealt without scrolling. Serve variants with `python3 -m http.server` from a copy of the repo; compare base vs a sed-edited `index.html` copy. Gotchas: headful test windows get throttled if occluded (use headless or `--disable-backgrounding-occluded-windows`); the first foil card's centre is below the fold at 982px tall, so scroll it into view before hover tests.

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

0. **Confirm the lag fix on Jas's Mac** (hard reload, Cmd+Shift+R). Still unexplained: in 3 of ~35 test loads a cold first load froze for 3-8s in GPU raster (`RasterDecoderImpl::DoEndRasterCHROMIUM`); never reproduced on demand, a blank control page never did it. If Jas still sees lag, get a DevTools Performance recording (Cmd+Opt+I, Performance, reload-and-record, save) and look there first. The first ~1s is still 30-45fps while the first row deals in.
1. **Projects section (next up).** Jas chose a "ledger" over cards: one row per project with name, company and years, a one-sentence outcome, two or three metric chips, and a small era-coloured metal marker. He still owes edits to the draft rows: (1) Global sales compensation program, Deel 2022-2025, ~500 reps; (2) Comp infrastructure for every variable role, Engine 2025-2026, sales team 2x; (3) Funnel and launch mapping, Deel; (4) Qotiv, founder, 2025-present, deal + usage-based comp platform, link qotiv.com; (5) Incentive systems at Anthropic, one line, no detail; (6) jaspalsingh.ca built with Claude Code; (7) optional side builds (macOS IPTV player in Swift, AI sports analysis tool, Pokémon ROM hack). Add `projects` to `content.json` and a `projectsSection()` to `build.js`; spec section to add.
2. Photo: `assets/photo.jpg` from Jas.
3. Optional real card art (prompts in `~/Desktop/jaspalsingh-card-art-prompts.md`); Jas is content with the placeholders.
4. Optional: Cloudflare Pages + private repo, if he wants the repo private.
5. Optional: inspect dialog could carry extra per-card content (outcomes, tools) if Jas writes it; a reviewer noted the enlarged card currently repeats text already read.

## Memory

Project memory: `~/.claude/projects/-Users-jassingh/memory/project-jaspalsingh-ca.md` (indexed in `MEMORY.md`). Keep it in sync with decisions.
