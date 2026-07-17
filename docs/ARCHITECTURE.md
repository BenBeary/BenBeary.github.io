# Portfolio Redesign — Architecture & Contracts

> This file is the **single source of truth** for the redesign. Future sessions COPY from it;
> they do not redesign it. Any schema/API/convention change edits this file in the same commit
> and adds a note to `docs/ROADMAP.md`'s changelog.

## Why this redesign exists

The legacy site is one `index.html` with a fullscreen carousel of all 12 projects — 247 MB of media,
zero lazy loading, data in a JS object literal (`js/projects.js`), no editor/blog/partials. It reloads
everything on every visit and can't deep-link to a project for a recruiter. The redesign is a
multi-page, blog-style portfolio: project **hubs** (pinned showcase post + dated sub-blogs), grouping by
**skill category** and by **collection** (Main / Game Jams / Misc), curated **role landing pages** linked
per job application, Steam/Netflix-style horizontal **shelves** on the homepage, a full media-optimization
pass, and an in-browser **Editor/** that publishes JSON content to GitHub via a fine-grained PAT (adapted
from the user's proven CADRE editor — see `docs/reference-cadre/`).

## Locked decisions (do not relitigate)

Multi-page static site · JSON content + client-side renderer (no build step, vanilla JS) · two grouping
axes (skill `categories` + `collection`) · role pages from role JSON · full media optimization
(sharp + ffmpeg-static, run locally) · evolve dark + amber identity on CSS variables · Editor v1 = core
publishing loop only (no ChangeQueue/staging) · homepage = scroll-snap card shelves.

## Hard rules

- Vanilla JS + CSS only. No frameworks, no site-side npm deps (npm only inside `tools/`). No build step —
  files are served exactly as committed.
- Never rename or move files under `images/` — JSON references and the lightbox depend on original paths.
  Derivatives go in `media/` mirroring the tree.
- Every emitted media URL goes through `encodeURI()` (filenames contain spaces and underscores).
- All content reads go through `js/site/data.js`; all media path logic through `js/site/media.js`; all
  block rendering through `js/site/blocks.js` (shared with the editor preview — never fork it).
- Legacy files are read-only until Milestone 6: `index.html`, `js/newWebMain.js`, `js/projects.js`,
  `css/newWebStyle.css`, `css/navbar.css`.
- Test via local server only (`fetch` fails on `file://`).
- The editor publishes via `ghBatchCommit()` (atomic multi-file commit, Git Data API) — never sequential
  Contents-API PUTs for multi-file changes.

## Target file tree

```
/
├── index.html                    # legacy until M6; then the new home
├── home.html                     # new home built in M6 (renamed to index.html at swap):
│                                 #   intro → horizontal card shelves (CSS scroll-snap):
│                                 #   "Featured" (order.home) → one shelf per collection → about
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
│   ├── index.html                # sign-in + project/post/draft picker
│   ├── edit.html                 # block editor + live preview (uses ../js/site/blocks.js)
│   ├── manage.html               # forms over projects.json + roles
│   ├── auth.js                   # adapted CADRE auth.js (owner-only; see M5)
│   ├── github-api.js             # CADRE github-api.js near-verbatim; owner/repo constants changed
│   └── editor.js, blocks-edit.js, drafts.js, upload.js, editor.css
├── media/                        # committed derivatives, mirrors images/ tree
│   └── <Project>/<name>.thumb.webp | .md.webp | .poster.webp | .opt.mp4
├── tools/                        # local-only node scripts (deps: sharp, ffmpeg-static)
│   ├── package.json, optimize-media.mjs, migrate-projects.mjs
├── docs/ROADMAP.md, docs/ARCHITECTURE.md, docs/reference-cadre/
├── images/                       # originals, untouched
└── Game/, Archived/              # untouched
```

## JSON schemas

### `content/projects.json` — the index that drives everything

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
    "date": "2025-07-29", "playLink": "…", "summary": "…", "tags": ["…"],
    "categories": ["programming", "ui-ux"],
    "collection": "main",
    "order": { "home": 1, "programming": 1 },
    "cover": "images/CleanUpCrew/16_9 shot.png", "background": "images/CleanUpCrew/Blurred.jpg",
    "posts": [ { "slug": "showcase", "type": "showcase", "title": "…", "date": "2025-07-29",
                 "excerpt": "…", "cover": "…" } ]
  }]
}
```

**Two independent grouping axes**: `categories` = skills the project demonstrates (a project can have
several); `collection` = kind (exactly one of Main / Game Jams / Misc). Navbar Projects dropdown groups by
collection; `projects.html` filters by either axis. Small jam/misc projects are ordinary projects — a hub
with just a showcase post renders fine, no special-casing.

**Ordering**: `order` is opt-in — a missing key means "not featured in that listing". Within a listing,
sort by `order` ascending, then `date` descending. (`order.home` drives the homepage Featured shelf.)

**Posts** are embedded here so a publish touches exactly 2 files (the post JSON + projects.json). Exactly
one `type:"showcase"` post per project (pinned top of hub); others are `type:"blog"` (newest-first, 5
shown + "Load more").

**`contentVersion`** increments on every editor publish; `data.js` appends it as `?v=` to post fetches to
bust the GitHub Pages CDN (~10 min cache).

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
    { "type": "video", "src": "images/….mp4", "caption": "…" },
    { "type": "embed", "provider": "youtube", "url": "…" },
    { "type": "quote", "text": "…", "cite": "…" },
    { "type": "divider" }
  ] }
```

`text.html` is rich-text HTML that is **re-sanitized on render** by the shared whitelist sanitizer
(`js/site/richtext-sanitize.js`, a port of CADRE `richSanitize` — see `docs/reference-cadre/post-gen-richtext.js`).
Allowed: `p, strong, em, u, a[href: http(s)/mailto/relative], ul, ol, li, br`, plus `text-align`. Never
trust stored HTML blindly. `video` has no poster field — the poster is derived by convention (below).
`gallery` is images-only.

### `content/roles/<role>.json`

```json
{ "slug": "…", "headline": "…", "intro": "…", "resumeLink": "",
  "featured": [ { "project": "<slug>", "bullets": ["role-specific bullet…"] } ] }
```

`role.html?slug=x` fetches the role JSON + projects.json, renders `featured` projects in the given order,
with these `bullets` overriding the showcase's, each linking to the project hub.

## Module APIs (signatures are the contract)

```js
// js/site/data.js — module-level Promise cache + visible fetch-error state
getProjects() -> Promise<projectsJson>
getProject(slug) -> Promise<project|null>
getPost(projectSlug, postSlug) -> Promise<postJson>   // fetched with ?v=<contentVersion>
getRole(slug) -> Promise<roleJson>

// js/site/media.js — pure string transforms images/X/y.ext -> media/X/y.<kind>; always encodeURI'd
thumbUrl(src), mediumUrl(src), posterUrl(src), optVideoUrl(src)
setImg(imgEl, src, kind)            // sets derived URL; onerror -> encoded original (no manifest needed)
makeVideo(container, src, caption)  // poster + play btn; click swaps in <video preload="none" controls
                                    //   autoplay>, trying .opt.mp4 then falling back to the original
openLightbox(items, startIndex)     // full-res originals, loaded only on open

// js/site/blocks.js — the ONE renderer; ALSO loaded by Editor/edit.html's live preview
renderBlocks(blocks, containerEl)

// js/site/partials.js — header/footer template strings; {{root}} from body[data-root]
//   ('.' at repo root, '..' inside Editor/); Projects dropdown grouped by collection from projects.json

// Editor/github-api.js (from CADRE, near-verbatim):
ghBatchCommit({ message, changes: [ {op:'put',path,content} | {op:'putB64',path,base64} | {op:'delete',path} ], branch })
//   Atomic Git Data API commit: blobs -> tree(base_tree) -> commit -> PATCH ref; retries once on race.
```

## Conventions

- **Slugs**: kebab-case, derived from folder/title.
- **Derived media** (all under `media/<same subpath>/`):
  - `.thumb.webp` — width 480, quality 70 (~30 KB) — used by cards/shelves
  - `.md.webp` — width 1280, quality 78 (~150 KB) — used by post bodies
  - `.poster.webp` — width 1280, video frame @1s (fallback 0s) — video click-to-play poster
  - `.opt.mp4` — only for source mp4 > 20 MB: crf 28, scale 1080p, `+faststart`, aac 128k
- **Images**: always `loading="lazy" decoding="async"`. Cards → thumb; post bodies → md; lightbox → originals.
- **GIFs**: first frame → thumb/md stills for cards; the original gif stays the playback source in posts.
- **Commit messages**: `Redesign M<N>: <what>` so `git log` shows milestone progress at a glance.

## Media pipeline (`tools/optimize-media.mjs`)

Node + `sharp` + `ffmpeg-static` (both install via `npm i` with prebuilt Windows binaries — no PATH work).
Walk `images/` (skip `Archived/`, `Game/`), emit the derivatives above into `media/`. Idempotent: skip when
output is newer than source, so it's safe to re-run after every editor upload batch. Never rename sources.

## Migration (`tools/migrate-projects.mjs`, run once)

Reads `js/projects.js` via `new Function(src + '; return projects')()`. Per project: slug = kebab-cased
folder name; ISO date; `categories` = keys of `rankings`; `order` = `rankings` verbatim (already lower-first)
+ a hand-tunable `home`; `collection: "main"` for all 12 (user re-tags jams later via the editor). Generates
`content/posts/<slug>/showcase.json` from summary + bullets + images (heading "About" + text summary +
heading "My Contributions" + bullets + hero image + gallery of remaining images + one video block per mp4).
Dry-run prints; `--write` writes.

## Editor v1 — what to port vs. drop (M5)

**Port / adapt from `docs/reference-cadre/`:**
- `github-api.js` near-verbatim — `ghBatchCommit()` is already the atomic multi-file commit path. Only
  change `GITHUB_OWNER`/`GITHUB_REPO` (this repo is owned by the user, so a fine-grained PAT works).
- `auth.js` — keep AES-GCM token-at-rest, "Keep Me Logged In" (localStorage vs sessionStorage), expiry
  chip, sign-in modal, `buildGenerateTokenUrl()`. **Delete** the collaborator-permission check (owner-only:
  validate `GET /user` + repo push permission), the basic/admin page-role gate + redirects, contributor path.
- `post-gen-richtext.js` — the sanitizing contenteditable toolbar for the `text` block. Its `richSanitize`
  whitelist also becomes the site-side `js/site/richtext-sanitize.js`.
- The BLOCK_TYPES registry *pattern* (`{ defaults, renderBody, syncFromDOM }`), drag-handle reorder, and the
  one-delegated-click-handler wiring from `post-gen.js`. **Drop `toBodyHtml`** — blocks serialize straight to
  post JSON; rendering is the shared `js/site/blocks.js` (so preview == production).
- The draft system from `post-gen.js` — debounced localStorage autosave, draft index with 30-day pruning,
  recent-drafts popover. Key `draft:<project>:<slug>`.

**Do NOT port (v1):** `post-gen-output.js` / base-template HTML generation (JSON model replaces it);
ChangeQueue + Show Changes + AdminToolManager (v1 publish is one atomic 2-file commit — staging is overkill,
add later only if batching is missed); the tutorial; the image-manager tree panel (v1 uses simple upload;
a browse-tree can be ported from `image-manager.js` later if wanted).

**Publish flow:** build post JSON → upsert its entry into in-memory projects.json → bump `contentVersion` →
`ghBatchCommit([postPath, "content/projects.json"])`. Image upload is a single Contents-API PUT to
`images/<Project>/` at insert time (immediate raw-URL preview; orphans from abandoned drafts are acceptable).
Editor CSS is independent of the site (`Editor/editor.css`, can start from CADRE `postGen-style.css`'s
`:root`).

## Risks / pitfalls

- GitHub Pages CDN caches ~10 min → `contentVersion` bust param; editor UI notes "live in ~10 min".
- `file://` fetch fails → local server always; `data.js` shows a clear error instead of a blank page.
- Spaces in filenames → `encodeURI` everywhere; never rename originals.
- Freshly uploaded images lack derivatives until `optimize-media.mjs` reruns locally → the `onerror`
  fallback in `setImg` makes this a non-issue; re-run the script periodically and commit `media/`.
- Repo size: keep originals (lightbox needs them); +~20 MB derivatives is fine.

## Environment notes

- `git` is NOT on PATH. Use the GitHub Desktop bundled copy, e.g.
  `C:\Users\Ben\AppData\Local\GitHubDesktop\app-<latest>\resources\app\git\cmd\git.exe`
  (pick the newest `app-*` folder).
- Shell is Windows PowerShell 5.1 — see the environment's PowerShell rules (no `&&`, etc.).
