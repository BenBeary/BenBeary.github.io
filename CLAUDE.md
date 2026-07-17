# CLAUDE.md

## Redesign in progress

This repo is being rebuilt from a single-page carousel into a multi-page, blog-style portfolio with an
in-browser editor. **Before doing any work, read `docs/ROADMAP.md` and `docs/ARCHITECTURE.md`** — they hold
the milestone checklist (current state = whatever is checked), the frozen JSON schemas and module APIs, and
the ground rules. Continue at the first unchecked box in ROADMAP.

**Do not modify the legacy site** until Milestone 6's swap: `index.html`, `js/newWebMain.js`,
`js/projects.js`, `css/newWebStyle.css`, `css/navbar.css`. The old site stays live throughout the rebuild.

## Environment

- `git` is not on PATH. Use the GitHub Desktop bundled copy:
  `C:\Users\Ben\AppData\Local\GitHubDesktop\app-<latest>\resources\app\git\cmd\git.exe` (newest `app-*`).
- Static site served from `main` root via GitHub Pages. No build step; test with a local server
  because `fetch` fails on `file://`. No Python or Node on this machine (as of M0) — use the
  VS Code Live Server extension (installed). Node LTS gets installed at the start of M2.
