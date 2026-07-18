/* manage.js — project & taxonomy metadata editor.

   Views:
     manage.html                → all projects + taxonomy labels
     manage.html?project=<slug> → ONE project (linked from the ⚙ button on the landing)

   Features: per-project forms (title/kicker/status DROPDOWN/collection/links/
   dates/tags/categories/order), ➕ New project, 🗑 Delete project (also deletes
   its post JSONs on save), collection/category label editing, 📜 History.
   "Save changes" commits projects.json (+ any queued post deletions) in ONE
   ghBatchCommit and bumps contentVersion. Owner-only. */

(function () {
    'use strict';

    var STATUS_OPTIONS = ['In Development', 'Prototype', 'Concept', 'On Hold', 'Finished', 'Released', 'Archived'];

    var data = null;              // working projects.json
    var deletedPostPaths = [];    // content/posts/... files to delete on save
    var onlyProject = new URLSearchParams(location.search).get('project') || '';
    var root, toastEl;

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function toast(m) { toastEl.textContent = m; toastEl.style.display = 'block'; clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.display = 'none'; }, 2200); }
    function decodeB64Utf8(b64) { var bin = atob(String(b64).replace(/\s/g, '')); var by = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) by[i] = bin.charCodeAt(i); return new TextDecoder('utf-8').decode(by); }
    function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60); }
    function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

    function textField(label, k, v, ph) {
        return '<div class="ed-field"><label>' + label + '</label><input class="ed-input" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '"></div>';
    }

    function projectForm(p) {
        var collOpts = (data.collections || []).map(function (c) {
            return '<option value="' + esc(c.slug) + '"' + (p.collection === c.slug ? ' selected' : '') + '>' + esc(c.label) + '</option>';
        }).join('');
        var statusVal = p.status || 'In Development';
        var statusOpts = STATUS_OPTIONS.map(function (s) {
            return '<option value="' + esc(s) + '"' + (statusVal === s ? ' selected' : '') + '>' + esc(s) + '</option>';
        }).join('');
        // A legacy free-text status not in the list stays selectable so it isn't lost silently.
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
            '<div class="ed-project__head"><div class="ed-project__title">' + esc(p.title || p.slug) + '</div>' +
            '<div class="ed-project__meta">' +
            '<span class="ed-collection-badge">' + esc(p.slug) + '</span>' +
            (onlyProject ? '' : '<a class="btn btn-ghost btn-sm" href="manage.html?project=' + encodeURIComponent(p.slug) + '">⚙ Edit only this</a>') +
            '<button class="btn btn-ghost btn-sm mg-danger" data-del-project="' + esc(p.slug) + '" title="Remove this project (and its post files) on Save">🗑 Delete</button>' +
            '</div></div>' +
            '<div class="ed-block__body">' +
            '<div class="ed-meta-grid">' +
            textField('Title', 'title', p.title) +
            textField('Kicker', 'kicker', p.kicker || '', 'e.g. Team Project') +
            '<div class="ed-field"><label>Status</label><select class="ed-input" data-k="status">' + statusOpts + '</select></div>' +
            '<div class="ed-field"><label>Collection</label><select class="ed-input" data-k="collection">' + collOpts + '</select></div>' +
            textField('Play link', 'playLink', p.playLink || '') +
            textField('Date', 'date', p.date || '', 'YYYY-MM-DD') +
            textField('Cover path', 'cover', p.cover || '') +
            textField('Background path', 'background', p.background || '') +
            '<div class="ed-field ed-field--wide"><label>Tags (comma-separated)</label><input class="ed-input" data-k="tags" value="' + esc((p.tags || []).join(', ')) + '"></div>' +
            '<div class="ed-field ed-field--wide"><label>Summary</label><textarea class="ed-input" data-k="summary" rows="2">' + esc(p.summary || '') + '</textarea></div>' +
            '</div>' +
            '<div class="ed-field"><label>Skill categories</label><div class="ed-checks">' + catChecks + '</div></div>' +
            '<div class="ed-field"><label>Order (blank = not featured there; lower shows first)</label><div class="ed-order-grid">' + orderInputs + '</div></div>' +
            '</div></div>';
    }

    function taxonomyForm() {
        var cols = (data.collections || []).map(function (c) {
            return '<div class="ed-tax-row"><span class="ed-collection-badge">' + esc(c.slug) + '</span><input class="ed-input" data-coll="' + esc(c.slug) + '" value="' + esc(c.label) + '"></div>';
        }).join('');
        var cats = (data.categories || []).map(function (c) {
            return '<div class="ed-tax-row"><span class="ed-collection-badge">' + esc(c.slug) + '</span><input class="ed-input" data-catlabel="' + esc(c.slug) + '" value="' + esc(c.label) + '"></div>';
        }).join('');
        return '<div class="ed-project"><div class="ed-project__head"><div class="ed-project__title">Collections &amp; Categories</div></div>' +
            '<div class="ed-block__body"><div class="ed-meta-grid">' +
            '<div class="ed-field"><label>Collection labels</label>' + cols + '</div>' +
            '<div class="ed-field"><label>Category labels</label>' + cats + '</div>' +
            '</div></div></div>';
    }

    function newProjectForm() {
        var collOpts = (data.collections || []).map(function (c) { return '<option value="' + esc(c.slug) + '">' + esc(c.label) + '</option>'; }).join('');
        return '<div class="ed-project" id="mg-new" style="display:none">' +
            '<div class="ed-project__head"><div class="ed-project__title">New project</div></div>' +
            '<div class="ed-block__body"><div class="ed-meta-grid">' +
            '<div class="ed-field"><label>Title</label><input class="ed-input" id="mg-new-title" placeholder="e.g. Old Work Collection"></div>' +
            '<div class="ed-field"><label>Slug (URL)</label><input class="ed-input mono" id="mg-new-slug" placeholder="old-work"></div>' +
            '<div class="ed-field"><label>Collection</label><select class="ed-input" id="mg-new-coll">' + collOpts + '</select></div>' +
            '<div class="ed-field" style="align-self:end"><button class="btn btn-primary" id="mg-new-add">Add project</button></div>' +
            '</div><p class="ed-block-hint">Added locally — click 💾 Save changes to commit. Then set its cover/media and add posts.</p></div></div>';
    }

    function render() {
        var list = (data.projects || []);
        if (onlyProject) list = list.filter(function (p) { return p.slug === onlyProject; });
        var head = onlyProject
            ? '<div class="ed-toolbar-row"><h1>Edit: ' + esc(onlyProject) + '</h1>' +
              '<a class="btn btn-ghost" href="manage.html">← All projects</a>' +
              '<button class="btn btn-ghost" id="mg-history">📜 History</button></div>'
            : '<div class="ed-toolbar-row"><h1>Manage content</h1>' +
              '<button class="btn btn-ghost" id="mg-new-toggle">➕ New project</button>' +
              '<button class="btn btn-ghost" id="mg-history">📜 History</button></div>' +
              '<p class="ed-empty">Edit metadata, then 💾 Save changes commits content/projects.json (~10 min to go live).</p>';

        root.innerHTML = '<div class="ed-landing mg-landing">' + head +
            (onlyProject ? '' : newProjectForm() + taxonomyForm()) +
            (list.length ? list.map(projectForm).join('') : '<p class="ed-empty">Project not found.</p>') +
            (deletedPostPaths.length ? '<p class="ed-block-hint mg-danger">Pending deletion on save: ' + deletedPostPaths.length + ' post file(s).</p>' : '') +
            '</div>';

        var nt = document.getElementById('mg-new-toggle');
        if (nt) nt.addEventListener('click', function () {
            var f = document.getElementById('mg-new');
            f.style.display = f.style.display === 'none' ? '' : 'none';
        });
        var na = document.getElementById('mg-new-add');
        if (na) na.addEventListener('click', addNewProject);
        var nTitle = document.getElementById('mg-new-title');
        if (nTitle) nTitle.addEventListener('input', function () {
            var s = document.getElementById('mg-new-slug');
            if (s && !s.dataset.touched) s.value = slugify(nTitle.value);
        });
        var nSlug = document.getElementById('mg-new-slug');
        if (nSlug) nSlug.addEventListener('input', function () { nSlug.dataset.touched = '1'; });
        var hist = document.getElementById('mg-history');
        if (hist) hist.addEventListener('click', function () { if (window.EditorHistory) window.EditorHistory.open(); });
        root.querySelectorAll('[data-del-project]').forEach(function (btn) {
            btn.addEventListener('click', function () { deleteProject(btn.dataset.delProject); });
        });
    }

    function addNewProject() {
        collect();   // keep any in-progress edits
        var title = document.getElementById('mg-new-title').value.trim();
        var slug = slugify(document.getElementById('mg-new-slug').value || title);
        var coll = document.getElementById('mg-new-coll').value;
        if (!title || !slug) { toast('Give the project a title and slug.'); return; }
        if ((data.projects || []).some(function (p) { return p.slug === slug; })) { toast('Slug "' + slug + '" already exists.'); return; }
        data.projects.push({
            slug: slug, title: title, kicker: '', status: 'In Development', date: todayIso(),
            playLink: '', summary: '', tags: [], categories: [], collection: coll,
            order: {}, media: [], cover: '', background: '', posts: []
        });
        toast('Added "' + title + '" — remember to Save changes.');
        render();
    }

    function deleteProject(slug) {
        var p = (data.projects || []).find(function (x) { return x.slug === slug; });
        if (!p) return;
        var postCount = (p.posts || []).length;
        var msg = 'Delete project "' + (p.title || slug) + '"?' +
            (postCount ? '\n\nIts ' + postCount + ' post file(s) under content/posts/' + slug + '/ will also be deleted on Save.' : '') +
            '\n\nImages are NOT deleted. This takes effect when you click Save changes.';
        if (!confirm(msg)) return;
        collect();
        (p.posts || []).forEach(function (post) { deletedPostPaths.push('content/posts/' + slug + '/' + post.slug + '.json'); });
        data.projects = data.projects.filter(function (x) { return x.slug !== slug; });
        toast('Removed "' + (p.title || slug) + '" — Save changes to commit.');
        render();
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
            form.querySelectorAll('[data-k]').forEach(function (inp) {
                var k = inp.dataset.k, v = inp.value;
                if (k === 'tags') p.tags = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                else p[k] = v;
            });
            p.categories = Array.prototype.map.call(form.querySelectorAll('[data-cat]:checked'), function (c) { return c.dataset.cat; });
            var order = {};
            form.querySelectorAll('[data-order]').forEach(function (inp) {
                if (inp.value !== '') order[inp.dataset.order] = Number(inp.value);
            });
            p.order = order;
        });
    }

    async function save() {
        if (typeof isAuthenticated !== 'function' || !isAuthenticated()) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
        collect();
        var extra = deletedPostPaths.length ? ('\nAlso deletes ' + deletedPostPaths.length + ' post file(s).') : '';
        if (!confirm('Commit content/projects.json to main (the live site)?' + extra + '\nIt can take ~10 minutes to appear.')) return;
        var btn = document.getElementById('mg-save');
        btn.disabled = true; var label = btn.textContent; btn.textContent = 'Saving…';
        try {
            data.contentVersion = (data.contentVersion || 0) + 1;
            var changes = [{ op: 'put', path: 'content/projects.json', content: JSON.stringify(data, null, 2) + '\n' }];
            deletedPostPaths.forEach(function (p) { changes.push({ op: 'delete', path: p }); });
            await ghBatchCommit({ message: 'Editor: update project metadata', changes: changes });
            deletedPostPaths = [];
            toast('Saved! Live in ~10 min.');
            render();
        } catch (err) {
            alert('Save failed: ' + (err && err.message ? err.message : err));
        } finally {
            btn.disabled = false; btn.textContent = label;
        }
    }

    function renderSignedOut() {
        root.innerHTML = '<div class="ed-landing"><div class="ed-signin-prompt"><h1>Manage content</h1>' +
            '<p>Sign in to edit project metadata.</p><button class="btn btn-primary" id="mg-signin">🔒 Sign in</button></div></div>';
        var b = document.getElementById('mg-signin');
        if (b) b.addEventListener('click', function () { if (typeof openAuthModal === 'function') openAuthModal(); });
    }

    function load() {
        if (typeof isAuthenticated !== 'function' || !isAuthenticated()) { renderSignedOut(); return; }
        ghFetch('GET', '/contents/content/projects.json').then(function (res) {
            data = JSON.parse(decodeB64Utf8(res.content));
            deletedPostPaths = [];
            render();
        }).catch(function (err) {
            root.innerHTML = '<div class="ed-landing"><div class="data-error"><h2>Couldn\'t load projects.json</h2><p>' + esc(err.message || err) + '</p></div></div>';
        });
    }

    function init() {
        root = document.getElementById('mg-root');
        toastEl = document.getElementById('ed-toast');
        document.getElementById('mg-save').addEventListener('click', save);
        document.addEventListener('auth:ready', load);
        document.addEventListener('auth:changed', load);
        load();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
