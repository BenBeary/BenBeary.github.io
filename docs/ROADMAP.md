# Portfolio Redesign — Roadmap

> **Every session: read this file and `docs/ARCHITECTURE.md` before doing any work.**
> This redesign spans multiple sessions. State = whatever boxes are checked below.
> Never re-do checked work; never skip ahead past an unchecked milestone.

## Session opening ritual

1. Read this file + `docs/ARCHITECTURE.md` (the contracts — schemas, module APIs, rules).
2. `git log --oneline -10` to see where things stand (commits are prefixed `Redesign M<N>:`).
3. Start a local server and click through the pages built so far. `fetch` of JSON fails on
   `file://`, so a local server is mandatory. **This machine has no Python and (as of M0) no
   Node** — use VS Code's Live Server extension (installed: `ritwickdey.liveserver` — right-click
   an HTML file → "Open with Live Server"). Note it injects a small reload script into served
   HTML (dev-only, harmless). Once Node is installed (M2), `npx serve` also works.
4. Continue at the **first unchecked box**. Finish a milestone → verify → commit → tick the box.

## Ground rules (full list in ARCHITECTURE.md)

- Vanilla JS + CSS only, no build step, no site-side npm deps (npm only inside `tools/`).
- **Do NOT modify the legacy site** until Milestone 6's swap: `index.html`, `js/newWebMain.js`,
  `js/projects.js`, `css/newWebStyle.css`, `css/navbar.css`. The old site stays live throughout.
- Never rename/move files under `images/`. Derivatives live in `images/_derived/` mirroring the tree
  (one top-level `images/` folder; the pipeline walk skips `_derived/`).
- Content reads → `js/site/data.js`; media paths → `js/site/media.js`; block rendering →
  `js/site/blocks.js` (shared with the editor preview — never fork it).
- Schema/API changes require editing ARCHITECTURE.md in the same commit + a changelog note below.
- Commit messages: `Redesign M<N>: <what>`.

## Milestones

### M0 — Bootstrap docs
- [x] `docs/ROADMAP.md` (this file)
- [x] `docs/ARCHITECTURE.md` (contracts)
- [x] `CLAUDE.md` pointer at repo root
- [x] `docs/reference-cadre/` — the reusable CADRE editor source (auth.js, github-api.js,
      post-gen-richtext.js) copied in so future sessions don't need the original chat transcript

### M1 — Foundation: tokens + partials + about page  ✅ complete (commit after this)
- [x] `css/tokens.css` — all custom properties; dark+amber identity extracted from `css/newWebStyle.css`
- [x] `css/base.css` — reset, typography, header/footer chrome
- [x] `css/components.css` — buttons, chips, cards, panels, social row (shelves/lightbox/block
      styles deferred to their milestones — M6/M4 — but they belong in this file)
- [x] `css/pages.css` — started here with the About-page layout (M4 appends the other pages)
- [x] `js/site/partials.js` — injected header/footer, `{{root}}` via `body[data-root]`, mobile
      toggle, active-nav marking, progressively-enhanced Projects dropdown (plain link until M3)
- [x] `about.html` — proving page; bio/resume/CV/contact/socials ported from old index
- [x] Verify: headless Edge render confirms header+footer injected, slots consumed, About nav
      marked active, Projects dropdown degrades gracefully (projects.json fetch fails silently)

### M2 — Media pipeline  ✅ complete
- [x] Installed Node.js LTS (v24.18.0, npm 11.16) via winget. NOTE: not on PATH — invoke as
      `C:\Program Files\nodejs\node.exe` or prepend `$env:Path = "C:\Program Files\nodejs;" + $env:Path`
- [x] `tools/package.json` (sharp 0.34.5, ffmpeg-static 5.3 → ffmpeg 6.1.1) + `tools/.gitignore`
      (node_modules, package-lock). npm 11 warns install scripts are gated but sharp/ffmpeg binaries
      installed fine; verify with the sharp import + `ffmpeg -version` checks if re-installing.
- [x] `tools/optimize-media.mjs` — idempotent (skip when output newer than source); collision guard;
      thumb(480/q70) + md(1280/q78) webp, poster.webp @1s, opt.mp4 for sources > 20 MB
- [x] Ran it; committed `images/_derived/` (249 derivatives, 16.8 MB)
- [x] Verify: 120 thumb + 120 md + 6 poster + 3 opt, 0 errors; 13.3 MB PNG → 19 KB thumb;
      54 MB mp4 → 4.9 MB opt; re-run skipped all 249 (idempotent)

### M3 — Migration  ✅ complete
- [x] `tools/migrate-projects.mjs` — parses `js/projects.js` via `new Function`; explicit SLUGS map
      (keys/folders don't kebab-case cleanly); title split (kicker/Game:/Modded Map:/[brackets]);
      rankings→categories+order dropping the `10` hide-sentinel; home order = 6 most recent by date;
      collection defaults to `main`. Refuses `--write` if any referenced media is missing.
- [x] Ran `--write`: content/projects.json + 11 showcase posts
- [x] Verify: all 12 JSON files parse; all 112 referenced media exist on disk; **11** projects/posts
      (the earlier exploration's "12" was a miscount — js/projects.js has 11 keys). Spot-checked
      projects.json + signal-link showcase: schema-correct, curly quotes + spaced filenames intact.

### M4 — Site pages
- [ ] `js/site/data.js`, `media.js`, `richtext-sanitize.js`, `blocks.js`
- [ ] `projects.html` + page-projects.js (`?cat=` and `?collection=` filters)
- [ ] `project.html` + page-project.js (showcase pinned; blogs newest-first, 5 + "Load more")
- [ ] `post.html` + page-post.js
- [ ] `role.html` + page-role.js + one sample `content/roles/*.json`
- [ ] `css/pages.css`
- [ ] Verify: all 12 hubs/showcases render; Network tab shows no mp4/full-res on initial load;
      lightbox + click-to-play work; filters work

### M5 — Editor v1
- [ ] `Editor/github-api.js` (port from docs/reference-cadre; change owner/repo constants)
- [ ] `Editor/auth.js` (port; owner-only — delete collaborator + page-role/redirect code)
- [ ] `Editor/edit.html` + `editor.js` + `blocks-edit.js` (BLOCK_TYPES registry pattern;
      drag reorder; rich text) with live preview via shared `js/site/blocks.js`
- [ ] `Editor/drafts.js` (localStorage autosave, CADRE pattern)
- [ ] `Editor/upload.js` (Contents PUT to `images/<Project>/`, warn > 4 MB)
- [ ] Publish = `ghBatchCommit` of post JSON + projects.json, bump `contentVersion`
- [ ] `Editor/manage.html` — forms over project meta/order/collection, categories, roles
- [ ] `Editor/index.html` — sign-in + project/post/draft picker
- [ ] Verify: real PAT sign-in → publish a test blog post → appears on its hub after CDN refresh

### M6 — Home + swap (go-live)
- [ ] `home.html` — intro → Featured shelf (`order.home`) → per-collection shelves
      (CSS `scroll-snap-type: x mandatory`) → about section
- [ ] On user approval: `git mv index.html Archived/old-index.html`; rename `home.html` → `index.html`;
      delete `js/newWebMain.js`, `js/projects.js`, `css/newWebStyle.css`, `css/navbar.css`
- [ ] Verify: full click-through from new home locally, then live site after push

### M7 — Roles + polish
- [ ] Real role JSONs for target job titles
- [ ] Per-page `document.title` + OG meta defaults; `404.html`; favicon
- [ ] Lighthouse pass on home + one hub (record scores in changelog)
- [ ] Optionally prune `Archived/`

## Changelog (schema/API/decision changes — append, newest last)

- M0: Initial plan committed. Content model, schemas, module APIs frozen in ARCHITECTURE.md.
- M0 audit: corrected environment docs — this machine has no Python and no Node; local server is
  VS Code Live Server; Node LTS install added as the first M2 checkbox.
- M1: `css/pages.css` was created in M1 (holds the About-page layout); M4 extends it rather than
  creating it. Headless Edge (`msedge --headless=new --dump-dom` over a `file://` URL) is a usable
  render-verification path on this machine when the page's JS doesn't depend on `fetch` succeeding.
- Post-M2 (user request): derivatives moved from a top-level `media/` folder into `images/_derived/`
  so everything stays in one `images/` folder. `media.js` transform (M4, not yet written) inserts
  `_derived/` after `images/`. Pipeline OUT_ROOT + SKIP_DIRS updated; ARCHITECTURE contract updated.
- M3: legacy data has **11** projects, not 12. Slugs are an explicit hand-map (see SLUGS in
  migrate-projects.mjs) — `dice-climber`, `dodge-kart`, `meoware-defender`, `idol-of-ashes`, etc.
  Migrated alt text is placeholder ("<title> key art" / "screenshot N") — refine in the editor.
  Game-jam candidates flagged by the script: idol-of-ashes, death-tides, signal-link (still
  collection:"main" — re-tag in M5's manage page). Home-featured = 6 most recent (tunable).
