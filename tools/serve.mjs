/* serve.mjs, zero-dependency static file server for local testing (the site
   uses fetch(), which fails on file://). Serves the repo root.

     node serve.mjs            # http://localhost:8080
     node serve.mjs 3000       # custom port

   Not part of the deployed site. Live Server (VS Code) is the interactive
   alternative; this exists so headless/CLI testing has a real HTTP origin. */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8080;

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ico': 'image/x-icon',
};

http.createServer(async (req, res) => {
    try {
        let rel = decodeURIComponent(req.url.split('?')[0]);
        if (rel.endsWith('/')) rel += 'index.html';
        const abs = path.join(ROOT, rel);
        if (!abs.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
        const data = await fs.readFile(abs);
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 Not Found');
    }
}).listen(PORT, () => console.log(`serving ${ROOT} at http://localhost:${PORT}`));
