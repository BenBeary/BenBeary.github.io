/* restore-media-bullets.mjs — one-off recovery.

   The Manage page reads projects.json from GitHub `main`. Because the redesign
   (which introduced project.media[] and project.bullets[]) was never pushed, that
   copy had no media/bullets — so saving metadata from Manage wrote empty arrays
   back over them. This restores media[] and bullets[] from a known-good commit,
   matched by slug, WITHOUT touching anything the user has since changed
   (collections, collection assignments, statuses, hidden flags, order, posts…).

   Only fills in where the current value is empty — never overwrites real data.

   Usage from tools/:  node restore-media-bullets.mjs <good-json-path> */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(REPO, 'content', 'projects.json');
const goodPath = process.argv[2];
if (!goodPath) { console.error('Pass the path to the known-good projects.json'); process.exit(1); }

const stripBom = (s) => s.replace(/^﻿/, '');
const cur = JSON.parse(stripBom(await fs.readFile(PROJECTS, 'utf8')));
const good = JSON.parse(stripBom(await fs.readFile(goodPath, 'utf8')));

const goodBySlug = new Map((good.projects || []).map(p => [p.slug, p]));
let mediaFixed = 0, bulletsFixed = 0, mediaItems = 0, bulletItems = 0;

for (const p of cur.projects || []) {
    const g = goodBySlug.get(p.slug);
    if (!g) continue;
    if ((!p.media || !p.media.length) && g.media && g.media.length) {
        p.media = g.media;
        mediaFixed++; mediaItems += g.media.length;
    }
    if ((!p.bullets || !p.bullets.length) && g.bullets && g.bullets.length) {
        p.bullets = g.bullets;
        bulletsFixed++; bulletItems += g.bullets.length;
    }
    console.log(`${p.slug.padEnd(18)} media:${String((p.media || []).length).padStart(2)}  bullets:${String((p.bullets || []).length).padStart(2)}  collection:${p.collection}`);
}

cur.contentVersion = (cur.contentVersion || 0) + 1;
await fs.writeFile(PROJECTS, JSON.stringify(cur, null, 2) + '\n', 'utf8');
console.log(`\nrestored media on ${mediaFixed} project(s) (${mediaItems} items), bullets on ${bulletsFixed} (${bulletItems} items)`);
console.log(`contentVersion -> ${cur.contentVersion}`);
