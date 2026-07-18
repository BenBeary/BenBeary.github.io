/* image-browser.js — browse the repo's images under images/Blog Images/ and pick
   one into a field. Scoped to that folder (adapted/trimmed from the CADRE
   image-manager tree browser). Reads the committed tree via the GitHub Trees API
   (works unauthenticated for this public repo). Thumbnails use the derived
   webp with a fallback to the original. Load after github-api.js + media.js.

   NOTE: the tree reflects what's committed on GitHub `main`, so newly moved/
   uploaded images appear only after they're pushed/committed.

   window.ImageBrowser.open({ pick: bool, onPick: fn(path) })  — pick fills a field;
   otherwise clicking an image copies its path to the clipboard. */

(function () {
    'use strict';

    var BASE = 'images/Blog Images';
    var IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4'];   // mp4: poster-webp thumbnail

    var tree = null, loaded = false, loading = false;
    var expanded = new Set();
    var pickMode = false, onPick = null;

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function byId(id) { return document.getElementById(id); }
    function toastMsg(m) { var t = byId('ed-toast'); if (!t) return; t.textContent = m; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, 1800); }

    // --- build tree from the flat Trees API listing (only under BASE) ---
    function buildHierarchy(entries) {
        var root = { name: 'Blog Images', path: BASE, type: 'folder', children: [] };
        var map = new Map(); map.set(BASE, root);
        entries.forEach(function (e) {
            if (e.type !== 'tree' || e.path === BASE || e.path.indexOf(BASE + '/') !== 0) return;
            map.set(e.path, { name: e.path.split('/').pop(), path: e.path, type: 'folder', children: [] });
        });
        entries.forEach(function (e) {
            if (e.type !== 'tree' || e.path === BASE || e.path.indexOf(BASE + '/') !== 0) return;
            var parent = map.get(e.path.split('/').slice(0, -1).join('/'));
            var node = map.get(e.path);
            if (parent && node) parent.children.push(node);
        });
        entries.forEach(function (e) {
            if (e.type !== 'blob' || e.path.indexOf(BASE + '/') !== 0) return;
            var name = e.path.split('/').pop();
            if (IMG_EXT.indexOf(name.split('.').pop().toLowerCase()) < 0) return;
            var parent = map.get(e.path.split('/').slice(0, -1).join('/'));
            if (parent) parent.children.push({ name: name, path: e.path, type: 'image' });
        });
        sortTree(root);
        return root;
    }
    function sortTree(node) {
        if (node.type !== 'folder') return;
        node.children.sort(function (a, b) { return a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name); });
        node.children.forEach(sortTree);
    }

    // --- render ---
    function renderNode(node, depth) {
        var pad = 8 + depth * 16;
        if (node.type === 'image') {
            return '<div class="imgb-row imgb-image" data-path="' + esc(node.path) + '" title="' + esc(node.path) + '" style="padding-left:' + pad + 'px">' +
                '<img class="imgb-thumb" loading="lazy" alt="" data-src="' + esc(node.path) + '">' +
                '<span class="imgb-name">' + esc(node.name) + '</span></div>';
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
    function renderTree() {
        var body = byId('imgbrowse-body');
        if (!body) return;
        if (!tree) { body.innerHTML = '<div class="imgb-empty">No tree loaded.</div>'; return; }
        body.innerHTML = '<div class="imgb-tree">' + renderNode(tree, 0) + '</div>';
        body.querySelectorAll('.imgb-thumb').forEach(function (img) {
            var src = img.dataset.src;
            if (/\.mp4$/i.test(src)) {   // video: derived poster frame, ▶ hint in name row
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
            tree = buildHierarchy(data.tree || []);
            loaded = true;
            renderTree();
        } catch (err) {
            renderState('Couldn\'t load images: ' + (err && err.message ? err.message : err));
        } finally { loading = false; }
    }

    function toggle(p) { if (p === BASE) return; if (expanded.has(p)) expanded.delete(p); else expanded.add(p); renderTree(); }
    function choose(path) {
        if (pickMode && typeof onPick === 'function') { var cb = onPick; close(); cb(path); }
        else if (navigator.clipboard) { navigator.clipboard.writeText(path).then(function () { toastMsg('Copied path: ' + path); }).catch(function () {}); }
    }

    // --- modal ---
    function showModal() { var o = byId('imgbrowse-overlay'); if (o) { o.style.display = 'flex'; o.classList.toggle('imgb-pick', pickMode); } }
    function hideModal() { var o = byId('imgbrowse-overlay'); if (o) o.style.display = 'none'; }

    function open(opts) {
        pickMode = !!(opts && opts.pick);
        onPick = opts && opts.onPick;
        var hint = byId('imgbrowse-hint');
        if (hint) hint.textContent = pickMode ? 'Click an image to use it in this field.' : 'Click an image to copy its path.';
        showModal();
        if (!loaded) load(); else renderTree();
    }
    function close() { hideModal(); onPick = null; pickMode = false; }

    function init() {
        var body = byId('imgbrowse-body');
        if (body) body.addEventListener('click', function (e) {
            var imgRow = e.target.closest('.imgb-image');
            if (imgRow) { choose(imgRow.dataset.path); return; }
            var folder = e.target.closest('.imgb-folder');
            if (folder) toggle(folder.dataset.path);
        });
        var closeBtn = byId('imgbrowse-close'); if (closeBtn) closeBtn.addEventListener('click', close);
        var reload = byId('imgbrowse-reload'); if (reload) reload.addEventListener('click', function () { loaded = false; load(); });
        var overlay = byId('imgbrowse-overlay'); if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var o = byId('imgbrowse-overlay'); if (o && o.style.display === 'flex') close(); } });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.ImageBrowser = { open: open, close: close };
})();
