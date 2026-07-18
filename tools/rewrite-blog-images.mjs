/* rewrite-blog-images.mjs — one-off: rewrite content JSON image paths from
   images/<Project>/ to images/Blog Images/<Project>/ after the project folders
   were moved under images/Blog Images/. Run once from tools/:  node rewrite-blog-images.mjs */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = ['CleanUpCrew', 'DeathTides', 'DevilsAcre', 'DiceClimber', 'DockingBay',
    'DodgeKarts', 'IdolofAshes', 'MeowareDefender', 'PortLochne', 'Signal-Link', 'SpiritOutbreak'];

async function listJson(dir) {
    const out = [];
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...await listJson(full));
        else if (e.name.endsWith('.json')) out.push(full);
    }
    return out;
}

const files = [path.join(REPO, 'content', 'projects.json'), ...await listJson(path.join(REPO, 'content', 'posts'))];
let changed = 0;
for (const f of files) {
    let text = await fs.readFile(f, 'utf8');
    const before = text;
    for (const folder of FOLDERS) {
        // Only rewrite images/<Folder>/ that isn't already under Blog Images.
        text = text.replaceAll('images/' + folder + '/', 'images/Blog Images/' + folder + '/');
    }
    if (text !== before) { await fs.writeFile(f, text, 'utf8'); changed++; console.log('rewrote', path.relative(REPO, f)); }
}
console.log(`done — ${changed}/${files.length} files updated.`);
