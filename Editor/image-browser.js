/* image-browser.js — browse the repo's images under images/Blog Images/ and pick
   one into a field. Scoped to that folder (adapted from the CADRE image-manager
   tree browser). Reads the committed tree via the GitHub Trees API. Images, gifs
   and mp4 clips are all listed, each tagged so videos/gifs are easy to spot;
   thumbnails use the derived webp with a fallback to the original. Uploads and
   new folders commit immediately, then are inserted into the on-screen tree
   right away (with a local thumbnail) so it never "looks like nothing happened".
   Load after github-api.js + media.js + upload.js.

   NOTE: the tree reflects what's committed on GitHub `main`, so images that were
   only moved/renamed locally (and not pushed) appear under their pushed paths.

   window.ImageBrowser.open({ pick: bool, onPick: fn(path) })  — pick fills a field;
   otherwise clicking an image copies its path to the clipboard. */

(function () {
    'use strict';

    var BASE = 'images/Blog Images';
    var IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4'];   // mp4/gif tagged in the row

    var serverEntries = null;        // flat {path,type} from the Trees API
    var tree = null, loaded = false, loading = false;
    var expanded = new Set();
    var pickMode = false, onPick = null;
    var localThumbs = {};            // path -> data URL, for just-uploaded files
    var localAdds = [];              // optimistic {path,type} not yet in serverEntries

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function byId(id) { return document.getElementById(id); }
    function toastMsg(m) { var t = byId('ed-toast'); if (!t) return; t.textContent = m; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, 1800); }
    function ext(p) { return String(p).split('.').pop().toLowerCase(); }
    function isVid(p) { return ext(p) === 'mp4'; }
    function isGif(p) { return ext(p) === 'gif'; }

    // --- build tree from the flat listing (only under BASE) ---
    function buildHierarchy(entries) {
        var root = { name: 'Blog Images', path: BASE, type: 'folder', children: [] };
        var map = new Map(); map.set(BASE, root);
        entries.forEach(function (e) {
            if (e.type !== 'tree' || e.path === BASE || e.path.indexOf(BASE + '/') !== 0) return;
            if (!map.has(e.path)) map.set(e.path, { name: e.path.split('/').pop(), path: e.path, type: 'folder', children: [] });
        });
        // Parent every folder (create any missing intermediate dirs).
        map.forEach(function (node, p) {
            if (p === BASE) return;
            var parentPath = p.split('/').slice(0, -1).join('/');
            if (!map.has(parentPath)) map.set(parentPath, { name: parentPath.split('/').pop(), path: parentPath, type: 'folder', children: [] });
        });
        map.forEach(function (node, p) {
            if (p === BASE) return;
            var parent = map.get(p.split('/').slice(0, -1).join('/'));
            if (parent && parent.children.indexOf(node) < 0) parent.children.push(node);
        });
        entries.forEach(function (e) {
            if (e.type !== 'blob' || e.path.indexOf(BASE + '/') !== 0) return;
            var name = e.path.split('/').pop();
            if (IMG_EXT.indexOf(ext(name)) < 0) return;
            var parent = map.get(e.path.split('/').slice(0, -1).join('/'));
            if (parent && !parent.children.some(function (c) { return c.path === e.path; })) parent.children.push({ name: name, path: e.path, type: 'image' });
        });
        sortTree(root);
        return root;
    }
    function sortTree(node) {
        if (node.type !== 'folder') return;
        node.children.sort(function (a, b) { return a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name); });
        node.children.forEach(sortTree);
    }
    function rebuild() {
        var entries = (serverEntries || []).slice();
        var seen = {}; entries.forEach(function (e) { seen[e.path] = true; });
        localAdds.forEach(function (e) { if (!seen[e.path]) { entries.push(e); seen[e.path] = true; } });
        tree = buildHierarchy(entries);
        renderTree();
    }

    // --- render ---
    function typeTag(path) {
        if (isVid(path)) return '<span class="imgb-tag imgb-tag--vid">▶ MP4</span>';
        if (isGif(path)) return '<span class="imgb-tag imgb-tag--gif">GIF</span>';
        return '';
    }
    function renderNode(node, depth) {
        var pad = 8 + depth * 16;
        if (node.type === 'image') {
            var newBadge = localThumbs[node.path] ? '<span class="imgb-tag imgb-tag--new">NEW</span>' : '';
            return '<div class="imgb-row imgb-image" data-path="' + esc(node.path) + '" title="' + esc(node.path) + '" style="padding-left:' + pad + 'px">' +
                '<img class="imgb-thumb" loading="lazy" alt="" data-src="' + esc(node.path) + '">' +
                '<span class="imgb-name">' + esc(node.name) + '</span>' + typeTag(node.path) + newBadge + '</div>';
        }
        var isRoot = node.path === BASE;
        var open = isRoot || expanded.has(node.path);
        var html = '<div class="imgb-row imgb-folder" data-path="' + esc(node.path) + '" style="padding-left:' + pad + 'px">' +
            '<span class="imgb-icon">' + (open ? '📂' : '📁') + '</span><span class="imgb-name">' + esc(node.name) + '</span></div>';
        if (open) {
            if (!node.children.length) html += '<div class="imgb-empty" style="padding-left:' + (pad + 22) + 'px">(empty)</div>';
            else node.children.forEach(function (c) { html += renderNode(c, depth + 1); });
        }
        return html;
    }
    function mimeFor(path) {
        return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4' }[ext(path)] || 'application/octet-stream';
    }
    function renderTree() {
        var body = byId('imgbrowse-body');
        if (!body) return;
        if (!tree) { body.innerHTML = '<div class="imgb-empty">No tree loaded.</div>'; return; }
        body.innerHTML = '<div class="imgb-tree">' + renderNode(tree, 0) + '</div>';
        body.querySelectorAll('.imgb-thumb').forEach(function (img) {
            var src = img.dataset.src;
            if (localThumbs[src]) {                 // just-uploaded: show the local bytes
                if (isVid(src)) { img.style.visibility = 'hidden'; } else { img.src = localThumbs[src]; }
                return;
            }
            if (isVid(src)) {                        // committed video: derived poster frame
                img.src = window.posterUrl(src);
                img.onerror = function () { img.onerror = null; img.style.visibility = 'hidden'; };
            } else {
                window.setImg(img, src, 'thumb');
            }
        });
    }
    function renderState(msg) { var body = byId('imgbrowse-body'); if (body) body.innerHTML = '<div class="imgb-empty">' + esc(msg) + '</div>'; }

    // --- load ---
    async function load() {
        if (loading) return;
        loading = true;
        renderState('Loading images…');
        try {
            var data = await ghGetTree('main', true);
            serverEntries = data.tree || [];
            loaded = true;
            rebuild();
        } catch (err) {
            renderState('Couldn\'t load images: ' + (err && err.message ? err.message : err));
        } finally { loading = false; }
    }

    function toggle(p) { if (p === BASE) return; if (expanded.has(p)) expanded.delete(p); else expanded.add(p); renderTree(); }
    function choose(path) {
        if (pickMode && typeof onPick === 'function') { var cb = onPick; close(); cb(path); }
        else if (navigator.clipboard) { navigator.clipboard.writeText(path).then(function () { toastMsg('Copied path: ' + path); }).catch(function () {}); }
    }

    // --- write actions (immediate commit + optimistic on-screen insert) -------
    function requireAuth() {
        if (typeof isAuthenticated === 'function' && isAuthenticated()) return true;
        if (typeof openAuthModal === 'function') openAuthModal();
        return false;
    }
    function readDataUrl(file) {
        return new Promise(function (resolve, reject) { var r = new FileReader(); r.onload = function () { resolve(String(r.result)); }; r.onerror = reject; r.readAsDataURL(file); });
    }

    function addLocal(path, type) { if (!localAdds.some(function (e) { return e.path === path; })) localAdds.push({ path: path, type: type }); }

    async function uploadFiles(folderPath, files) {
        if (!requireAuth() || !window.EditorUpload) return;
        var ok = 0;
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            try {
                var path = await window.EditorUpload.uploadImage(folderPath, f);   // immediate PUT
                try { localThumbs[path] = await readDataUrl(f); } catch (_) {}
                addLocal(path, 'blob');
                ok++;
            } catch (err) {
                if (err && err.message !== 'cancelled') alert('Upload failed for ' + f.name + ': ' + (err.message || err));
            }
        }
        if (ok) {
            toastMsg('Uploaded ' + ok + ' file(s) to ' + folderPath);
            expanded.add(folderPath);
            rebuild();                        // show immediately from the optimistic add
            refreshServer();                  // reconcile with GitHub in the background
        }
    }

    function uploadInto(folderPath) {
        if (!requireAuth()) return;
        var input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/png,image/jpeg,image/gif,image/webp,video/mp4';
        input.addEventListener('change', function () { if (input.files.length) uploadFiles(folderPath, Array.from(input.files)); });
        input.click();
    }

    async function newFolder(parentPath) {
        if (!requireAuth()) return;
        var name = prompt('Folder name:');
        if (!name) return;
        var slug = name.trim().replace(/[^a-zA-Z0-9 _-]+/g, '-').replace(/^-+|-+$/g, '');
        if (!slug) { alert('Invalid folder name.'); return; }
        var folder = parentPath + '/' + slug;
        var path = folder + '/.gitkeep';
        // Optimistic: show the folder now, then commit the .gitkeep.
        addLocal(folder, 'tree');
        expanded.add(parentPath); expanded.add(folder);
        rebuild();
        try {
            await ghFetch('PUT', '/contents/' + encodeURI(path), { message: 'Editor: new folder ' + folder, content: '', branch: 'main' });
            toastMsg('Created ' + folder);
            refreshServer();
        } catch (err) {
            alert('Could not create folder: ' + (err.message || err));
            localAdds = localAdds.filter(function (e) { return e.path !== folder; });
            rebuild();
        }
    }

    // Re-fetch the committed tree without a "Loading…" flash; keeps optimistic adds.
    async function refreshServer() {
        try { var data = await ghGetTree('main', true); serverEntries = data.tree || []; rebuild(); } catch (_) {}
    }

    // --- context menu (right-click folders/images) ---------------------------
    var menuEl = null;
    function hideMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
    function showMenu(e, node) {
        e.preventDefault();
        hideMenu();
        var items = node.type === 'image'
            ? [{ label: 'Copy path', fn: function () { if (navigator.clipboard) navigator.clipboard.writeText(node.path).then(function () { toastMsg('Copied path'); }).catch(function () {}); } }]
            : [{ label: '⬆ Add images / clips…', fn: function () { uploadInto(node.path); } },
               { label: '📁 New folder…', fn: function () { newFolder(node.path); } }];
        menuEl = document.createElement('div');
        menuEl.className = 'imgb-menu';
        items.forEach(function (it) {
            var d = document.createElement('div');
            d.className = 'imgb-menu__item';
            d.textContent = it.label;
            d.addEventListener('click', function () { hideMenu(); it.fn(); });
            menuEl.appendChild(d);
        });
        menuEl.style.left = e.clientX + 'px';
        menuEl.style.top = e.clientY + 'px';
        document.body.appendChild(menuEl);
        var r = menuEl.getBoundingClientRect();
        if (r.right > window.innerWidth) menuEl.style.left = (window.innerWidth - r.width - 4) + 'px';
        if (r.bottom > window.innerHeight) menuEl.style.top = (window.innerHeight - r.height - 4) + 'px';
    }

    function findNode(node, path) {
        if (!node) return null;
        if (node.path === path) return node;
        if (node.type !== 'folder') return null;
        for (var i = 0; i < node.children.length; i++) {
            var f = findNode(node.children[i], path);
            if (f) return f;
        }
        return null;
    }

    // --- modal ---
    function showModal() { var o = byId('imgbrowse-overlay'); if (o) { o.style.display = 'flex'; o.classList.toggle('imgb-pick', pickMode); } }
    function hideModal() { var o = byId('imgbrowse-overlay'); if (o) o.style.display = 'none'; }

    function open(opts) {
        pickMode = !!(opts && opts.pick);
        onPick = opts && opts.onPick;
        var hint = byId('imgbrowse-hint');
        if (hint) hint.textContent = (pickMode ? 'Click an image to use it in this field. ' : 'Click an image to copy its path. ') +
            'Right-click a folder to add images / clips or a folder, or drag files onto it.';
        showModal();
        if (!loaded) load(); else rebuild();
    }
    function close() { hideModal(); onPick = null; pickMode = false; }

    function init() {
        var body = byId('imgbrowse-body');
        if (body) {
            body.addEventListener('click', function (e) {
                var imgRow = e.target.closest('.imgb-image');
                if (imgRow) { choose(imgRow.dataset.path); return; }
                var folder = e.target.closest('.imgb-folder');
                if (folder) toggle(folder.dataset.path);
            });
            body.addEventListener('contextmenu', function (e) {
                var row = e.target.closest('.imgb-row');
                if (!row || !row.dataset.path || !tree) return;
                var node = findNode(tree, row.dataset.path);
                if (node) showMenu(e, node);
            });
            body.addEventListener('dragover', function (e) {
                var row = e.target.closest('.imgb-folder');
                if (!row || !e.dataTransfer.types || Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') < 0) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                row.classList.add('imgb-drop-hover');
            });
            body.addEventListener('dragleave', function (e) {
                var row = e.target.closest('.imgb-folder');
                if (row) row.classList.remove('imgb-drop-hover');
            });
            body.addEventListener('drop', function (e) {
                var row = e.target.closest('.imgb-folder');
                if (!row || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
                e.preventDefault();
                row.classList.remove('imgb-drop-hover');
                uploadFiles(row.dataset.path, Array.from(e.dataTransfer.files));
            });
        }
        var closeBtn = byId('imgbrowse-close'); if (closeBtn) closeBtn.addEventListener('click', close);
        var reload = byId('imgbrowse-reload'); if (reload) reload.addEventListener('click', function () { loaded = false; load(); });
        var overlay = byId('imgbrowse-overlay'); if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        document.addEventListener('click', function (e) { if (menuEl && !menuEl.contains(e.target)) hideMenu(); });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            hideMenu();
            var o = byId('imgbrowse-overlay');
            if (o && o.style.display === 'flex') close();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.ImageBrowser = { open: open, close: close };
})();
