/* restore-three-projects.mjs - one-off recovery.

   Death Tides, Dodge Kart and Port Lochne were dismantled during an earlier
   "consolidate into Old Work" experiment: their showcase posts were deleted (or,
   for Dodge Kart, renamed onto old-work and overwritten), and all three projects
   were hidden. The showcase FILES are restored from git separately with
   `git checkout <commit>^ -- <path>`; this script repairs content/projects.json:

     * puts each project's showcase entry back in posts[] (title/date/excerpt/
       cover taken from the historical index so the wording matches what was
       there before)
     * un-hides them and moves them into the "misc" collection
     * strips the em dash from restored titles, matching the current convention
     * fixes the mojibake ellipsis in old-work's excerpt

   Run from tools/:  node restore-three-projects.mjs <historical-projects.json>
*/

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(REPO, 'content', 'projects.json');
const SLUGS = ['death-tides', 'dodge-kart', 'port-lochne'];
const TARGET_COLLECTION = 'misc';

const histPath = process.argv[2];
if (!histPath) { console.error('Pass the path to a historical projects.json'); process.exit(1); }

const stripBom = (s) => s.replace(/^﻿/, '');
const noEmDash = (s) => String(s || '').replace(/ — Showcase/g, ' Showcase').replace(/\s*—\s*/g, ' - ');

const data = JSON.parse(stripBom(await fs.readFile(PROJECTS, 'utf8')));
const hist = JSON.parse(stripBom(await fs.readFile(histPath, 'utf8')));
const histBySlug = new Map((hist.projects || []).map((p) => [p.slug, p]));

for (const slug of SLUGS) {
    const p = (data.projects || []).find((x) => x.slug === slug);
    if (!p) { console.log(`${slug}: NOT FOUND in projects.json`); continue; }

    // 1. showcase entry back into posts[], preferring the historical wording.
    const h = histBySlug.get(slug);
    const hEntry = h && (h.posts || []).find((x) => x.type === 'showcase');
    const postFile = JSON.parse(stripBom(await fs.readFile(path.join(REPO, 'content', 'posts', slug, 'showcase.json'), 'utf8')));

    // Keep the post file itself consistent with the no-em-dash convention.
    postFile.title = noEmDash(postFile.title);
    postFile.excerpt = noEmDash(postFile.excerpt || (hEntry && hEntry.excerpt) || '');
    await fs.writeFile(path.join(REPO, 'content', 'posts', slug, 'showcase.json'), JSON.stringify(postFile, null, 2) + '\n', 'utf8');

    p.posts = [{
        slug: 'showcase',
        type: 'showcase',
        title: postFile.title,
        date: postFile.date || p.date,
        excerpt: postFile.excerpt,
        cover: (hEntry && hEntry.cover) || p.cover
    }];

    // 2. visible again, in Miscellaneous.
    delete p.hidden;
    p.collection = TARGET_COLLECTION;

    console.log(`${slug.padEnd(14)} collection=${p.collection}  hidden=false  post="${p.posts[0].title}"  media=${(p.media || []).length}  bullets=${(p.bullets || []).length}`);
}

// 3. old-work's excerpt kept a mojibake ellipsis from an editor round-trip.
const ow = (data.projects || []).find((x) => x.slug === 'old-work');
if (ow) {
    for (const post of ow.posts || []) {
        if (post.excerpt) post.excerpt = post.excerpt.replace(/â€¦/g, '…');
    }
    const owFile = path.join(REPO, 'content', 'posts', 'old-work', 'showcase.json');
    try {
        const j = JSON.parse(stripBom(await fs.readFile(owFile, 'utf8')));
        if (j.excerpt) { j.excerpt = j.excerpt.replace(/â€¦/g, '…'); await fs.writeFile(owFile, JSON.stringify(j, null, 2) + '\n', 'utf8'); }
        console.log('old-work       excerpt ellipsis repaired');
    } catch { /* no file */ }
}

data.contentVersion = (data.contentVersion || 0) + 1;
await fs.writeFile(PROJECTS, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`\ncontentVersion -> ${data.contentVersion}`);
