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
- Never rename/move files under `images/`. Derivatives live in `media/` mirroring the tree.
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

### M1 — Foundation: tokens + partials + about page
- [ ] `css/tokens.css` — all custom properties; dark+amber identity extracted from `css/newWebStyle.css`
- [ ] `css/base.css` — reset, typography, header/footer
- [ ] `css/components.css` — cards, shelves, chips, buttons, lightbox, block styles
- [ ] `js/site/partials.js` — injected header/footer, `{{root}}` via `body[data-root]`
- [ ] `about.html` — proving page; port bio/resume/social from old index
- [ ] Verify: about.html renders with injected header/footer on local server

### M2 — Media pipeline
- [ ] Install Node.js LTS (NOT yet installed on this machine as of M0):
      `winget install OpenJS.NodeJS.LTS`, then restart the shell so `node`/`npm` resolve
- [ ] `tools/package.json` (sharp, ffmpeg-static)
- [ ] `tools/optimize-media.mjs` — idempotent; thumb/md webp + video poster + opt.mp4 (see ARCHITECTURE)
- [ ] Run it; commit `media/`
- [ ] Verify: summary table prints; thumb ~30 KB, poster + one .opt.mp4 exist; ~15–25 MB added

### M3 — Migration
- [ ] `tools/migrate-projects.mjs` — parse `js/projects.js`, emit `content/projects.json` +
      one `content/posts/<slug>/showcase.json` per project (dry-run default, `--write` to write)
- [ ] Run `--write`; commit content
- [ ] Verify: JSON parses; every referenced `src` exists on disk; 12 projects, 12 showcase posts

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
