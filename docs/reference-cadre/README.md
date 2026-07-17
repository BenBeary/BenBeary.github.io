# CADRE editor — reference source

These are the reusable pieces of the user's **CADRE** blog editor (a different repo), captured here so the
redesign's Milestone 5 (`Editor/`) can be built without the original chat transcript. They are **reference
to adapt from — not drop-in files**. See `docs/ARCHITECTURE.md` → "Editor v1 — what to port vs. drop".

Files:

- **`github-api.js`** — GitHub API client. `ghBatchCommit()` is the atomic multi-file commit (Git Data API:
  blobs → tree → commit → PATCH ref, retry-once-on-race). Port near-verbatim; only change the
  `GITHUB_OWNER`/`GITHUB_REPO` constants (they live in `auth.js`).
- **`auth.js`** — PAT sign-in with AES-GCM token-at-rest, "Keep Me Logged In", expiry chip. When porting,
  **delete** the collaborator-permission check (this repo is owner-owned → owner-only check), the
  basic/admin `data-page-role` gate + redirects, and the contributor-setup path.
- **`post-gen-richtext.js`** — sanitizing contenteditable rich-text toolbar for the `text` block. Its
  `richSanitize` whitelist becomes the site-side `js/site/richtext-sanitize.js` too.

Note: comment section-dividers and some emoji were normalized to clean equivalents when captured (the
original used box-drawing glyphs). All executable logic is preserved verbatim. The CADRE constants
(`GITHUB_OWNER = 'cadrealum'`, `GITHUB_REPO = 'website'`) are left as-is — change them on port.
