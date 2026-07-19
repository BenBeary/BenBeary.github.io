/* optimize-media.mjs, generate the site's derived media into images/_derived,
   mirroring the images/ tree. Local-only; run with `npm run optimize` from tools/.

   Everything lives under one top-level images/ folder: originals stay in their
   project subfolders, generated files mirror the tree inside images/_derived/.

   Derivatives (see docs/ARCHITECTURE.md "Conventions"):
     images/<sub>/<name>.<ext>  (png|jpg|jpeg|gif)
        -> images/_derived/<sub>/<name>.thumb.webp   width 480,  q70  (cards / shelves)
        -> images/_derived/<sub>/<name>.md.webp      width 1280, q78  (post bodies)
     images/<sub>/<name>.mp4
        -> images/_derived/<sub>/<name>.poster.webp  frame @1s (fallback 0s), width 1280, q78
        -> images/_derived/<sub>/<name>.opt.mp4      ONLY if source > 20 MB (crf 28, <=1080p,
                                                      +faststart, aac 128k)

   Derived name = original basename with its extension stripped, plus the kind
   suffix (bar.png -> bar.thumb.webp). This matches the pure string transform in
   js/site/media.js. GIFs contribute first-frame stills only; the original gif
   stays the playback source in posts.

   Idempotent: an output is skipped when it already exists and is newer than its
   source, so re-running after new uploads only does the new work. Source files
   are never renamed, moved, or modified. */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

const execFileP = promisify(execFile);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SRC_ROOT = path.join(REPO, 'images');
const OUT_ROOT = path.join(REPO, 'images', '_derived');   // lives inside images/, skipped by the walk

const THUMB_W = 480, THUMB_Q = 70;
const MD_W = 1280, MD_Q = 78;
const POSTER_W = 1280, POSTER_Q = 78;
// Re-encode mp4s larger than this. Lowered from 20 MB once slideshow videos
// started autoplaying: an 11-16 MB clip streaming automatically is a real cost
// to a visitor, and these re-encode to roughly a tenth of the size.
const OPT_MP4_THRESHOLD = 8 * 1024 * 1024;
// _derived is the OUTPUT tree (inside images/), skip it so we never re-derive
// from generated files (e.g. treating a .opt.mp4 as a new source video).
const SKIP_DIRS = new Set(['_derived', 'Archived', 'Game', 'node_modules', '.git']);

const stats = { thumbs: 0, mds: 0, posters: 0, opts: 0, skipped: 0, errors: 0, bytes: 0 };
const derivedByOutput = new Map();   // collision guard: output path -> source path

// --- helpers ---------------------------------------------------------------

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

// True when `out` is already up to date relative to `src` (exists & newer).
async function isFresh(out, src) {
    if (!(await exists(out))) return false;
    const [o, s] = await Promise.all([fs.stat(out), fs.stat(src)]);
    return o.mtimeMs >= s.mtimeMs;
}

function claimOutput(out, src) {
    const prev = derivedByOutput.get(out);
    if (prev && prev !== src) {
        throw new Error(`output collision: "${out}" from both "${prev}" and "${src}" ` +
            `(two sources with the same basename but different extensions in one folder)`);
    }
    derivedByOutput.set(out, src);
}

async function addBytes(p) { try { stats.bytes += (await fs.stat(p)).size; } catch {} }

// --- image derivatives (png/jpg/jpeg/gif) ----------------------------------

async function makeWebp(src, out, width, quality) {
    claimOutput(out, src);
    if (await isFresh(out, src)) { stats.skipped++; await addBytes(out); return; }
    await fs.mkdir(path.dirname(out), { recursive: true });
    await sharp(src, { failOn: 'none' })        // page 0 of a GIF; tolerate odd files
        .rotate()                               // honor EXIF orientation
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toFile(out);
    await addBytes(out);
}

async function processImage(src, outBase) {
    const thumb = outBase + '.thumb.webp';
    const md = outBase + '.md.webp';
    const beforeT = await exists(thumb), beforeM = await exists(md);
    await makeWebp(src, thumb, THUMB_W, THUMB_Q); if (!beforeT && await exists(thumb)) stats.thumbs++;
    await makeWebp(src, md, MD_W, MD_Q);          if (!beforeM && await exists(md)) stats.mds++;
}

// --- video derivatives (mp4) -----------------------------------------------

async function makePoster(src, out) {
    claimOutput(out, src);
    if (await isFresh(out, src)) { stats.skipped++; await addBytes(out); return; }
    await fs.mkdir(path.dirname(out), { recursive: true });
    const tmp = path.join(os.tmpdir(), `poster-${process.pid}-${Date.now()}.png`);
    // Try a frame at 1s; very short clips fall back to the first frame (0s).
    for (const ss of ['1', '0']) {
        try {
            await execFileP(ffmpegPath, ['-y', '-ss', ss, '-i', src, '-frames:v', '1', tmp]);
            break;
        } catch (e) {
            if (ss === '0') throw e;
        }
    }
    await sharp(tmp).resize({ width: POSTER_W, withoutEnlargement: true }).webp({ quality: POSTER_Q }).toFile(out);
    await fs.rm(tmp, { force: true });
    await addBytes(out);
    stats.posters++;
}

async function makeOptMp4(src, out) {
    claimOutput(out, src);
    if (await isFresh(out, src)) { stats.skipped++; await addBytes(out); return; }
    await fs.mkdir(path.dirname(out), { recursive: true });
    await execFileP(ffmpegPath, [
        '-y', '-i', src,
        '-vf', 'scale=-2:min(1080\\,ih)',   // downscale to <=1080p, never upscale; even width
        '-c:v', 'libx264', '-crf', '28', '-preset', 'slow',
        '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '128k',
        out
    ], { maxBuffer: 1024 * 1024 * 16 });
    await addBytes(out);
    stats.opts++;
}

async function processVideo(src, outBase) {
    await makePoster(src, outBase + '.poster.webp');
    const size = (await fs.stat(src)).size;
    if (size > OPT_MP4_THRESHOLD) await makeOptMp4(src, outBase + '.opt.mp4');
}

// --- walk ------------------------------------------------------------------

async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (SKIP_DIRS.has(e.name)) continue;
            await walk(full);
            continue;
        }
        const ext = path.extname(e.name).toLowerCase();
        const rel = path.relative(SRC_ROOT, full);
        const outBase = path.join(OUT_ROOT, rel).slice(0, -ext.length);   // strip extension
        try {
            if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
                await processImage(full, outBase);
            } else if (ext === '.mp4') {
                await processVideo(full, outBase);
            }
        } catch (err) {
            stats.errors++;
            console.error(`  ! ${rel}: ${err.message}`);
        }
    }
}

// --- main ------------------------------------------------------------------

const t0 = Date.now();
console.log(`optimize-media: ${SRC_ROOT} -> ${OUT_ROOT}`);
if (!ffmpegPath) { console.error('ffmpeg-static path is null, is it installed?'); process.exit(1); }
await fs.mkdir(OUT_ROOT, { recursive: true });
await walk(SRC_ROOT);

const secs = ((Date.now() - t0) / 1000).toFixed(1);
const mb = (stats.bytes / 1024 / 1024).toFixed(1);
console.log('\n  derived media summary');
console.log('  ---------------------');
console.log(`  thumb.webp   ${stats.thumbs}`);
console.log(`  md.webp      ${stats.mds}`);
console.log(`  poster.webp  ${stats.posters}`);
console.log(`  opt.mp4      ${stats.opts}`);
console.log(`  skipped      ${stats.skipped} (already up to date)`);
console.log(`  errors       ${stats.errors}`);
console.log(`  images/_derived total ${mb} MB`);
console.log(`  time         ${secs}s`);
if (stats.errors) process.exitCode = 1;
