/* migrate-projects.mjs — one-time conversion of the legacy js/projects.js data
   object into the new content model: content/projects.json + one
   content/posts/<slug>/showcase.json per project.

   Run from tools/:
     node migrate-projects.mjs           # dry run: print a summary, write nothing
     node migrate-projects.mjs --write    # actually write content/

   The legacy file is a plain `const projects = { ... }` object literal (trailing
   commas, // comments, escaped curly quotes). We load it by evaluating the source
   in a Function and returning the object — no rename of images, no edits to the
   legacy file. Every media path referenced by the output is checked to exist on
   disk; missing files block --write. See docs/ARCHITECTURE.md for the schemas. */

import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const WRITE = process.argv.includes('--write');

// --- canonical vocab -------------------------------------------------------

const CATEGORY_LABELS = {
    programming: 'Programming',
    'ui-ux': 'UI / UX',
    'level-design': 'Level Design',
    'sound-design': 'Sound Design',
    modeling: '3D Modeling',
    'pixel-art': 'Pixel Art',
};
const RANK_KEY_MAP = {
    programming: 'programming', ui_ux: 'ui-ux', level_design: 'level-design',
    sound_design: 'sound-design', modeling: 'modeling', pixel_art: 'pixel-art',
};
const HIDE_SENTINEL = 10;   // legacy rankings used 10 to mean "has it, but hide/last"

const COLLECTIONS = [
    { slug: 'main', label: 'Main Projects' },
    { slug: 'game-jams', label: 'Game Jams' },
    { slug: 'misc', label: 'Miscellaneous' },
];

// Clean, hand-chosen slugs (keys/folders don't kebab-case cleanly). These become
// URLs and content/posts/<slug>/ folders, so they're fixed here deliberately.
const SLUGS = {
    cleanupCrew: 'clean-up-crew', dockingBay: 'docking-bay', IdolOfAshes: 'idol-of-ashes',
    SpiritOutbreak: 'spirit-outbreak', diceClimber: 'dice-climber', DeathTides: 'death-tides',
    DodgeKarts: 'dodge-kart', DevilsAcre: 'devils-acre', PortLochne: 'port-lochne',
    Meoware: 'meoware-defender', SignalLink: 'signal-link',
};
const HOME_FEATURED_COUNT = 6;   // top-N most recent get an order.home (tunable in the editor)

// --- helpers ---------------------------------------------------------------

const isVideo = (p) => /\.mp4$/i.test(p);

function toIso(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) throw new Error(`unparseable date: "${dateStr}"`);
    // Build from LOCAL components so we don't shift a day via UTC (toISOString).
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function titleCaseIfUpper(s) {
    if (!s) return s;
    return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}

// "TEAM PROJECT | Game: [Docking Bay]" -> { kicker: "Team Project", title: "Docking Bay" }
// "Modded Map: Port Lochne"            -> { kicker: "Modded Map",   title: "Port Lochne" }
// "Game: Spirit Outbreak"              -> { kicker: "",             title: "Spirit Outbreak" }
function parseTitle(raw) {
    let kicker = '', rest = String(raw || '').trim();
    const pipe = rest.indexOf('|');
    if (pipe >= 0) { kicker = rest.slice(0, pipe).trim(); rest = rest.slice(pipe + 1).trim(); }
    const m = rest.match(/^([A-Za-z][A-Za-z ]*?):\s*(.+)$/);
    if (m) {
        const label = m[1].trim(), after = m[2].trim();
        if (label.toLowerCase() === 'game') rest = after;         // drop the generic "Game" label
        else { if (!kicker) kicker = label; rest = after; }        // keep "Modded Map" etc. as kicker
    }
    rest = rest.replace(/^\[|\]$/g, '').trim();                    // strip [brackets]
    return { kicker: titleCaseIfUpper(kicker), title: rest };
}

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function excerpt(s, n = 160) {
    s = String(s || '').trim();
    if (s.length <= n) return s;
    let cut = s.slice(0, n);
    const sp = cut.lastIndexOf(' ');
    if (sp > 60) cut = cut.slice(0, sp);
    return cut.replace(/[\s,;:.]+$/, '') + '…';
}

// --- load legacy data ------------------------------------------------------

const legacySrc = (await fs.readFile(path.join(REPO, 'js', 'projects.js'), 'utf8')).replace(/^﻿/, '');
const projects = new Function(legacySrc + '\n; return projects;')();
const keys = Object.keys(projects);

// Home featured = the N most recent projects (a sensible default; re-tune in the editor).
const homeRank = new Map();
keys.map((k) => ({ k, iso: toIso(projects[k].date) }))
    .sort((a, b) => b.iso.localeCompare(a.iso))
    .slice(0, HOME_FEATURED_COUNT)
    .forEach((e, i) => homeRank.set(e.k, i + 1));

// --- build -----------------------------------------------------------------

const outProjects = [];
const outPosts = [];          // { slug, json }
const referenced = new Set(); // every media path the output points at
const jamCandidates = [];     // summaries that mention a game jam (for the report)

for (const key of keys) {
    const p = projects[key];
    const slug = SLUGS[key];
    if (!slug) throw new Error(`no slug mapping for legacy key "${key}" — add it to SLUGS`);

    const { kicker, title } = parseTitle(p.title);
    const iso = toIso(p.date);

    // categories + order from rankings, dropping the "hide" sentinel (10).
    const categories = [], order = {};
    for (const [rk, val] of Object.entries(p.rankings || {})) {
        const cat = RANK_KEY_MAP[rk];
        if (!cat || val >= HIDE_SENTINEL) continue;
        categories.push(cat);
        order[cat] = val;
    }
    if (homeRank.has(key)) order.home = homeRank.get(key);

    const images = Array.isArray(p.images) ? p.images : [];
    const hero = images[0];
    const stills = images.filter((im) => !isVideo(im));
    const videos = images.filter(isVideo);
    const gallery = stills.slice(1);            // remaining stills after the hero

    const cover = hero;
    const background = p.background;
    [cover, background, hero, ...gallery, ...videos].forEach((s) => s && referenced.add(s));

    // showcase post blocks (order per ARCHITECTURE: About, summary, Contributions,
    // bullets, hero image, gallery, then videos).
    const blocks = [
        { type: 'heading', level: 2, text: 'About' },
        { type: 'text', html: `<p>${escHtml(p.summary)}</p>` },
        { type: 'heading', level: 2, text: 'My Contributions' },
        { type: 'bullets', items: (p.bullets || []).slice() },
        { type: 'image', src: hero, alt: `${title} key art` },
    ];
    if (gallery.length) {
        blocks.push({ type: 'gallery', items: gallery.map((s, i) => ({ src: s, alt: `${title} screenshot ${i + 1}` })) });
    }
    videos.forEach((v) => blocks.push({ type: 'video', src: v, caption: '' }));

    const postTitle = `${title} — Showcase`;
    const post = {
        version: 1, slug: 'showcase', project: slug, type: 'showcase',
        title: postTitle, date: iso, excerpt: excerpt(p.summary), blocks,
    };
    outPosts.push({ slug, json: post });

    outProjects.push({
        slug, title, kicker, date: iso, playLink: p.playLink || '', summary: p.summary,
        tags: (p.tags || []).slice(), categories, collection: 'main', order,
        cover, background,
        posts: [{ slug: 'showcase', type: 'showcase', title: postTitle, date: iso, excerpt: post.excerpt, cover: hero }],
    });

    if (/game\s*jam/i.test(p.summary || '') || /game\s*jam/i.test((p.bullets || []).join(' '))) {
        jamCandidates.push(slug);
    }
}

const projectsJson = {
    version: 1,
    contentVersion: 1,
    categories: Object.entries(CATEGORY_LABELS).map(([slug, label]) => ({ slug, label })),
    collections: COLLECTIONS,
    projects: outProjects,
};

// --- verify media references exist -----------------------------------------

const missing = [...referenced].filter((s) => !existsSync(path.join(REPO, s)));

// --- report ----------------------------------------------------------------

console.log(`migrate-projects  (${WRITE ? 'WRITE' : 'dry run'})`);
console.log(`  projects: ${outProjects.length}   showcase posts: ${outPosts.length}\n`);
for (const pr of outProjects) {
    const home = pr.order.home ? ` home#${pr.order.home}` : '';
    console.log(`  ${pr.slug.padEnd(18)} ${String(pr.kicker || '—').padEnd(13)} ` +
        `cats[${pr.categories.length}]${home}  posts:${pr.posts.length}`);
}
console.log(`\n  referenced media files: ${referenced.size}`);
if (missing.length) {
    console.log(`  MISSING (${missing.length}):`);
    missing.forEach((m) => console.log(`    ! ${m}`));
} else {
    console.log('  all referenced media exist on disk ✓');
}
if (jamCandidates.length) {
    console.log(`\n  note: these mention "game jam" in their text — candidates to re-tag`);
    console.log(`  collection:"game-jams" in the editor: ${jamCandidates.join(', ')}`);
}

// --- write -----------------------------------------------------------------

if (!WRITE) {
    console.log('\n  dry run — pass --write to emit content/. Nothing written.');
    process.exit(missing.length ? 1 : 0);
}
if (missing.length) {
    console.error('\n  refusing to write: fix the missing media references above first.');
    process.exit(1);
}

const CONTENT = path.join(REPO, 'content');
await fs.mkdir(path.join(CONTENT, 'posts'), { recursive: true });
await fs.writeFile(path.join(CONTENT, 'projects.json'), JSON.stringify(projectsJson, null, 2) + '\n', 'utf8');
for (const { slug, json } of outPosts) {
    const dir = path.join(CONTENT, 'posts', slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'showcase.json'), JSON.stringify(json, null, 2) + '\n', 'utf8');
}
console.log(`\n  wrote content/projects.json + ${outPosts.length} showcase posts.`);
