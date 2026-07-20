/* revert-featured-media.mjs, one-off: drop the per-ranking MEDIA overrides added
   by copy-pass.mjs, keeping the per-ranking SUMMARIES.

   Every ranking a project appears in now shows its normal slideshow again; only
   the wording still changes per list. page-home.js already falls back to
   `p.media` when a featuredCopy entry has no `media`, so removing the arrays is
   all that's needed - no code change.

   Run once from tools/:  node revert-featured-media.mjs */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(REPO, 'content', 'projects.json');

const data = JSON.parse((await fs.readFile(PROJECTS, 'utf8')).replace(/^﻿/, ''));
let removed = 0;

for (const p of data.projects || []) {
    if (!p.featuredCopy) continue;
    for (const [key, entry] of Object.entries(p.featuredCopy)) {
        if (entry && entry.media) {
            console.log(`${p.slug} / ${key}: removed ${entry.media.length} media override(s)`);
            delete entry.media;
            removed++;
        }
        // An entry with nothing left in it is just noise.
        if (entry && Object.keys(entry).length === 0) {
            delete p.featuredCopy[key];
            console.log(`${p.slug} / ${key}: entry now empty, dropped`);
        }
    }
    if (Object.keys(p.featuredCopy).length === 0) {
        delete p.featuredCopy;
        console.log(`${p.slug}: featuredCopy now empty, dropped`);
    } else {
        console.log(`${p.slug}: keeping summaries for [${Object.keys(p.featuredCopy).join(', ')}]`);
    }
}

data.contentVersion = (data.contentVersion || 0) + 1;
await fs.writeFile(PROJECTS, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`\nremoved ${removed} media override(s); contentVersion -> ${data.contentVersion}`);
