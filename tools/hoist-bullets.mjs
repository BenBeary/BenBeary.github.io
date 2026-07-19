/* hoist-bullets.mjs, one-off (M5.6): move each showcase post's first `bullets`
   block into the project's new `bullets[]` (shown in the hub hero's left column,
   original-site style). If a "Contributions"-style heading directly precedes the
   bullets block it moves out too (the hero renders its own label). The showcase
   post keeps whatever else it has (About heading + text).
   Run once from tools/:  node hoist-bullets.mjs */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(REPO, 'content', 'projects.json');

const data = JSON.parse(await fs.readFile(PROJECTS, 'utf8'));

for (const p of data.projects || []) {
    if (!Array.isArray(p.bullets)) p.bullets = [];
    const postPath = path.join(REPO, 'content', 'posts', p.slug, 'showcase.json');
    let post = null;
    try { post = JSON.parse(await fs.readFile(postPath, 'utf8')); } catch { /* no showcase */ }
    if (!post) { console.log(`${p.slug.padEnd(18)} (no showcase)`); continue; }

    const blocks = post.blocks || [];
    const bi = blocks.findIndex(b => b.type === 'bullets');
    if (bi < 0) { console.log(`${p.slug.padEnd(18)} (no bullets block)`); continue; }

    p.bullets = blocks[bi].items || [];
    let removeFrom = bi, removeCount = 1;
    const prev = blocks[bi - 1];
    if (prev && prev.type === 'heading' && /contribution/i.test(prev.text || '')) { removeFrom = bi - 1; removeCount = 2; }
    blocks.splice(removeFrom, removeCount);
    post.blocks = blocks;
    await fs.writeFile(postPath, JSON.stringify(post, null, 2) + '\n', 'utf8');
    console.log(`${p.slug.padEnd(18)} bullets:${String(p.bullets.length).padStart(2)}  showcase blocks left:${blocks.length}`);
}

data.contentVersion = (data.contentVersion || 0) + 1;
await fs.writeFile(PROJECTS, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('\nwrote projects.json (contentVersion ' + data.contentVersion + ')');
