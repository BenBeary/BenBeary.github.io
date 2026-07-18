/* hoist-showcase-media.mjs — one-off (M5.5): move each showcase post's visual
   blocks (image / gallery / video / slideshow) into the project's new `media[]`
   (rendered as the hub's top slideshow, original-site style). The showcase post
   keeps its write-up blocks (headings/text/bullets/…). Also seeds `status`:
   signal-link -> In Development (was "Actively Developing"), others -> Finished.
   Run once from tools/:  node hoist-showcase-media.mjs */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(REPO, 'content', 'projects.json');

const data = JSON.parse(await fs.readFile(PROJECTS, 'utf8'));

for (const p of data.projects || []) {
    const postPath = path.join(REPO, 'content', 'posts', p.slug, 'showcase.json');
    let post = null;
    try { post = JSON.parse(await fs.readFile(postPath, 'utf8')); } catch { /* no showcase */ }

    const media = [];
    if (post) {
        const kept = [];
        for (const b of post.blocks || []) {
            if (b.type === 'image') media.push({ src: b.src, alt: b.alt || '' });
            else if (b.type === 'gallery' || b.type === 'slideshow') (b.items || []).forEach(i => media.push({ src: i.src, alt: i.alt || '' }));
            else if (b.type === 'video') media.push({ src: b.src, alt: '' });
            else kept.push(b);
        }
        if (media.length) {
            post.blocks = kept;
            await fs.writeFile(postPath, JSON.stringify(post, null, 2) + '\n', 'utf8');
        }
    }
    p.media = media;
    if (!p.status) p.status = 'Finished';
    if (p.status === 'Actively Developing') p.status = 'In Development';
    console.log(`${p.slug.padEnd(18)} media:${String(media.length).padStart(2)}  status:${p.status}  showcase blocks left:${post ? post.blocks.length : '—'}`);
}

data.contentVersion = (data.contentVersion || 0) + 1;
await fs.writeFile(PROJECTS, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('\nwrote projects.json (contentVersion ' + data.contentVersion + ')');
