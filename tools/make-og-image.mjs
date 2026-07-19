/* make-og-image.mjs - M7: build images/og-image.jpg, the 1200x630 card that
   social platforms show when a link to the site is shared. Built from a project
   cover so the card is real artwork rather than a blank placeholder, darkened
   slightly so any overlaid platform UI stays readable.

   Run from tools/:  node make-og-image.mjs */

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(REPO, 'images', 'Blog Images', 'Signal-Link', 'singla_link_poster.png');
const OUT = path.join(REPO, 'images', 'og-image.jpg');

await sharp(SOURCE)
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .modulate({ brightness: 0.92 })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(OUT);

const meta = await sharp(OUT).metadata();
const { size } = await sharp(OUT).toBuffer({ resolveWithObject: true }).then((r) => r.info);
console.log(`wrote images/og-image.jpg ${meta.width}x${meta.height}, ${(size / 1024).toFixed(0)} KB`);
