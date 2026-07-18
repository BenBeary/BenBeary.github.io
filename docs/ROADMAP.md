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

### M4 — Site pages  ✅ complete
- [x] `js/site/data.js` (Promise cache, ?v= cache-bust, renderDataError), `media.js` (derived-url
      transforms + setImg onerror-fallback + click-to-play video + singleton lightbox),
      `richtext-sanitize.js` (ported CADRE whitelist), `blocks.js` (shared renderer, all 9 types)
- [x] `projects.html` + page-projects.js — collection tabs + skill chips, pushState re-render
- [x] `project.html` + page-project.js — hero (bg/kicker/title/tags/play/summary), showcase pinned,
      blogs newest-first 5 + "Load more"
- [x] `post.html` + page-post.js — back-link, title/date, body via shared renderBlocks
- [x] `role.html` + page-role.js + `content/roles/gameplay-programmer.json`
- [x] `css/pages.css` + `css/components.css` (blocks, video, lightbox); `tools/serve.mjs` dev server
- [x] Verify (headless Edge via node dev server on :8137): projects?cat=programming → 10 cards,
      Programming active, all card imgs `_derived/*.thumb.webp` (0 raw png/jpg/mp4); hub renders
      hero+showcase; post → 2 headings/5 bullets/16 gallery thumbs/1 video poster, post body 0 raw
      full-res (only 3 tiny footer icons are raw png); role → 4 features/10 bullets; empty
      game-jams collection → no-match note; all-projects → 11; CSS brace-balanced. **Note:** lightbox
      open + video swap are click-driven — structurally present and wired; eyeball in Live Server.

### M5 — Editor v1  (owner = BenBeary, repo = BenBeary.github.io)
Broken into sub-milestones — each a committable, verifiable unit.

**M5a — Auth + API + editor shell**  ✅ complete
- [x] `Editor/github-api.js` (copied verbatim — uses auth.js globals; ghBatchCommit = publish primitive)
- [x] `Editor/auth.js` (adapted: owner=BenBeary, repo=BenBeary.github.io; AES-GCM at-rest +
      keep-logged-in + expiry chip + sign-in modal kept; page-role/redirect/collaborator/contributor
      removed; validate = GET /user → login===owner → repo push check; fires 'auth:changed')
- [x] `Editor/index.html` + `editor-index.js` + `editor.css` — sign-in chip/modal + project/post/
      draft picker (reuses ../css tokens/base/components; data via ../js/site/data.js, data-root="../")
- [x] Verify: signed-out prompt + chip + modal render headless; all editor JS passes node --check.
      NOTE: signed-in picker + real token flow need a PAT — deferred to M5d end-to-end test.

**M5b — Block editor + live preview**  ✅ complete
- [x] `Editor/edit.html` + `editor.js` + `blocks-edit.js` — EDBLOCKS registry (all 9 types:
      defaults/renderBody/syncFromDOM), up/down reorder (drag deferred — buttons are equivalent),
      rich-text mini-toolbar (bold/italic/underline/list/link via execCommand + paste sanitize),
      meta form (type/title/slug/date/excerpt/cover, auto-slug). Live preview via shared
      `../js/site/blocks.js` → **preview == production**. Local autosave to localStorage already
      wired (key `pf.editor.draft.<project>.<slug>` + index `pf.editor.drafts`).
- [x] Verify (headless): edit signal-link showcase → 7 editor blocks + preview shows 2 headings/
      16 gallery/1 video poster with _derived paths (matches post.html); new post → 0 blocks, 9
      add buttons. Interactive typing/reorder/rich-text/save are input-driven — eyeball in Live Server.

**M5c — Drafts + image upload**
- [ ] `Editor/drafts.js` (localStorage autosave/list, CADRE pattern, keyed draft:<project>:<slug>)
- [ ] `Editor/upload.js` (Contents PUT to images/<Project>/, warn > 4 MB, onerror fallback covers
      missing derivatives)

**M5d — Publish + manage**
- [ ] Publish = `ghBatchCommit` of post JSON + projects.json (upsert post entry), bump `contentVersion`
- [ ] `Editor/manage.html` — forms over project meta/order/collection/status, categories, roles
- [ ] Verify (needs real PAT — user runs): sign in → publish a test blog post → appears on its hub
      after CDN refresh (~10 min); then delete or keep

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
