/* order.js - the project ordering board.

   Replaces the grid of "order" number inputs that used to live on the Manage
   page. A project's rank in a list IS its `order[<key>]` value: dropping it at
   the top makes it 1, and everything below renumbers. Removing it from a list
   deletes that key, which is how a project opts out of a listing.

   Layout: a sidebar of every project on the left, and one drop list per ranking
   key on the right - `home` (the Featured row on the home page) plus every skill
   category from projects.json (Programming, UI / UX, Level Design, ...).

   Drag a project from the sidebar into a list to add it, drag rows within a list
   to reorder, and drag a row out (or hit its ✕) to remove it. Nothing touches
   GitHub here: "✓ Add to changes" stages projects.json into the shared queue and
   the commit happens from the 📋 Changes modal. Owner-only. */

(function () {
    'use strict';

    var HOME_KEY = 'home';
    var data = null;
    var root, toastEl;
    var drag = null;      // { slug, from }  from = category key, or null when from the sidebar

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function toast(m) { toastEl.textContent = m; toastEl.style.display = 'block'; clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.display = 'none'; }, 2200); }

    function keys() {
        return [{ slug: HOME_KEY, label: 'Home (Featured)' }].concat(data.categories || []);
    }
    function bySlug(slug) { return (data.projects || []).find(function (p) { return p.slug === slug; }); }

    // Projects ranked in a key, in rank order. Ties break by date descending,
    // matching how the site itself orders them, so the board can never show a
    // different sequence from what a visitor sees.
    function ranked(key) {
        return (data.projects || [])
            .filter(function (p) { return p.order && p.order[key] != null; })
            .sort(function (a, b) {
                return a.order[key] - b.order[key] || String(b.date || '').localeCompare(String(a.date || ''));
            });
    }

    // The stored ranks came from hand-typed numbers and are messy: a stray 0, and
    // several categories where two projects share the same value. Renumber every
    // list to a clean 1..n on load so the numbers match the board exactly.
    // Returns true when that actually changed something.
    function normalizeAll() {
        var changed = false;
        keys().forEach(function (k) {
            ranked(k.slug).forEach(function (p, i) {
                if (p.order[k.slug] !== i + 1) { p.order[k.slug] = i + 1; changed = true; }
            });
        });
        return changed;
    }

    // Rewrite a key's ranks as a clean 1..n after any change.
    function renumber(key, orderedSlugs) {
        orderedSlugs.forEach(function (slug, i) {
            var p = bySlug(slug);
            if (!p) return;
            if (!p.order) p.order = {};
            p.order[key] = i + 1;
        });
    }

    function removeFrom(key, slug) {
        var p = bySlug(slug);
        if (!p || !p.order) return;
        delete p.order[key];
        renumber(key, ranked(key).map(function (x) { return x.slug; }));
    }

    // Insert `slug` into `key` at `index` (end when index is null).
    function insertInto(key, slug, index) {
        var current = ranked(key).map(function (x) { return x.slug; }).filter(function (s) { return s !== slug; });
        var at = (index == null || index > current.length) ? current.length : index;
        current.splice(at, 0, slug);
        renumber(key, current);
    }

    // ---- rendering ----------------------------------------------------------
    function sidebarItem(p) {
        var count = Object.keys(p.order || {}).length;
        return '<div class="ord-chip" draggable="true" data-slug="' + esc(p.slug) + '" title="Drag into a list on the right">' +
            '<span class="ord-chip__title">' + esc(p.title || p.slug) + (p.hidden ? ' <span class="ed-hidden-badge">Hidden</span>' : '') + '</span>' +
            '<span class="ord-chip__meta">' + count + ' list' + (count === 1 ? '' : 's') + '</span>' +
            '</div>';
    }

    function listRow(p, key, i) {
        return '<li class="ord-row" draggable="true" data-slug="' + esc(p.slug) + '" data-key="' + esc(key) + '">' +
            '<span class="ord-rank">' + (i + 1) + '</span>' +
            '<span class="ord-row__title">' + esc(p.title || p.slug) + '</span>' +
            '<button type="button" class="ord-remove" data-remove="' + esc(p.slug) + '" data-key="' + esc(key) + '" title="Remove from this list">✕</button>' +
            '</li>';
    }

    function catPanel(k) {
        var list = ranked(k.slug);
        return '<section class="ord-cat" data-key="' + esc(k.slug) + '">' +
            '<h2 class="ord-cat__title">' + esc(k.label) + '<span class="ord-cat__count">' + list.length + '</span></h2>' +
            '<ul class="ord-list" data-key="' + esc(k.slug) + '">' +
            (list.length ? list.map(function (p, i) { return listRow(p, k.slug, i); }).join('')
                         : '<li class="ord-empty">Drag projects here</li>') +
            '</ul></section>';
    }

    function render() {
        var projects = (data.projects || []).slice().sort(function (a, b) {
            return String(a.title || '').localeCompare(String(b.title || ''));
        });
        root.innerHTML =
            '<div class="ord-page">' +
            '<div class="ed-toolbar-row"><h1>Order projects</h1>' +
            '<a class="btn btn-ghost" href="index.html">← All content</a></div>' +
            '<p class="ed-block-hint">A project\'s position in a list is its rank. Drag from the sidebar into a list to add it, ' +
            'drag rows to reorder, and use ✕ (or drag a row back to the sidebar) to take it out. ' +
            '<strong>Home (Featured)</strong> drives the featured rows on the home page; the skill lists drive ' +
            '<code>projects.html?cat=…</code> and the home page\'s skill chips.</p>' +
            '<div class="ord-layout">' +
            '<aside class="ord-sidebar" id="ord-sidebar">' +
            '<h2 class="ord-sidebar__title">All projects</h2>' +
            '<div class="ord-chips">' + projects.map(sidebarItem).join('') + '</div>' +
            '<p class="ord-sidebar__hint">Drop a row here to remove it from its list.</p>' +
            '</aside>' +
            '<div class="ord-cats">' + keys().map(catPanel).join('') + '</div>' +
            '</div></div>';
        wire();
    }

    // ---- drag and drop ------------------------------------------------------
    function clearMarks() {
        root.querySelectorAll('.ord-row, .ord-list, .ord-sidebar').forEach(function (el) {
            el.classList.remove('is-drop-before', 'is-drop-after', 'is-drop-into');
        });
    }
    function afterMidpoint(row, y) {
        var r = row.getBoundingClientRect();
        return (y - r.top) > r.height / 2;
    }

    function wire() {
        // Sources: sidebar chips and list rows.
        root.querySelectorAll('.ord-chip, .ord-row').forEach(function (el) {
            el.addEventListener('dragstart', function (e) {
                drag = { slug: el.dataset.slug, from: el.dataset.key || null };
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', el.dataset.slug); } catch (_) {}
                el.classList.add('is-dragging');
            });
            el.addEventListener('dragend', function () {
                el.classList.remove('is-dragging');
                clearMarks();
                drag = null;
            });
        });

        // Targets: each category list (drop at a position, or at the end).
        root.querySelectorAll('.ord-list').forEach(function (list) {
            list.addEventListener('dragover', function (e) {
                if (!drag) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                clearMarks();
                var row = e.target.closest ? e.target.closest('.ord-row') : null;
                if (row && row.parentNode === list) row.classList.add(afterMidpoint(row, e.clientY) ? 'is-drop-after' : 'is-drop-before');
                else list.classList.add('is-drop-into');
            });
            list.addEventListener('dragleave', function (e) { if (e.target === list) list.classList.remove('is-drop-into'); });
            list.addEventListener('drop', function (e) {
                if (!drag) return;
                e.preventDefault();
                var key = list.dataset.key;
                var row = e.target.closest ? e.target.closest('.ord-row') : null;
                var index = null;
                if (row && row.parentNode === list) {
                    var slugs = ranked(key).map(function (x) { return x.slug; });
                    index = slugs.indexOf(row.dataset.slug);
                    if (afterMidpoint(row, e.clientY)) index++;
                    // Dragging down within the same list: account for its own removal.
                    if (drag.from === key) {
                        var old = slugs.indexOf(drag.slug);
                        if (old > -1 && old < index) index--;
                    }
                }
                var moved = bySlug(drag.slug);
                var already = moved && moved.order && moved.order[key] != null;
                insertInto(key, drag.slug, index);
                clearMarks();
                toast((already ? 'Reordered "' : 'Added "') + (moved ? moved.title : drag.slug) + '" in ' + key + '.');
                drag = null;
                render();
            });
        });

        // Dropping a row back on the sidebar removes it from its list.
        var side = document.getElementById('ord-sidebar');
        if (side) {
            side.addEventListener('dragover', function (e) {
                if (!drag || !drag.from) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                side.classList.add('is-drop-into');
            });
            side.addEventListener('dragleave', function () { side.classList.remove('is-drop-into'); });
            side.addEventListener('drop', function (e) {
                if (!drag || !drag.from) return;
                e.preventDefault();
                var p = bySlug(drag.slug);
                removeFrom(drag.from, drag.slug);
                clearMarks();
                toast('Removed "' + (p ? p.title : drag.slug) + '" from ' + drag.from + '.');
                drag = null;
                render();
            });
        }

        // ✕ removes without dragging.
        root.querySelectorAll('[data-remove]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var p = bySlug(btn.dataset.remove);
                removeFrom(btn.dataset.key, btn.dataset.remove);
                toast('Removed "' + (p ? p.title : btn.dataset.remove) + '" from ' + btn.dataset.key + '.');
                render();
            });
        });
    }

    // ---- stage ---------------------------------------------------------------
    function stage() {
        window.EditorQueue.stageProjects(data, 'Project ordering');
        toast('Added to changes. Commit from 📋 Changes when ready.');
    }

    var normalized = false;

    function load() {
        window.EditorQueue.loadProjects().then(function (json) {
            data = json;
            normalized = normalizeAll();
            render();
            if (normalized) toast('Tidied up some duplicate / stray rank numbers. Add to changes to keep it.');
        }).catch(function (err) {
            root.innerHTML = '<div class="ed-landing"><div class="data-error"><h2>Couldn\'t load projects.json</h2><p>' + esc(err.message || err) + '</p></div></div>';
        });
    }

    function init() {
        root = document.getElementById('ord-root');
        toastEl = document.getElementById('ed-toast');
        document.getElementById('ord-save').addEventListener('click', stage);
        document.addEventListener('auth:ready', load);
        document.addEventListener('auth:changed', load);
        load();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
