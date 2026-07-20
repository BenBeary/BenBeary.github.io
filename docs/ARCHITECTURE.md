# Portfolio Redesign. Architecture & Contracts

> This file is the **single source of truth** for the redesign. Future sessions COPY from it;
> they do not redesign it. Any schema/API/convention change edits this file in the same commit
> and adds a note to `docs/ROADMAP.md`'s changelog.

## Why this redesign exists

The legacy site is one `index.html` with a fullscreen carousel of all 12 projects - 247 MB of media,
zero lazy loading, data in a JS object literal (`js/projects.js`), no editor/blog/partials. It reloads
everything on every visit and can't deep-link to a project for a recruiter. The redesign is a
multi-page, blog-style portfolio: project **hubs** (pinned showcase post + dated sub-blogs), grouping by
**skill category** and by **collection** (Main / Game Jams / Misc), curated **role landing pages** linked
per job application, Steam/Netflix-style horizontal **shelves** on the homepage, a full media-optimization
pass, and an in-browser **Editor/** that publishes JSON content to GitHub via a fine-grained PAT (adapted
from the user's proven CADRE editor, see `docs/reference-cadre/`).

## Locked decisions (do not relitigate)

Multi-page static site · JSON content + client-side renderer (no build step, vanilla JS) · two grouping
axes (skill `categories` + `collection`) · role pages from role JSON · full media optimization
(sharp + ffmpeg-static, run locally) · evolve dark + amber identity on CSS variables · Editor v1 = core
publishing loop only (no ChangeQueue/staging) · homepage = scroll-snap card shelves.

## Hard rules

- Vanilla JS + CSS only. No frameworks, no site-side npm deps (npm only inside `tools/`). No build step - files are served exactly as committed.
- Never rename or move files under `images/` - JSON references and the lightbox depend on original paths.
  Derivatives go in `images/_derived/` mirroring the tree (one top-level `images/` folder).
- Every emitted media URL goes through `encodeURI()` (filenames contain spaces and underscores).
- All content reads go through `js/site/data.js`; all media path logic through `js/site/media.js`; all
  block rendering through `js/site/blocks.js` (shared with the editor preview, never fork it).
- (HISTORICAL, satisfied at the M6 swap) Legacy files were read-only until Milestone 6: `index.html`, `js/newWebMain.js`, `js/projects.js`,
  `css/newWebStyle.css`, `css/navbar.css`.
- Test via local server only (`fetch` fails on `file://`).
- The editor publishes via `ghBatchCommit()` (atomic multi-file commit, Git Data API), never sequential
  Contents-API PUTs for multi-file changes.

## Target file tree

```
/
├── index.html                    # THE HOME PAGE since the M6 swap (was home.html):
│                                 #   intro card → Featured showcase rows (ranked by order.home, or
│                                 #   order.<skill> via ?featured=<slug>) → Collection banner tiles
├── 404.html                      # served by Pages for any missing URL; data-root="/" so the
│                                 #   injected header/footer links stay absolute at any depth
├── favicon.svg, favicon-32.png, favicon-180.png
├── projects.html                 # catalogue; ?cat=<skill> and ?collection=<slug> filters
├── project.html                  # hub, ?slug=  (showcase post pinned; blogs newest-first,
│                                 #   5 shown + "Load more" client-side slice)
├── post.html                     # ?slug=<project>&post=<post>
├── about.html
├── role.html                     # ?slug=<role>; not in navbar, linked per job application
├── content/
│   ├── projects.json             # THE index: categories, collections, projects, embedded post lists
│   ├── posts/<project>/<post>.json
│   └── roles/<role>.json
├── css/
│   ├── tokens.css                # ALL custom properties; dark+amber from the current site
│   │                             #   (--bg-0/1/2 from #0b0e19→#353844→#131314, --accent: rgb(255,187,0))
│   ├── base.css                  # reset, typography, header/footer
│   ├── components.css            # cards, shelves, chips, buttons, lightbox, block styles
│   └── pages.css                 # per-page layout, scoped by body[data-page]
├── js/site/
│   ├── partials.js               # injected header/footer; {{root}} via body[data-root]
│   ├── data.js, media.js, blocks.js, richtext-sanitize.js
│   └── page-home.js, page-projects.js, page-project.js, page-post.js, page-role.js
├── Editor/
│   ├── index.html                # sign-in + New Project + project/post/draft picker
│   ├── edit.html                 # block editor + split live-preview iframe (uses ../js/site/blocks.js)
│   ├── manage.html               # forms over projects.json (meta, hub slideshow media[], bullets)
│   ├── preview.html              # site-CSS-only iframe target for the split preview
│   ├── auth.js                   # adapted CADRE auth.js (owner-only; see M5)
│   ├── github-api.js             # CADRE github-api.js near-verbatim; owner/repo constants changed
│   ├── queue.js                  # persistent change queue: stage-all + one-batch commit + beforeunload
│   ├── image-browser.js          # Blog Images tree browser (pick / upload / new folder), gif+mp4 tagged
│   └── editor.js, editor-index.js, manage.js, blocks-edit.js, drafts.js, upload.js, editor.css
├── tools/                        # local-only node scripts (deps: sharp, ffmpeg-static)
│   ├── package.json, optimize-media.mjs, migrate-projects.mjs, hoist-showcase-media.mjs, hoist-bullets.mjs
├── docs/ROADMAP.md, docs/ARCHITECTURE.md, docs/reference-cadre/
├── images/                       # ONE top-level media folder
│   ├── Blog Images/<Project>/<name>.<ext>   # project/blog image originals (the editor's image
│   │                             #   browser is scoped to this folder; note the literal space)
│   ├── SocialIcons/, SelfImage.jpg, …       # site chrome. NOT blog images, left at images/ root
│   └── _derived/                 #   committed derivatives, mirrors the FULL images/ tree
│       └── Blog Images/<Project>/<name>.thumb.webp | .md.webp | .poster.webp | .opt.mp4
└── Game/                         # untouched
└── Archived/                     # Archived_carousel-index.html (the old single-page carousel)
                                  #   plus its own newWebMain.js / projects.js / newWebStyle.css /
                                  #   navbar.css, moved here at the M6 swap so the snapshot still
                                  #   runs. Its projects.js image paths are ../images/...
                                  #   Nothing in here is loaded by the live site.
```

## JSON schemas

### `content/projects.json` - the index that drives everything

```json
{
  "version": 1,
  "contentVersion": 1,
  "categories":  [ { "slug": "programming", "label": "Programming" },
                   { "slug": "ui-ux", "label": "UI / UX" },
                   { "slug": "level-design", "label": "Level Design" },
                   { "slug": "sound-design", "label": "Sound Design" },
                   { "slug": "modeling", "label": "3D Modeling" },
                   { "slug": "pixel-art", "label": "Pixel Art" } ],
  "collections": [ { "slug": "main", "label": "Main Projects" },
                   { "slug": "game-jams", "label": "Game Jams" },
                   { "slug": "misc", "label": "Miscellaneous" } ],
  "projects": [{
    "slug": "clean-up-crew", "title": "Clean Up Crew", "kicker": "Team Project",
    "status": "In Development",   // OPTIONAL tag shown top-right of the hub hero; "" or absent = none
    "hidden": false,             // OPTIONAL - true = unlisted (off catalogue/home/navbar; direct link still works)
    "date": "2025-07-29", "playLink": "…", "summary": "…",
    "categories": ["programming", "ui-ux"],
    "tags": ["Programming", "UI / UX"],   // DERIVED from categories at save time (category labels), not hand-edited
    "collection": "main",
    "order": { "home": 1, "programming": 1 },
    "cover": "images/CleanUpCrew/16_9 shot.png", "background": "images/CleanUpCrew/Blurred.jpg",
    "media":   [ { "src": "images/…png|jpg|gif|mp4", "alt": "…" } ],  // hub slideshow (right col of the hero)
    "bullets": [ "role-specific highlight…" ],                       // hub hero left-column list
    "featuredCopy": {                                                // OPTIONAL, home page only
      "programming": { "summary": "…", "media": [ { "src": "…", "alt": "…" } ] }
    },
    "posts": [ { "slug": "showcase", "type": "showcase", "title": "…", "date": "2025-07-29",
                 "excerpt": "…", "cover": "…", "hidden": false } ]   // post "hidden": true = off the hub, direct link works
  }]
}
```

**Hub hero (M5.6)** is a two-column card over the blurred background: left (~1/3) = kicker, title, date,
tags, play button, `bullets`; right (~2/3) = the `media` slideshow with `summary` beneath it. `status`
pins top-right. `media`/`bullets` were hoisted out of each showcase post (`tools/hoist-showcase-media.mjs`
then `tools/hoist-bullets.mjs`); the showcase post keeps the longer write-up (About). Both are editable
after the fact in `manage.html` (media rows with 📁 browse/reorder; bullets as one-per-line).

**Two independent grouping axes**: `categories` = skills the project demonstrates (a project can have
several); `collection` = kind. `categories` doubles as the project's `tags` (the editor derives `tags`
from the selected categories' labels, there is no separate tags field). `collection` is exactly one of
the `collections[]` list, which is editable in Manage (add / rename / delete) EXCEPT `main` ("Main
Projects"), which is permanent; deleting a collection reassigns its projects to `main`. Navbar Projects
dropdown groups by collection; `projects.html` filters by either axis. Hidden projects/posts (`"hidden":
true`) are excluded from every listing (catalogue, hub post list, navbar) but remain reachable by direct
URL - an "unlisted" state for drafts/WIP. Small jam/misc projects are ordinary projects, a hub with just
a slideshow renders fine, no special-casing.

**Ordering**: `order` is opt-in, a missing key means "not featured in that listing". Within a listing,
sort by `order` ascending, then `date` descending. (`order.home` drives the homepage Featured shelf.)

**Posts** are embedded here so a publish touches exactly 2 files (the post JSON + projects.json). Exactly
one `type:"showcase"` post per project (pinned top of hub); others are `type:"blog"` (newest-first, 5
shown + "Load more").

**`contentVersion`** increments once per editor commit (bumped inside `EditorQueue.commit()` when
projects.json is part of the batch); `data.js` appends it as `?v=` to post fetches to bust the GitHub
Pages CDN (~10 min cache).

### `content/posts/<project>/<post>.json`

```json
{ "version": 1, "slug": "…", "project": "…", "type": "showcase|blog",
  "title": "…", "date": "YYYY-MM-DD", "excerpt": "…",
  "blocks": [
    { "type": "heading", "level": 2, "text": "…" },
    { "type": "text", "html": "<p>sanitized rich text…</p>" },
    { "type": "bullets", "items": ["…"] },
    { "type": "image", "src": "images/…", "alt": "…", "caption": "…" },
    { "type": "gallery", "items": [ { "src": "…", "alt": "…" } ] },
    { "type": "slideshow", "items": [ { "src": "…png|jpg|gif|mp4", "alt": "…" } ] },
    { "type": "video", "src": "images/….mp4", "caption": "…" },
    { "type": "embed", "provider": "youtube", "url": "…" },
    { "type": "quote", "text": "…", "cite": "…" },
    { "type": "divider" }
  ] }
```

`text.html` is rich-text HTML that is **re-sanitized on render** by the shared whitelist sanitizer
(`js/site/richtext-sanitize.js`, a port of CADRE `richSanitize` - see `docs/reference-cadre/post-gen-richtext.js`).
Allowed: `p, strong, em, u, a[href: http(s)/mailto/relative], ul, ol, li, br`, plus `text-align`. Never
trust stored HTML blindly. `video` has no poster field, the poster is derived by convention (below).
`gallery` is images-only. `slideshow` is MIXED media (Steam-style stage + thumb strip): mp4 items get
their thumb from the derived `.poster.webp`, and both hub media and post slideshows use the one
`makeSlideshow(container, items)` in media.js. `bullets` is DEPRECATED for authoring (paragraph lists
replaced it, M5.5) but stays render-supported for migrated content.

**Per-ranking featured copy (M7):** a project shown in several home-page rankings (Featured, Programming,
UI / UX, …) would otherwise repeat one summary and one set of screenshots in every list. `featuredCopy`
keys off the ranking slug and overrides `summary` and/or `media` for that list only, so each one can talk
about the work that list is about. Missing keys (and missing fields within a key) fall back to the
project's own `summary`/`media`. Read by `page-home.js` `featuredRow(p, index, key)`; the project hub and
catalogue always use the base copy.

**Project-level media (M5.5):** each project may carry `"media": [ { "src", "alt" } ]` - the hub renders
it as the top slideshow (original-site style) above summary + posts. Showcase posts are OPTIONAL: they
hold the write-up (About/Contributions); their old hero/gallery/video blocks were hoisted into
project.media by `tools/hoist-showcase-media.mjs`. `"status"` is authored via a dropdown:
In Development (default) | Prototype | Concept | On Hold | Finished | Released | Archived
(free text still renders, the enum is an editor convention, not a schema constraint).

### `content/roles/<role>.json`

```json
{ "slug": "…", "headline": "…", "intro": "…", "resumeLink": "",
  "featured": [ { "project": "<slug>", "bullets": ["role-specific bullet…"] } ] }
```

`role.html?slug=x` fetches the role JSON + projects.json, renders `featured` projects in the given order,
with these `bullets` overriding the showcase's, each linking to the project hub.

## Module APIs (signatures are the contract)

```js
// js/site/data.js, module-level Promise cache + visible fetch-error state
getProjects() -> Promise<projectsJson>
getProject(slug) -> Promise<project|null>
getPost(projectSlug, postSlug) -> Promise<postJson>   // fetched with ?v=<contentVersion>
getRole(slug) -> Promise<roleJson>

// js/site/media.js, pure string transforms images/X/y.ext -> images/_derived/X/y.<kind>; always encodeURI'd
//   (insert "_derived/" after the leading "images/", strip the source ext, append the kind suffix)
thumbUrl(src), mediumUrl(src), posterUrl(src), optVideoUrl(src)
setImg(imgEl, src, kind)            // sets derived URL; onerror -> encoded original (no manifest needed)
makeVideo(container, src, caption)  // poster + play btn; click swaps in <video preload="none" controls
                                    //   autoplay>, trying .opt.mp4 then falling back to the original
openLightbox(items, startIndex)     // full-res originals, loaded only on open

// js/site/blocks.js, the ONE renderer; ALSO loaded by Editor/edit.html's live preview
renderBlocks(blocks, containerEl)

// js/site/partials.js, header/footer template strings; {{root}} from body[data-root]
//   ('.' at repo root, '..' inside Editor/); Projects dropdown grouped by collection from projects.json

// Editor/github-api.js (from CADRE, near-verbatim):
ghBatchCommit({ message, changes: [ {op:'put',path,content} | {op:'putB64',path,base64} | {op:'delete',path} ], branch })
//   Atomic Git Data API commit: blobs -> tree(base_tree) -> commit -> PATCH ref; retries once on race.

// Editor/queue.js, the persistent change queue (localStorage; CADRE ChangeQueue concept).
//   Every editor mutation STAGES a file change here (keyed by repo path, last-write-wins) instead of
//   committing. Survives navigation across edit/manage/index and reloads. A universal 📋 Changes button
//   (injected into .ed-header__actions on every editor page) opens a review modal; one commit sends the
//   whole batch via ghBatchCommit. beforeunload warns on unstaged-to-GitHub work.
window.EditorQueue = {
  loadProjects(),                    // committed(main, if authed) or public projects.json, overlaid with the queued edit
  stageProjects(json, label), stagePut(path, content, label), stagePutB64(path, b64, label), stageDelete(path, label),
  getStaged(path), hasPath(path), remove(path), list(), count(), isEmpty(), clear(),
  commit(message?)                   // bumps contentVersion once, ghBatchCommit's everything, clears on success
}
//   Fires document events 'queue:changed' (badge refresh) and 'queue:committed' (pages reload their copy).
//   NOTE: image uploads + new folders still commit IMMEDIATELY (binary in localStorage would blow quota) - //   the browser inserts them optimistically so they show at once, then reconciles with the committed tree.
```

## Conventions

- **Slugs**: kebab-case, derived from folder/title.
- **Derived media** (all under `images/_derived/<same subpath>/`):
  - `.thumb.webp` - width 480, quality 70 (~30 KB), used by cards/shelves
  - `.md.webp` - width 1280, quality 78 (~150 KB), used by post bodies
  - `.poster.webp` - width 1280, video frame @1s (fallback 0s), video click-to-play poster
  - `.opt.mp4` - only for source mp4 > 20 MB: crf 28, scale 1080p, `+faststart`, aac 128k
- **Images**: always `loading="lazy" decoding="async"`. Cards → thumb; post bodies → md; lightbox → originals.
- **GIFs**: first frame → thumb/md stills for cards; the original gif stays the playback source in posts.
- **Commit messages**: `Redesign M<N>: <what>` so `git log` shows milestone progress at a glance.

## Media pipeline (`tools/optimize-media.mjs`)

Node + `sharp` + `ffmpeg-static` (both install via `npm i` with prebuilt Windows binaries, no PATH work).
Walk `images/` (skip `_derived/`, `Archived/`, `Game/`), emit the derivatives above into `images/_derived/`.
Skipping `_derived/` matters: without it the walk would treat a generated `.opt.mp4` as a new source video.
Idempotent: skip when output is newer than source, so it's safe to re-run after every editor upload batch.
Never rename sources.

## Migration (`tools/migrate-projects.mjs`, run once)

Reads `js/projects.js` via `new Function(src + '; return projects')()`. Per project: slug = kebab-cased
folder name; ISO date; `categories` = keys of `rankings`; `order` = `rankings` verbatim (already lower-first)
+ a hand-tunable `home`; `collection: "main"` for all 12 (user re-tags jams later via the editor). Generates
`content/posts/<slug>/showcase.json` from summary + bullets + images (heading "About" + text summary +
heading "My Contributions" + bullets + hero image + gallery of remaining images + one video block per mp4).
Dry-run prints; `--write` writes.

## Editor v1, what to port vs. drop (M5)

**Port / adapt from `docs/reference-cadre/`:**
- `github-api.js` near-verbatim - `ghBatchCommit()` is already the atomic multi-file commit path. Only
  change `GITHUB_OWNER`/`GITHUB_REPO` (this repo is owned by the user, so a fine-grained PAT works).
- `auth.js` - keep AES-GCM token-at-rest, "Keep Me Logged In" (localStorage vs sessionStorage), expiry
  chip, sign-in modal, `buildGenerateTokenUrl()`. **Delete** the collaborator-permission check (owner-only:
  validate `GET /user` + repo push permission), the basic/admin page-role gate + redirects, contributor path.
- `post-gen-richtext.js` - the sanitizing contenteditable toolbar for the `text` block. Its `richSanitize`
  whitelist also becomes the site-side `js/site/richtext-sanitize.js`.
- The BLOCK_TYPES registry *pattern* (`{ defaults, renderBody, syncFromDOM }`), drag-handle reorder, and the
  one-delegated-click-handler wiring from `post-gen.js`. **Drop `toBodyHtml`** - blocks serialize straight to
  post JSON; rendering is the shared `js/site/blocks.js` (so preview == production).
- The draft system from `post-gen.js` - debounced localStorage autosave, draft index with 30-day pruning,
  recent-drafts popover. Key `draft:<project>:<slug>`.

**Not ported:** `post-gen-output.js` / base-template HTML generation (the JSON model replaces it); the
tutorial. The image-manager tree WAS ported (`image-browser.js`), and the ChangeQueue concept WAS adopted
in M5.6 (`queue.js`), v1 shipped without it (immediate per-action commits), M5.6 moved all JSON mutations
behind the queue so work persists across editor pages and commits in one batch.

**Publish flow (M5.6):** everything STAGES into `EditorQueue`. "✓ Add to changes" on edit.html builds the
post JSON + upserts its projects.json entry (relocating the old file if the project/slug changed) and stages
both; Manage stages projects.json (+ post-file deletions); the landing stages new-project / delete-post.
The single GitHub write is `EditorQueue.commit()` from the 📋 Changes modal, one `ghBatchCommit` of the
whole batch, bumping `contentVersion` once. Image uploads + new folders are the exception: still immediate
Contents-API PUTs (binary can't sit in localStorage), shown optimistically in the browser then reconciled.
Editor CSS is independent of the site (`Editor/editor.css`).

## Risks / pitfalls

- GitHub Pages CDN caches ~10 min → `contentVersion` bust param; editor UI notes "live in ~10 min".
- `file://` fetch fails → local server always; `data.js` shows a clear error instead of a blank page.
- Spaces in filenames → `encodeURI` everywhere; never rename originals.
- Freshly uploaded images lack derivatives until `optimize-media.mjs` reruns locally → the `onerror`
  fallback in `setImg` makes this a non-issue; re-run the script periodically and commit `images/_derived/`.
- Repo size: keep originals (lightbox needs them); +~20 MB derivatives is fine.

## Environment notes

- `git` is NOT on PATH. Use the GitHub Desktop bundled copy, e.g.
  `C:\Users\Ben\AppData\Local\GitHubDesktop\app-<latest>\resources\app\git\cmd\git.exe`
  (pick the newest `app-*` folder).
- **No Python and (as of M0) no Node.js on this machine.** Local server = VS Code Live Server
  extension (installed: `ritwickdey.liveserver`); it injects a dev-only reload script into served
  HTML. Node LTS must be installed at the start of M2 (`winget install OpenJS.NodeJS.LTS`) for the
  `tools/` scripts; after that `npx serve` is an alternative server.
- Shell is Windows PowerShell 5.1, see the environment's PowerShell rules (no `&&`, no inline
  `if()` expressions, backtick is the escape char so count literal backticks via `[char]96`).
- Headless render check (no Node/Python needed): Edge at
  `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` supports
  `--headless=new --disable-gpu --virtual-time-budget=2500 --dump-dom <file:// URL>`, which runs the
  page's JS and prints the resulting DOM. Valid whenever the page doesn't require `fetch` to succeed
  (partials injection qualifies; data-driven pages from M4 need a real server, use Live Server).
