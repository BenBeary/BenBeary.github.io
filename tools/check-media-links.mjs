/* check-media-links.mjs - verify every media URL the site can request actually
   resolves on a CASE-SENSITIVE host (GitHub Pages), not just on Windows.

   Windows filesystems are case-insensitive, so `images/Blog images/x.PNG` opens
   a file really named `images/Blog Images/x.png` locally and then 404s live.
   This walks the real tree to build an exact-case index, then checks:

     - every `src` in projects.json (cover, background, media[]) and in every
       post's blocks (image / gallery / slideshow / video)
     - the derivatives media.js will ask for: .thumb.webp and .md.webp for
       images, .poster.webp and .opt.mp4 for videos

   Reports MISSING (no such file) and CASE (file exists under a different case).
   Run from tools/:  node check-media-links.mjs */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- exact-case index of everything under images/ ---
const real = new Set();                 // exact repo-relative paths, forward slashes
const lower = new Map();                // lowercased -> exact
async function index(dir) {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        const rel = path.relative(REPO, full).split(path.sep).join('/');
        if (e.isDirectory()) { real.add(rel); lower.set(rel.toLowerCase(), rel); await index(full); }
        else { real.add(rel); lower.set(rel.toLowerCase(), rel); }
    }
}
await index(path.join(REPO, 'images'));

// --- collect every referenced source path ---
const refs = new Map();                 // src -> where it came from
function add(src, where) { if (src && typeof src === 'string') refs.set(src, where); }

const projects = JSON.parse(await fs.readFile(path.join(REPO, 'content', 'projects.json'), 'utf8'));
for (const p of projects.projects || []) {
    add(p.cover, `${p.slug}.cover`);
    add(p.background, `${p.slug}.background`);
    (p.media || []).forEach((m, i) => add(m.src, `${p.slug}.media[${i}]`));
    (p.posts || []).forEach((e) => add(e.cover, `${p.slug}.posts.${e.slug}.cover`));
}
const postsDir = path.join(REPO, 'content', 'posts');
for (const dir of await fs.readdir(postsDir)) {
    for (const file of await fs.readdir(path.join(postsDir, dir))) {
        if (!file.endsWith('.json')) continue;
        const post = JSON.parse(await fs.readFile(path.join(postsDir, dir, file), 'utf8'));
        for (const [i, b] of (post.blocks || []).entries()) {
            if (b.type === 'image') add(b.src, `${dir}/${file} block[${i}] image`);
            if (b.type === 'video') add(b.src, `${dir}/${file} block[${i}] video`);
            if (b.type === 'gallery' || b.type === 'slideshow') {
                (b.items || []).forEach((it, j) => add(it.src, `${dir}/${file} block[${i}] item[${j}]`));
            }
        }
    }
}

// --- derived paths media.js will request ---
const derivedBase = (src) => src.replace(/\.[^./]+$/, '').replace(/^images\//, 'images/_derived/');
function wanted(src) {
    const base = derivedBase(src);
    return /\.mp4$/i.test(src)
        ? [{ p: src, kind: 'original' }, { p: base + '.poster.webp', kind: 'poster' }, { p: base + '.opt.mp4', kind: 'opt', optional: true }]
        : [{ p: src, kind: 'original' }, { p: base + '.thumb.webp', kind: 'thumb' }, { p: base + '.md.webp', kind: 'md' }];
}

const missing = [], caseBad = [];
for (const [src, where] of refs) {
    for (const w of wanted(src)) {
        if (real.has(w.p)) continue;
        const alt = lower.get(w.p.toLowerCase());
        if (alt) caseBad.push({ want: w.p, actual: alt, kind: w.kind, where });
        else if (!w.optional) missing.push({ p: w.p, kind: w.kind, where });
    }
}

console.log(`checked ${refs.size} referenced source file(s)\n`);
if (caseBad.length) {
    console.log(`CASE MISMATCH (works on Windows, 404s on GitHub Pages) - ${caseBad.length}:`);
    for (const c of caseBad) console.log(`  referenced: ${c.want}\n  actual:     ${c.actual}\n  from:       ${c.where}\n`);
} else console.log('CASE MISMATCH: none');

if (missing.length) {
    console.log(`\nMISSING - ${missing.length}:`);
    const byKind = {};
    for (const m of missing) (byKind[m.kind] = byKind[m.kind] || []).push(m);
    for (const k of Object.keys(byKind)) {
        console.log(`  ${k} (${byKind[k].length}):`);
        for (const m of byKind[k].slice(0, 40)) console.log(`     ${m.p}   <- ${m.where}`);
    }
} else console.log('MISSING: none');

// Static references in HTML/CSS/JS that point at images/
console.log('\nstatic references in page source:');
for (const f of ['index.html', 'about.html', '404.html']) {
    const html = await fs.readFile(path.join(REPO, f), 'utf8');
    for (const m of html.matchAll(/(?:src|srcset|href|content)="([^"]*images\/[^"]+)"/g)) {
        const p = m[1].replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, '');
        const ok = real.has(p);
        const alt = ok ? '' : (lower.get(p.toLowerCase()) ? `  CASE -> ${lower.get(p.toLowerCase())}` : '  MISSING');
        console.log(`  ${ok ? 'ok  ' : 'BAD '} ${f}: ${p}${alt}`);
    }
}
