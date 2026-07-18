/* reorder-media-videos.mjs — one-off: in every project's media[], move the video
   clips (.mp4) so they come immediately AFTER the title image (media[0]) instead
   of trailing at the end. Order within each group is preserved:

       [title image] [videos…] [remaining images…]

   If a project leads with a video already, nothing moves for that entry.
   Run once from tools/:  node reorder-media-videos.mjs */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(REPO, 'content', 'projects.json');

const isVideo = (m) => /\.mp4$/i.test((m && m.src) || '');

const data = JSON.parse((await fs.readFile(PROJECTS, 'utf8')).replace(/^﻿/, ''));
let changed = 0;

for (const p of data.projects || []) {
    const media = p.media || [];
    if (media.length < 2) { console.log(`${p.slug.padEnd(18)} (${media.length} item(s), skipped)`); continue; }

    const [title, ...rest] = media;
    const videos = rest.filter(isVideo);
    if (!videos.length) { console.log(`${p.slug.padEnd(18)} no videos`); continue; }

    const others = rest.filter((m) => !isVideo(m));
    const next = [title, ...videos, ...others];
    const moved = next.some((m, i) => m !== media[i]);
    p.media = next;
    if (moved) changed++;
    console.log(`${p.slug.padEnd(18)} ${videos.length} video(s) -> position ${1}${videos.length > 1 ? '+' : ''}  (${media.length} items)${moved ? '  [reordered]' : '  [already ordered]'}`);
}

data.contentVersion = (data.contentVersion || 0) + 1;
await fs.writeFile(PROJECTS, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`\nreordered ${changed} project(s); contentVersion -> ${data.contentVersion}`);
