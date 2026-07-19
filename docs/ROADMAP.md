# Portfolio Redesign. Roadmap

> **Every session: read this file and `docs/ARCHITECTURE.md` before doing any work.**
> This redesign spans multiple sessions. State = whatever boxes are checked below.
> Never re-do checked work; never skip ahead past an unchecked milestone.

## Session opening ritual

1. Read this file + `docs/ARCHITECTURE.md` (the contracts, schemas, module APIs, rules).
2. `git log --oneline -10` to see where things stand (commits are prefixed `Redesign M<N>:`).
3. Start a local server and click through the pages built so far. `fetch` of JSON fails on
   `file://`, so a local server is mandatory. **This machine has no Python and (as of M0) no
   Node** - use VS Code's Live Server extension (installed: `ritwickdey.liveserver` - right-click
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
  `js/site/blocks.js` (shared with the editor preview, never fork it).
- Schema/API changes require editing ARCHITECTURE.md in the same commit + a changelog note below.
- Commit messages: `Redesign M<N>: <what>`.

## Milestones

### M0. Bootstrap docs
- [x] `docs/ROADMAP.md` (this file)
- [x] `docs/ARCHITECTURE.md` (contracts)
- [x] `CLAUDE.md` pointer at repo root
- [x] `docs/reference-cadre/` - the reusable CADRE editor source (auth.js, github-api.js,
      post-gen-richtext.js) copied in so future sessions don't need the original chat transcript

### M1. Foundation: tokens + partials + about page  ✅ complete (commit after this)
- [x] `css/tokens.css` - all custom properties; dark+amber identity extracted from `css/newWebStyle.css`
- [x] `css/base.css` - reset, typography, header/footer chrome
- [x] `css/components.css` - buttons, chips, cards, panels, social row (shelves/lightbox/block
      styles deferred to their milestones. M6/M4, but they belong in this file)
- [x] `css/pages.css` - started here with the About-page layout (M4 appends the other pages)
- [x] `js/site/partials.js` - injected header/footer, `{{root}}` via `body[data-root]`, mobile
      toggle, active-nav marking, progressively-enhanced Projects dropdown (plain link until M3)
- [x] `about.html` - proving page; bio/resume/CV/contact/socials ported from old index
- [x] Verify: headless Edge render confirms header+footer injected, slots consumed, About nav
      marked active, Projects dropdown degrades gracefully (projects.json fetch fails silently)

### M2. Media pipeline  ✅ complete
- [x] Installed Node.js LTS (v24.18.0, npm 11.16) via winget. NOTE: not on PATH - invoke as
      `C:\Program Files\nodejs\node.exe` or prepend `$env:Path = "C:\Program Files\nodejs;" + $env:Path`
- [x] `tools/package.json` (sharp 0.34.5, ffmpeg-static 5.3 → ffmpeg 6.1.1) + `tools/.gitignore`
      (node_modules, package-lock). npm 11 warns install scripts are gated but sharp/ffmpeg binaries
      installed fine; verify with the sharp import + `ffmpeg -version` checks if re-installing.
- [x] `tools/optimize-media.mjs` - idempotent (skip when output newer than source); collision guard;
      thumb(480/q70) + md(1280/q78) webp, poster.webp @1s, opt.mp4 for sources > 20 MB
- [x] Ran it; committed `images/_derived/` (249 derivatives, 16.8 MB)
- [x] Verify: 120 thumb + 120 md + 6 poster + 3 opt, 0 errors; 13.3 MB PNG → 19 KB thumb;
      54 MB mp4 → 4.9 MB opt; re-run skipped all 249 (idempotent)

### M3. Migration  ✅ complete
- [x] `tools/migrate-projects.mjs` - parses `js/projects.js` via `new Function`; explicit SLUGS map
      (keys/folders don't kebab-case cleanly); title split (kicker/Game:/Modded Map:/[brackets]);
      rankings→categories+order dropping the `10` hide-sentinel; home order = 6 most recent by date;
      collection defaults to `main`. Refuses `--write` if any referenced media is missing.
- [x] Ran `--write`: content/projects.json + 11 showcase posts
- [x] Verify: all 12 JSON files parse; all 112 referenced media exist on disk; **11** projects/posts
      (the earlier exploration's "12" was a miscount, js/projects.js has 11 keys). Spot-checked
      projects.json + signal-link showcase: schema-correct, curly quotes + spaced filenames intact.

### M4. Site pages  ✅ complete
- [x] `js/site/data.js` (Promise cache, ?v= cache-bust, renderDataError), `media.js` (derived-url
      transforms + setImg onerror-fallback + click-to-play video + singleton lightbox),
      `richtext-sanitize.js` (ported CADRE whitelist), `blocks.js` (shared renderer, all 9 types)
- [x] `projects.html` + page-projects.js, collection tabs + skill chips, pushState re-render
- [x] `project.html` + page-project.js, hero (bg/kicker/title/tags/play/summary), showcase pinned,
      blogs newest-first 5 + "Load more"
- [x] `post.html` + page-post.js, back-link, title/date, body via shared renderBlocks
- [x] `role.html` + page-role.js + `content/roles/gameplay-programmer.json`
- [x] `css/pages.css` + `css/components.css` (blocks, video, lightbox); `tools/serve.mjs` dev server
- [x] Verify (headless Edge via node dev server on :8137): projects?cat=programming → 10 cards,
      Programming active, all card imgs `_derived/*.thumb.webp` (0 raw png/jpg/mp4); hub renders
      hero+showcase; post → 2 headings/5 bullets/16 gallery thumbs/1 video poster, post body 0 raw
      full-res (only 3 tiny footer icons are raw png); role → 4 features/10 bullets; empty
      game-jams collection → no-match note; all-projects → 11; CSS brace-balanced. **Note:** lightbox
      open + video swap are click-driven, structurally present and wired; eyeball in Live Server.

### M5. Editor v1  (owner = BenBeary, repo = BenBeary.github.io)
Broken into sub-milestones, each a committable, verifiable unit.

**M5a. Auth + API + editor shell**  ✅ complete
- [x] `Editor/github-api.js` (copied verbatim, uses auth.js globals; ghBatchCommit = publish primitive)
- [x] `Editor/auth.js` (adapted: owner=BenBeary, repo=BenBeary.github.io; AES-GCM at-rest +
      keep-logged-in + expiry chip + sign-in modal kept; page-role/redirect/collaborator/contributor
      removed; validate = GET /user → login===owner → repo push check; fires 'auth:changed')
- [x] `Editor/index.html` + `editor-index.js` + `editor.css` - sign-in chip/modal + project/post/
      draft picker (reuses ../css tokens/base/components; data via ../js/site/data.js, data-root="../")
- [x] Verify: signed-out prompt + chip + modal render headless; all editor JS passes node --check.
      NOTE: signed-in picker + real token flow need a PAT - deferred to M5d end-to-end test.

**M5b. Block editor + live preview**  ✅ complete
- [x] `Editor/edit.html` + `editor.js` + `blocks-edit.js` - EDBLOCKS registry (all 9 types:
      defaults/renderBody/syncFromDOM), up/down reorder (drag deferred, buttons are equivalent),
      rich-text mini-toolbar (bold/italic/underline/list/link via execCommand + paste sanitize),
      meta form (type/title/slug/date/excerpt/cover, auto-slug). Live preview via shared
      `../js/site/blocks.js` → **preview == production**. Local autosave to localStorage already
      wired (key `pf.editor.draft.<project>.<slug>` + index `pf.editor.drafts`).
- [x] Verify (headless): edit signal-link showcase → 7 editor blocks + preview shows 2 headings/
      16 gallery/1 video poster with _derived paths (matches post.html); new post → 0 blocks, 9
      add buttons. Interactive typing/reorder/rich-text/save are input-driven, eyeball in Live Server.

**M5c. Drafts + image upload**  ✅ complete
- [x] `Editor/drafts.js` - listDrafts()/deleteDraft() over the index editor.js writes; 30-day prune.
      editor-index.js drafts section gains Resume + Delete; index.html loads drafts.js.
- [x] `Editor/upload.js` - window.EditorUpload.{uploadImage,pickAndUpload}: single Contents-API PUT
      to images/<projectFolder>/ (folder derived from the project's cover/background path), warns
      > 4 MB, GET-for-sha on overwrite. Inline ⬆ upload buttons on image/gallery/cover path inputs
      auto-fill the field. Missing derivatives covered by setImg onerror-fallback.
- [x] Verify (headless): 5 editor JS pass node --check; signal-link showcase shows 18 upload
      buttons (1 image + 16 gallery + 1 cover); preview intact; drafts.js loads clean. Actual
      upload + draft delete need a token/localStorage state, user verifies in Live Server.

**M5d. Publish + manage**  ✅ complete (code); end-to-end awaits user PAT
- [x] Publish (editor.js): GET freshest projects.json → upsert this post's entry (showcase replaces
      any existing showcase) → `ghBatchCommit` post JSON + projects.json in one commit → bump
      `contentVersion` → clear local draft. Publish button enabled with a confirm() guard.
- [x] `Editor/manage.html` + `manage.js` - per-project forms (title/kicker/status/collection/
      playLink/cover/background/date/tags/categories/order incl. home) + collection & category
      labels; "Save changes" commits projects.json (bump contentVersion). Owner-only.
      NOTE: role JSON editing NOT included in v1 (roles hand-edited or a small follow-up), the
      sample role + role.html render already work.
- [x] Verify (headless): editor.js + manage.js pass node --check; manage signed-out prompt + Save
      button; publish button enabled. **End-to-end (user, real PAT):** sign in → publish a test blog
      post → confirm it appears on its hub after CDN refresh (~10 min); then delete or keep.

### M5.5. CADRE parity pass  ✅ complete (user feedback after importing the CADRE editor)
The full CADRE source lives at `docs/reference-cadre/full-editor/` - port from it, don't reinvent.
- [x] Legacy site image fix, js/projects.js: 116 refs → images/Blog Images/
- [x] Paragraph block upgrade. CADRE toolbar (B/I/U, link modal + Ctrl+K, align L/C/R, bullet list
      + Tab indent, paste sanitize, loose-line wrapping); Bullets removed from the add bar
      (still render/edit-supported for migrated content)
- [x] Heading block on one line
- [x] Slideshow block, makeSlideshow() in media.js (stage + thumb strip, mp4 poster thumbs, gifs
      animate in stage, images → lightbox); editor form shares the gallery row helper
- [x] Project hub = slideshow + posts, project.media[] hoisted from showcases
      (tools/hoist-showcase-media.mjs); showcases kept their 4 write-up blocks; statuses seeded
      (signal-link In Development, rest Finished, flip per-project in Manage)
- [x] Preview: resizable split view, iframe (Editor/preview.html, site CSS only), drag handle
      (20–70%, persisted), 👁 header toggle; tool buttons moved into the header
- [x] Image system: CADRE-style browser, right-click Add images…/New folder…, OS-file drag onto
      folder rows, mp4 poster thumbs; ONE 📁 button per image field (uploads live in the browser)
- [x] Manage overhaul, cut-off fixed; manage.html?project=slug single view (⚙ Edit on landing);
      ➕ New project; 🗑 Delete project (+ its post JSONs on save); status DROPDOWN; collection
      select confirmed present/working (was hidden by the layout overflow)
- [x] Move post between projects. Project dropdown in editor meta; publish relocates post JSON +
      both index entries in one commit (slug renames relocate too)
- [x] Changes log. Editor/history.js 📜 modal (recent commits) on landing + manage
- NOT done (needs auth/user or push): live upload/new-folder/publish round-trips; the image
  browser & history read GitHub main, so they show pre-push state until the redesign is pushed.

### M5.6. CADRE parity pass #2  ✅ complete (second user feedback batch)
- [x] Merged origin/main (the user's live editor tests: "Old Work" project + Old_Work image folder)
      into the redesign; re-added Old Work in the current schema (collection misc, status Archived)
- [x] Persistent change queue. Editor/queue.js: every JSON mutation STAGES to localStorage (survives
      moving between editor pages + reloads); universal 📋 Changes header button + review modal;
      one-batch commit via ghBatchCommit (contentVersion bumped once); beforeunload guard on unsaved work
- [x] edit.html: 🚀 Publish → ✓ Add to changes (stages); 💾 Save draft button removed (silent autosave
      kept for crash recovery); reopening a staged post loads its queued version
- [x] Hub redesign, two-column card in the blurred box: left (title/date/tags/play/bullets) ~1/3,
      right (slideshow + summary) ~2/3; status stays top-right. project.bullets[] hoisted from showcases
      (tools/hoist-bullets.mjs)
- [x] Editable hub slideshow. Manage per-project media[] rows (📁 browse, add/remove/reorder) + bullets
      textarea (fixes "you just hard coded it, I need to edit it from the browser")
- [x] New Project moved to the editor landing (was Manage-only); newly created projects show there
      immediately (queue overlay); per-post 🗑 delete on the landing (stages entry removal + file delete)
- [x] Project dropdown / landing read EditorQueue.loadProjects() so new/removed projects appear at once
- [x] Manage sorts projects newest-first; History button removed (index + manage); Editor/history.js deleted
      (the queue is the change log; committed history lives on GitHub)
- [x] Image browser: gif/mp4 tagged (▶ MP4 / GIF badges), mp4 uploads allowed; folder create + upload
      insert optimistically (fixes "adding a folder doesn't update locally"), then reconcile with main
- [x] Small fixes: dark <select> styling (was white-on-white), themed + safe-centered slideshow thumb strip
- NOT done (needs auth/user): the actual GitHub commit from the 📋 Changes modal, and upload/new-folder
  round-trips. The browser still reads GitHub main, so it shows pre-push paths until the redesign is pushed.

### M6. Home + swap (go-live)
- [x] `home.html` - intro hero → Featured shelf (`order.home`) → per-collection shelves
      (CSS `scroll-snap-type: x mandatory`, ❮ ❯ arrows hidden when content fits) → about teaser.
      `js/site/page-home.js`; hidden projects excluded. Verified headless: 3 shelves render.
- [x] **Swap done (user approved).** `index.html` (carousel) → `Archived/Archived_carousel-index.html`;
      `home.html` → `index.html`. The four legacy assets were MOVED into `Archived/` rather than
      deleted, so the archived snapshot still runs (see changelog).
- [x] Verify: headless click-through of every page after the swap, all `data-error`-free.

### M7. Roles + polish
- [x] Real role JSONs: `level-designer`, `technical-artist`, `ui-ux-designer` (+ the existing
      `gameplay-programmer`), each with role-specific bullets drawn from the projects' own contributions.
- [x] Per-page `document.title` + canonical + OG/Twitter meta via `tools/add-page-meta.mjs`
      (idempotent, re-runnable); `404.html`; `favicon.svg` + PNG sizes; `images/og-image.jpg` (1200x630).
- [x] Performance pass (numbers in the changelog). Full Lighthouse was NOT run: it isn't installed
      and there's no package for it in `tools/`. Measured page weight and media sizes directly instead.
- [ ] Optionally prune `Archived/`

## Changelog (schema/API/decision changes, append, newest last)

- M0: Initial plan committed. Content model, schemas, module APIs frozen in ARCHITECTURE.md.
- M0 audit: corrected environment docs, this machine has no Python and no Node; local server is
  VS Code Live Server; Node LTS install added as the first M2 checkbox.
- M1: `css/pages.css` was created in M1 (holds the About-page layout); M4 extends it rather than
  creating it. Headless Edge (`msedge --headless=new --dump-dom` over a `file://` URL) is a usable
  render-verification path on this machine when the page's JS doesn't depend on `fetch` succeeding.
- Post-M2 (user request): derivatives moved from a top-level `media/` folder into `images/_derived/`
  so everything stays in one `images/` folder. `media.js` transform (M4, not yet written) inserts
  `_derived/` after `images/`. Pipeline OUT_ROOT + SKIP_DIRS updated; ARCHITECTURE contract updated.
- M5 feedback pass (user): editor redesigned, centered block form + right tool rail, live preview
  replaced by an on-demand Preview modal (shared renderer). Project images consolidated under
  `images/Blog Images/<Project>/` (site chrome stays at images/ root); all content paths rewritten
  (tools/rewrite-blog-images.mjs), derivatives regenerated. New `Editor/image-browser.js` - a
  GitHub-Trees-API image window scoped to `images/Blog Images/`, opened from the tool rail (copy
  path) or per-field 🔍 (pick into field). Sign-in key emoji → lock. **The browser reads GitHub
  `main`, so it reflects only what's been pushed, the redesign is still unpushed (local commits).**
- M3: legacy data has **11** projects, not 12. Slugs are an explicit hand-map (see SLUGS in
  migrate-projects.mjs) - `dice-climber`, `dodge-kart`, `meoware-defender`, `idol-of-ashes`, etc.
  Migrated alt text is placeholder ("<title> key art" / "screenshot N"), refine in the editor.
  Game-jam candidates flagged by the script: idol-of-ashes, death-tides, signal-link (still
  collection:"main" - re-tag in M5's manage page). Home-featured = 6 most recent (tunable).
- M5.5: **schema** - project gained `media[]` (hub slideshow) + `status` (enum: In Development |
  Prototype | Concept | On Hold | Finished | Released | Archived, free text still renders); new
  `slideshow` block (mixed png/jpg/gif/mp4). `bullets` block deprecated for authoring. Showcase
  visual blocks hoisted into project.media by `tools/hoist-showcase-media.mjs`.
- M5.6: **schema** - project gained `bullets[]` (hub hero left column), hoisted from showcase posts
  by `tools/hoist-bullets.mjs`. **API** - new `Editor/queue.js` (`window.EditorQueue`): all editor
  JSON mutations stage into a localStorage queue and commit in one batch; `contentVersion` now bumps
  once inside `EditorQueue.commit()` (not per stage-action). Editor reads route through
  `EditorQueue.loadProjects()` (committed main + queue overlay). Image uploads / new folders stay
  immediate Contents-API PUTs (binary can't live in localStorage) but insert optimistically in the
  browser. `Editor/history.js` deleted (queue replaces it; committed history is on GitHub). Hub hero
  is now a two-column card (info | slideshow+summary) over the blurred bg. `origin/main` (the user's
  two live editor test commits) merged in.
- M6 GO-LIVE: the redesign is now the site. `index.html` (carousel) moved to
  `Archived/Archived_carousel-index.html` and `home.html` was promoted to `index.html`. DEVIATION
  from the original plan: the four legacy assets (`newWebMain.js`, `projects.js`, `newWebStyle.css`,
  `navbar.css`) were MOVED into `Archived/` instead of deleted, matching how that folder already
  keeps assets beside its snapshots; the archived page's refs were repointed (same-folder css/js,
  `../images/` for the 116 image paths in its `projects.js`) and it was verified to still render a
  live project title and its 22 catalogue cards. `page-home.js` pushState now targets `index.html`.
- M7: role pages (`level-designer`, `technical-artist`, `ui-ux-designer`) written from each project's
  real contribution bullets. `tools/add-page-meta.mjs` injects canonical + OG/Twitter + favicon links
  into all 7 pages between marker comments, so it can be re-run safely. Icon hrefs are root-absolute
  because `404.html` is served for URLs at any depth (it also sets `data-root="/"` so the injected
  header/footer links stay absolute).
- M7 performance: no Lighthouse available on this machine, so weight was measured directly.
  `OPT_MP4_THRESHOLD` lowered 20 MB → 8 MB now that slideshow videos autoplay, and all 6 clips are
  encoded: originals total 154.2 MB but the browser now fetches 16.2 MB (e.g. Signal-Link 33 MB →
  2.6 MB, Spirit Outbreak video1 16 MB → 0.8 MB). Slideshow `<video preload>` changed `auto` →
  `metadata` so a clip is only streamed once its slide is active AND on screen. The 1.2 MB
  `SelfImage.jpg` portrait on home/about is now a `<picture>` served from the 108 KB webp derivative
  with the jpg as fallback. Home page references ~1.3 MB of derived images, all `loading="lazy"`.
