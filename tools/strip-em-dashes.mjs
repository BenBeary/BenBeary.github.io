/* strip-em-dashes.mjs — one-off: remove every em dash (—) from the files written
   for this redesign, rewording so the text still reads naturally rather than just
   swapping the character out.

   Skips the user's imported CADRE sources (Editor/Cadre Blog Poster Copy,
   docs/reference-cadre) and the legacy site files, which aren't ours to rewrite.

   Rules, most specific first:
     " — Showcase"      -> " Showcase"        (post titles)
     " — Ben Beary"     -> " | Ben Beary"     (page titles)
     "word — word"      -> "word, word"       (prose aside, lowercase follows)
     "word — Word"      -> "word. Word"       (prose, new sentence follows)
     everything else    -> " - "              (code comments, labels)

   Run from tools/:  node strip-em-dashes.mjs [--dry]
*/

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

const SKIP_DIRS = new Set(['node_modules', '.git', 'images', 'Game', 'Archived', 'Cadre Blog Poster Copy', 'reference-cadre', '_derived']);
const SKIP_FILES = new Set(['projects.js', 'newWebMain.js', 'newWebStyle.css', 'navbar.css', 'strip-em-dashes.mjs']);
const EXT = new Set(['.html', '.js', '.css', '.json', '.md', '.mjs']);

async function* walk(dir) {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
            if (SKIP_DIRS.has(e.name)) continue;
            yield* walk(path.join(dir, e.name));
        } else if (EXT.has(path.extname(e.name)) && !SKIP_FILES.has(e.name)) {
            yield path.join(dir, e.name);
        }
    }
}

// Prose-aware replacement. Order matters.
function rewrite(text) {
    return text
        .replace(/ — Showcase/g, ' Showcase')
        .replace(/ — Ben Beary/g, ' | Ben Beary')
        // "…word — Capital" starts a new thought: make it a sentence break.
        .replace(/([a-z0-9,)\]]) — ([A-Z])/g, '$1. $2')
        // "…word — word" is an aside: a comma carries it.
        .replace(/([a-z0-9)\]]) — ([a-z])/g, '$1, $2')
        // Anything left (code comments, list dashes, odd spacing).
        .replace(/\s*—\s*/g, ' - ');
}

let files = 0, replaced = 0;
for await (const file of walk(REPO)) {
    const before = await fs.readFile(file, 'utf8');
    if (!before.includes('—')) continue;
    const count = (before.match(/—/g) || []).length;
    const after = rewrite(before);
    if (after === before) continue;
    files++; replaced += count;
    console.log(`${String(count).padStart(3)}  ${path.relative(REPO, file)}`);
    if (!DRY) await fs.writeFile(file, after, 'utf8');
}
console.log(`\n${DRY ? '[dry run] would rewrite' : 'rewrote'} ${replaced} em dash(es) across ${files} file(s)`);
