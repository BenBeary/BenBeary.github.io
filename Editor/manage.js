/* manage.js, project & taxonomy metadata editor.

   Views:
     manage.html                → all projects (newest first) + taxonomy labels
     manage.html?project=<slug> → ONE project (linked from the ⚙ button)

   Per-project forms cover title/kicker/status DROPDOWN/collection/links/dates/
   tags/summary/categories/order, the hub SLIDESHOW media[] (add/remove/reorder,
   📁 browse), highlight bullets, and 🗑 Delete project (queues its post-file
   deletions). Everything is STAGED into the shared change queue (queue.js) via
   "✓ Add to changes"; the actual GitHub commit happens from the 📋 Changes modal.
   New projects are created on the editor landing, not here. Owner-only. */

(function () {
    'use strict';

    var STATUS_OPTIONS = ['In Development', 'Prototype', 'Concept', 'On Hold', 'Finished', 'Released', 'Archived'];

    var data = null;              // working projects.json (committed + queue overlay)
    var baseline = null;          // snapshot of projects.json as loaded (data-loss guard)
    var deletedPostPaths = [];    // content/posts/... files to delete on save
    var onlyProject = new URLSearchParams(location.search).get('project') || '';
    var root, toastEl;

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function toast(m) { toastEl.textContent = m; toastEl.style.display = 'block'; clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.display = 'none'; }, 2200); }
    function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60); }

    function textField(label, k, v, ph) {
        return '<div class="ed-field"><label>' + label + '</label><input class="ed-input" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '"></div>';
    }

    // --- hub slideshow media[] rows (src + alt + browse + reorder/remove) ---
    function mediaRow(it) {
        return '<div class="ed-gallery-row" data-media-row>' +
            '<div class="ed-src-row">' +
            '<input class="ed-input" data-mf="src" value="' + esc(it.src || '') + '" placeholder="images/Blog Images/Project/shot.png">' +
            '<button type="button" class="ed-upload-btn" data-media-browse title="Pick from the image folders">📁</button>' +
            '</div>' +
            '<input class="ed-input" data-mf="alt" value="' + esc(it.alt || '') + '" placeholder="Alt text (optional)">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-media-up title="Move up">↑</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-media-down title="Move down">↓</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-media-remove title="Remove">✕</button>' +
            '</div>';
    }
    function mediaEditor(p) {
        var rows = (p.media || []).map(mediaRow).join('');
        return '<div class="ed-field ed-field--wide"><label>Hub slideshow media</label>' +
            '<p class="mg-media-hint">Shown at the top of the project page. Mix png / jpg / gif / mp4, video slides get a poster thumbnail automatically. 📁 browses the image folders.</p>' +
            '<div class="ed-gallery" data-media>' + rows + '</div>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-media-add>+ Add media</button></div>';
    }

    function projectForm(p) {
        var collOpts = (data.collections || []).map(function (c) {
            return '<option value="' + esc(c.slug) + '"' + (p.collection === c.slug ? ' selected' : '') + '>' + esc(c.label) + '</option>';
        }).join('');
        var statusVal = p.status || 'In Development';
        var statusOpts = STATUS_OPTIONS.map(function (s) {
            return '<option value="' + esc(s) + '"' + (statusVal === s ? ' selected' : '') + '>' + esc(s) + '</option>';
        }).join('');
        if (STATUS_OPTIONS.indexOf(statusVal) < 0) statusOpts = '<option value="' + esc(statusVal) + '" selected>' + esc(statusVal) + ' (custom)</option>' + statusOpts;

        var catChecks = (data.categories || []).map(function (c) {
            var on = (p.categories || []).indexOf(c.slug) !== -1;
            return '<label class="ed-check"><input type="checkbox" data-cat="' + esc(c.slug) + '"' + (on ? ' checked' : '') + '> ' + esc(c.label) + '</label>';
        }).join('');
        var order = p.order || {};
        var orderInputs = [{ slug: 'home', label: 'Home' }].concat(data.categories || []).map(function (c) {
            var v = order[c.slug] != null ? order[c.slug] : '';
            return '<div class="ed-order-cell"><label>' + esc(c.label) + '</label><input class="ed-input" type="number" data-order="' + esc(c.slug) + '" value="' + esc(v) + '" min="0"></div>';
        }).join('');

        return '<div class="ed-project" data-slug="' + esc(p.slug) + '">' +
            '<div class="ed-project__head"><div class="ed-project__title">' + esc(p.title || p.slug) + (p.hidden ? ' <span class="ed-hidden-badge">Hidden</span>' : '') + '</div>' +
            '<div class="ed-project__meta">' +
            '<span class="ed-collection-badge">' + esc(p.slug) + '</span>' +
            (onlyProject ? '' : '<a class="btn btn-ghost btn-sm" href="manage.html?project=' + encodeURIComponent(p.slug) + '">⚙ Edit only this</a>') +
            '<button class="btn btn-ghost btn-sm mg-danger" data-del-project="' + esc(p.slug) + '" title="Remove this project (and its post files) on Add to changes">🗑 Delete</button>' +
            '</div></div>' +
            '<div class="ed-block__body">' +
            '<div class="ed-meta-grid">' +
            textField('Title', 'title', p.title) +
            textField('Kicker', 'kicker', p.kicker || '', 'e.g. Team Project') +
            '<div class="ed-field"><label>Status</label><select class="ed-input" data-k="status">' + statusOpts + '</select></div>' +
            '<div class="ed-field"><label>Collection</label><select class="ed-input" data-k="collection">' + collOpts + '</select></div>' +
            textField('Play link', 'playLink', p.playLink || '') +
            textField('Date', 'date', p.date || '', 'YYYY-MM-DD') +
            '<div class="ed-field"><label>Cover path</label><div class="ed-src-row"><input class="ed-input" data-k="cover" value="' + esc(p.cover || '') + '" placeholder="images/Blog Images/Project/cover.png"><button type="button" class="ed-upload-btn" data-media-browse title="Pick from the image folders">📁</button></div></div>' +
            '<div class="ed-field"><label>Background path</label><div class="ed-src-row"><input class="ed-input" data-k="background" value="' + esc(p.background || '') + '" placeholder="images/Blog Images/Project/Blurred.jpg"><button type="button" class="ed-upload-btn" data-media-browse title="Pick from the image folders">📁</button></div></div>' +
            '<div class="ed-field ed-field--wide"><label class="ed-check ed-hide-toggle"><input type="checkbox" data-hidden' + (p.hidden ? ' checked' : '') + '> Hide this project (keep it off the site, direct links still work)</label></div>' +
            '<div class="ed-field ed-field--wide"><label>Summary</label><textarea class="ed-input" data-k="summary" rows="2">' + esc(p.summary || '') + '</textarea></div>' +
            '<div class="ed-field ed-field--wide"><label>Highlight bullets (hub left column, one per line)</label><textarea class="ed-input" data-k-bullets rows="4" placeholder="One contribution / highlight per line">' + esc((p.bullets || []).join('\n')) + '</textarea></div>' +
            '</div>' +
            mediaEditor(p) +
            '<div class="ed-field"><label>Skill categories (these are the project\'s tags)</label><div class="ed-checks">' + catChecks + '</div></div>' +
            '<div class="ed-field"><label>Order (blank = not featured there; lower shows first)</label><div class="ed-order-grid">' + orderInputs + '</div></div>' +
            '</div></div>';
    }

    var PERMANENT_COLLECTIONS = ['main'];   // Main Projects can't be renamed-away or deleted

    function taxonomyForm() {
        var cols = (data.collections || []).map(function (c) {
            var locked = PERMANENT_COLLECTIONS.indexOf(c.slug) !== -1;
            return '<div class="ed-tax-row"><span class="ed-collection-badge">' + esc(c.slug) + '</span>' +
                '<input class="ed-input" data-coll="' + esc(c.slug) + '" value="' + esc(c.label) + '">' +
                (locked ? '<span class="ed-lock" title="Main Projects is permanent">🔒</span>'
                        : '<button type="button" class="btn btn-ghost btn-sm mg-danger" data-coll-del="' + esc(c.slug) + '" title="Delete collection (its projects move to Main)">✕</button>') +
                '</div>';
        }).join('');
        var cats = (data.categories || []).map(function (c) {
            return '<div class="ed-tax-row"><span class="ed-collection-badge">' + esc(c.slug) + '</span><input class="ed-input" data-catlabel="' + esc(c.slug) + '" value="' + esc(c.label) + '"></div>';
        }).join('');
        return '<div class="ed-project"><div class="ed-project__head"><div class="ed-project__title">Collections &amp; Categories</div></div>' +
            '<div class="ed-block__body"><div class="ed-meta-grid">' +
            '<div class="ed-field"><label>Collections</label>' + cols +
            '<div class="ed-tax-row ed-tax-add"><input class="ed-input" id="mg-newcoll" placeholder="New collection name"><button type="button" class="btn btn-ghost btn-sm" id="mg-newcoll-add">+ Add</button></div></div>' +
            '<div class="ed-field"><label>Category labels</label>' + cats + '</div>' +
            '</div></div></div>';
    }

    function addCollection() {
        collect();
        var inp = document.getElementById('mg-newcoll');
        var label = (inp.value || '').trim();
        if (!label) { toast('Name the collection first.'); return; }
        var slug = slugify(label);
        if (!slug) { toast('Invalid collection name.'); return; }
        if ((data.collections || []).some(function (c) { return c.slug === slug; })) { toast('Collection "' + slug + '" already exists.'); return; }
        data.collections.push({ slug: slug, label: label });
        toast('Added collection "' + label + '" - Add to changes to stage it.');
        render();
    }

    function deleteCollection(slug) {
        if (PERMANENT_COLLECTIONS.indexOf(slug) !== -1) return;
        var c = (data.collections || []).find(function (x) { return x.slug === slug; });
        if (!c) return;
        var affected = (data.projects || []).filter(function (p) { return p.collection === slug; }).length;
        if (!confirm('Delete collection "' + c.label + '"?' + (affected ? '\n\n' + affected + ' project(s) in it will move to Main Projects.' : '') + '\n\nStaged. Commit from 📋 Changes to apply.')) return;
        collect();
        (data.projects || []).forEach(function (p) { if (p.collection === slug) p.collection = 'main'; });
        data.collections = data.collections.filter(function (x) { return x.slug !== slug; });
        toast('Deleted "' + c.label + '" - Add to changes to stage it.');
        render();
    }

    // Newest first (item request: "sort these projects by date").
    function sortedProjects() {
        return (data.projects || []).slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    }

    function render() {
        var list = sortedProjects();
        if (onlyProject) list = list.filter(function (p) { return p.slug === onlyProject; });
        var head = onlyProject
            ? '<div class="ed-toolbar-row"><h1>Edit: ' + esc(onlyProject) + '</h1>' +
              '<a class="btn btn-ghost" href="manage.html">← All projects</a></div>'
            : '<div class="ed-toolbar-row"><h1>Manage content</h1>' +
              '<a class="btn btn-ghost" href="index.html">← All content</a></div>' +
              '<p class="ed-empty">Edit project metadata &amp; the hub slideshow, then ✓ Add to changes stages it. Commit from 📋 Changes. Create new projects on the editor home.</p>';

        root.innerHTML = '<div class="ed-landing mg-landing">' + head +
            (onlyProject ? '' : taxonomyForm()) +
            (list.length ? list.map(projectForm).join('') : '<p class="ed-empty">Project not found.</p>') +
            (deletedPostPaths.length ? '<p class="ed-block-hint mg-danger">Pending deletion on Add to changes: ' + deletedPostPaths.length + ' post file(s).</p>' : '') +
            '</div>';

        root.querySelectorAll('[data-del-project]').forEach(function (btn) {
            btn.addEventListener('click', function () { deleteProject(btn.dataset.delProject); });
        });
        var addColl = document.getElementById('mg-newcoll-add');
        if (addColl) addColl.addEventListener('click', addCollection);
        root.querySelectorAll('[data-coll-del]').forEach(function (btn) {
            btn.addEventListener('click', function () { deleteCollection(btn.dataset.collDel); });
        });
    }

    function deleteProject(slug) {
        var p = (data.projects || []).find(function (x) { return x.slug === slug; });
        if (!p) return;
        var postCount = (p.posts || []).length;
        var msg = 'Delete project "' + (p.title || slug) + '"?' +
            (postCount ? '\n\nIts ' + postCount + ' post file(s) under content/posts/' + slug + '/ will also be deleted.' : '') +
            '\n\nImages are NOT deleted. This is staged, it takes effect when you commit from 📋 Changes.';
        if (!confirm(msg)) return;
        collect();
        (p.posts || []).forEach(function (post) { deletedPostPaths.push('content/posts/' + slug + '/' + post.slug + '.json'); });
        data.projects = data.projects.filter(function (x) { return x.slug !== slug; });
        toast('Removed "' + (p.title || slug) + '" - Add to changes to stage it.');
        render();
    }

    // --- media row events (browse / add / remove / reorder), delegated ---
    function mediaInputForBrowse(btn) {
        var input = btn.previousElementSibling;
        while (input && input.tagName !== 'INPUT') input = input.previousElementSibling;
        return input;
    }
    function wireRoot() {
        root.addEventListener('click', function (e) {
            var browse = e.target.closest('[data-media-browse]');
            if (browse) {
                var input = mediaInputForBrowse(browse);
                if (input && window.ImageBrowser) {
                    window.ImageBrowser.open({ pick: true, onPick: function (path) { input.value = path; input.dispatchEvent(new Event('input', { bubbles: true })); toast('Selected ' + path); } });
                }
                return;
            }
            var add = e.target.closest('[data-media-add]');
            if (add) {
                var cont = add.closest('.ed-block__body').querySelector('[data-media]');
                if (cont) { cont.insertAdjacentHTML('beforeend', mediaRow({ src: '', alt: '' })); }
                return;
            }
            var rm = e.target.closest('[data-media-remove]');
            if (rm) { var r = rm.closest('[data-media-row]'); if (r) r.remove(); return; }
            var up = e.target.closest('[data-media-up]');
            if (up) { var ru = up.closest('[data-media-row]'); if (ru && ru.previousElementSibling) ru.parentNode.insertBefore(ru, ru.previousElementSibling); return; }
            var down = e.target.closest('[data-media-down]');
            if (down) { var rd = down.closest('[data-media-row]'); if (rd && rd.nextElementSibling) rd.parentNode.insertBefore(rd.nextElementSibling, rd); return; }
        });
    }

    // Read every form back into `data`.
    function collect() {
        root.querySelectorAll('[data-coll]').forEach(function (inp) {
            var c = (data.collections || []).find(function (x) { return x.slug === inp.dataset.coll; });
            if (c) c.label = inp.value;
        });
        root.querySelectorAll('[data-catlabel]').forEach(function (inp) {
            var c = (data.categories || []).find(function (x) { return x.slug === inp.dataset.catlabel; });
            if (c) c.label = inp.value;
        });
        root.querySelectorAll('.ed-project[data-slug]').forEach(function (form) {
            var p = (data.projects || []).find(function (x) { return x.slug === form.dataset.slug; });
            if (!p) return;
            form.querySelectorAll('[data-k]').forEach(function (inp) { p[inp.dataset.k] = inp.value; });
            var hid = form.querySelector('[data-hidden]');
            if (hid) { if (hid.checked) p.hidden = true; else delete p.hidden; }
            var bt = form.querySelector('[data-k-bullets]');
            if (bt) p.bullets = bt.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
            var media = [];
            form.querySelectorAll('[data-media-row]').forEach(function (row) {
                var src = row.querySelector('[data-mf="src"]');
                var alt = row.querySelector('[data-mf="alt"]');
                if (src && src.value.trim()) media.push({ src: src.value.trim(), alt: alt ? alt.value : '' });
            });
            p.media = media;
            p.categories = Array.prototype.map.call(form.querySelectorAll('[data-cat]:checked'), function (c) { return c.dataset.cat; });
            // Tags ARE the selected skill categories (by label), no separate list.
            p.tags = p.categories.map(function (slug) { var c = (data.categories || []).find(function (x) { return x.slug === slug; }); return c ? c.label : slug; });
            var ord = {};
            form.querySelectorAll('[data-order]').forEach(function (inp) { if (inp.value !== '') ord[inp.dataset.order] = Number(inp.value); });
            p.order = ord;
        });
    }

    // Safety net: saving from a stale copy of projects.json (e.g. one fetched
    // before the redesign was pushed) used to silently blank every project's
    // media[]/bullets[]. Compare against the snapshot taken at load and make the
    // user confirm any wholesale clearing before it can be staged.
    function confirmDataLoss() {
        if (!baseline) return true;
        var lost = [];
        (baseline.projects || []).forEach(function (b) {
            var p = (data.projects || []).find(function (x) { return x.slug === b.slug; });
            if (!p) return;   // deleting a project is an explicit, separately-confirmed action
            if ((b.media || []).length && !(p.media || []).length) lost.push(b.slug + ' - ' + b.media.length + ' media item(s)');
            if ((b.bullets || []).length && !(p.bullets || []).length) lost.push(b.slug + ' - ' + b.bullets.length + ' bullet(s)');
        });
        if (!lost.length) return true;
        return confirm('This will CLEAR existing content:\n\n' + lost.join('\n') +
            '\n\nThat usually means this page loaded an older copy of projects.json. ' +
            'Continue only if you really meant to empty these.');
    }

    // Stage projects.json (+ queued post-file deletions) into the change queue.
    function stage() {
        collect();
        if (!confirmDataLoss()) { toast('Nothing staged. Your content was left alone.'); return; }
        window.EditorQueue.stageProjects(data, 'Project metadata');
        deletedPostPaths.forEach(function (path) { window.EditorQueue.stageDelete(path, 'Delete post file ' + path.split('/').slice(-2).join('/')); });
        deletedPostPaths = [];
        toast('Added to changes. Commit from 📋 Changes when ready.');
    }

    function load() {
        window.EditorQueue.loadProjects().then(function (json) {
            data = json;
            baseline = JSON.parse(JSON.stringify(json));   // for confirmDataLoss()
            deletedPostPaths = [];
            render();
        }).catch(function (err) {
            root.innerHTML = '<div class="ed-landing"><div class="data-error"><h2>Couldn\'t load projects.json</h2><p>' + esc(err.message || err) + '</p></div></div>';
        });
    }

    function init() {
        root = document.getElementById('mg-root');
        toastEl = document.getElementById('ed-toast');
        document.getElementById('mg-save').addEventListener('click', stage);
        wireRoot();
        // Reload the working copy when a commit clears the queue elsewhere.
        document.addEventListener('queue:committed', load);
        document.addEventListener('auth:ready', load);
        document.addEventListener('auth:changed', load);
        load();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
