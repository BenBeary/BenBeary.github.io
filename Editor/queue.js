/* queue.js — the editor's persistent change queue (CADRE ChangeQueue concept).

   Every mutating action in the editor (publish a post, save project metadata,
   add/delete a project, delete a post, upload an image, make a folder) STAGES a
   file change here instead of committing immediately. The queue lives in
   localStorage, so it survives moving between edit / manage / index pages and
   even a tab reload. A universal "Changes" button in the header (injected onto
   every editor page) opens a modal listing everything pending; one click bundles
   it all into a single ghBatchCommit. A beforeunload guard warns if you try to
   close the tab with unstaged-to-GitHub work.

   Files are keyed by repo path (last write per path wins), so re-editing the
   same post just replaces its queued entry. content/projects.json is always
   edited as a whole via loadProjects()/stageProjects() so metadata edits, new
   projects, and post publishes all compose into one file.

   Public surface (window.EditorQueue):
     loadProjects()        -> Promise<projectsJson>   committed(main)+queue overlay
     stageProjects(json, label)
     stagePut(path, content, label)
     stagePutB64(path, base64, label)
     stageDelete(path, label)
     getStaged(path) | hasPath(path) | remove(path)
     list() | count() | isEmpty() | clear()
     imageFileEntries()    -> [{path, op}]  (queued files under images/)
     commit(message?)      -> Promise<result>
   Fires document event 'queue:changed' whenever the queue mutates.
   Requires auth.js + github-api.js + data.js. Load before the page script. */

(function () {
    'use strict';

    var KEY = 'pf.editor.queue';

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function nowTs() { return Date.now(); }

    // ---- storage ----
    function read() {
        try {
            var q = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (q && q.files) return q;
        } catch (_) {}
        return { version: 1, updatedAt: 0, files: {} };
    }
    function write(q) {
        q.updatedAt = nowTs();
        try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) { alert('Could not save changes locally (browser storage full?).'); }
        document.dispatchEvent(new CustomEvent('queue:changed'));
    }

    function stageFile(path, entry) {
        var q = read();
        entry.ts = nowTs();
        q.files[path] = entry;
        write(q);
    }

    var API = {
        stagePut: function (path, content, label) { stageFile(path, { op: 'put', kind: 'text', content: content, label: label || path }); },
        stagePutB64: function (path, base64, label) { stageFile(path, { op: 'put', kind: 'b64', base64: base64, label: label || path }); },
        stageDelete: function (path, label) { stageFile(path, { op: 'delete', label: label || path }); },
        getStaged: function (path) { return read().files[path] || null; },
        hasPath: function (path) { return !!read().files[path]; },
        remove: function (path) { var q = read(); if (q.files[path]) { delete q.files[path]; write(q); } },
        clear: function () { write({ version: 1, updatedAt: 0, files: {} }); },
        count: function () { return Object.keys(read().files).length; },
        isEmpty: function () { return Object.keys(read().files).length === 0; },
        list: function () {
            var files = read().files;
            return Object.keys(files).map(function (p) {
                return { path: p, op: files[p].op, kind: files[p].kind, label: files[p].label, ts: files[p].ts };
            }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        },
        // Queued files that live under images/ — the browser overlays these on
        // the committed tree so uploads/new folders show before they're pushed.
        imageFileEntries: function () {
            var files = read().files;
            return Object.keys(files).filter(function (p) { return p.indexOf('images/') === 0; })
                .map(function (p) { return { path: p, op: files[p].op }; });
        }
    };

    // ---- projects.json: committed(main) overlaid with the queued edit --------
    function decodeB64Utf8(b64) {
        var bin = atob(String(b64).replace(/\s/g, ''));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    API.loadProjects = function () {
        var staged = read().files['content/projects.json'];
        if (staged && staged.kind === 'text') {
            try { return Promise.resolve(JSON.parse(staged.content)); } catch (_) {}
        }
        // Authenticated → freshest committed copy on main (pre-CDN). Otherwise the
        // deployed/public file via data.js (may lag, but works signed-out).
        if (typeof isAuthenticated === 'function' && isAuthenticated() && typeof ghFetch === 'function') {
            return ghFetch('GET', '/contents/content/projects.json')
                .then(function (res) { return JSON.parse(decodeB64Utf8(res.content)); })
                .catch(function () { return window.getProjects().then(clone); });
        }
        return window.getProjects().then(clone);
    };

    API.stageProjects = function (json, label) {
        API.stagePut('content/projects.json', JSON.stringify(json, null, 2) + '\n', label || 'Project metadata');
    };

    // ---- commit everything in one batch --------------------------------------
    API.commit = function (message) {
        if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
            if (typeof openAuthModal === 'function') openAuthModal();
            return Promise.reject(new Error('Sign in to commit.'));
        }
        var q = read();
        var paths = Object.keys(q.files);
        if (!paths.length) return Promise.reject(new Error('Nothing to commit.'));

        // Bump contentVersion once, here, if projects.json is part of this commit
        // (so a batch that adds/edits posts also busts the CDN cache).
        if (q.files['content/projects.json'] && q.files['content/projects.json'].kind === 'text') {
            try {
                var pj = JSON.parse(q.files['content/projects.json'].content);
                pj.contentVersion = (pj.contentVersion || 0) + 1;
                q.files['content/projects.json'].content = JSON.stringify(pj, null, 2) + '\n';
            } catch (_) {}
        }

        var changes = paths.map(function (p) {
            var f = q.files[p];
            if (f.op === 'delete') return { op: 'delete', path: p };
            if (f.kind === 'b64') return { op: 'putB64', path: p, base64: f.base64 };
            return { op: 'put', path: p, content: f.content };
        });

        var msg = message || ('Editor: commit ' + paths.length + ' change' + (paths.length === 1 ? '' : 's'));
        return ghBatchCommit({ message: msg, changes: changes }).then(function (result) {
            API.clear();
            return result;
        });
    };

    // ======================================================================
    //  Universal header button + review modal (injected on every editor page)
    // ======================================================================
    var btnEl = null, badgeEl = null, overlayEl = null;

    function opLabel(op) { return op === 'delete' ? 'Delete' : 'Save'; }
    function opClass(op) { return op === 'delete' ? 'q-op--del' : 'q-op--put'; }

    function renderList() {
        var body = document.getElementById('q-modal-body');
        if (!body) return;
        var items = API.list();
        if (!items.length) {
            body.innerHTML = '<p class="ed-empty">No pending changes. Everything is committed.</p>';
        } else {
            body.innerHTML = '<ul class="q-list">' + items.map(function (it) {
                return '<li class="q-item">' +
                    '<span class="q-op ' + opClass(it.op) + '">' + opLabel(it.op) + '</span>' +
                    '<span class="q-label" title="' + esc(it.path) + '">' + esc(it.label) + '</span>' +
                    '<button type="button" class="q-drop" data-drop="' + esc(it.path) + '" title="Remove from changes">✕</button>' +
                    '</li>';
            }).join('') + '</ul>';
        }
        var commitBtn = document.getElementById('q-commit');
        if (commitBtn) commitBtn.disabled = !items.length;
    }

    function refreshBadge() {
        var n = API.count();
        if (badgeEl) { badgeEl.textContent = n; badgeEl.style.display = n ? '' : 'none'; }
        if (btnEl) btnEl.classList.toggle('has-changes', n > 0);
    }

    function openModal() { renderList(); if (overlayEl) overlayEl.style.display = 'flex'; }
    function closeModal() { if (overlayEl) overlayEl.style.display = 'none'; }

    async function doCommit() {
        var commitBtn = document.getElementById('q-commit');
        var label = commitBtn.textContent;
        commitBtn.disabled = true; commitBtn.textContent = 'Committing…';
        try {
            var result = await API.commit();
            closeModal();
            var t = document.getElementById('ed-toast');
            if (t) { t.textContent = 'Committed! Live in ~10 min.'; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, 2600); }
            if (result && result.commitUrl) console.log('Commit:', result.commitUrl);
            document.dispatchEvent(new CustomEvent('queue:committed'));
        } catch (err) {
            alert('Commit failed: ' + (err && err.message ? err.message : err));
        } finally {
            commitBtn.disabled = false; commitBtn.textContent = label;
        }
    }

    function injectUI() {
        var actions = document.querySelector('.ed-header__actions');
        if (actions) {
            btnEl = document.createElement('button');
            btnEl.type = 'button';
            btnEl.id = 'q-open';
            btnEl.className = 'btn btn-ghost btn-sm q-btn';
            btnEl.title = 'Review and commit your staged changes';
            btnEl.innerHTML = '📋 Changes <span class="q-badge" id="q-badge">0</span>';
            var chip = document.getElementById('auth-chip');
            if (chip && chip.parentNode === actions) actions.insertBefore(btnEl, chip);
            else actions.appendChild(btnEl);
            badgeEl = document.getElementById('q-badge');
            btnEl.addEventListener('click', openModal);
        }

        overlayEl = document.createElement('div');
        overlayEl.className = 'modal-overlay';
        overlayEl.id = 'q-modal-overlay';
        overlayEl.innerHTML =
            '<div class="modal-box q-box">' +
            '<div class="modal-title">Pending changes</div>' +
            '<p class="ed-block-hint">These are saved in this browser as you work. Commit sends them all to GitHub in one batch (live in ~10 min).</p>' +
            '<div class="q-body" id="q-modal-body"></div>' +
            '<div class="modal-actions">' +
            '<button class="btn btn-ghost mg-danger" id="q-clear" style="margin-right:auto">Discard all</button>' +
            '<button class="btn btn-ghost" id="q-close">Close</button>' +
            '<button class="btn btn-primary" id="q-commit">🚀 Commit to GitHub</button>' +
            '</div></div>';
        document.body.appendChild(overlayEl);

        document.getElementById('q-close').addEventListener('click', closeModal);
        document.getElementById('q-commit').addEventListener('click', doCommit);
        document.getElementById('q-clear').addEventListener('click', function () {
            if (API.isEmpty()) return;
            if (confirm('Discard all ' + API.count() + ' pending change(s)? They are not committed to GitHub yet and cannot be recovered.')) { API.clear(); renderList(); }
        });
        overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) closeModal(); });
        document.getElementById('q-modal-body').addEventListener('click', function (e) {
            var d = e.target.closest('[data-drop]');
            if (d) { API.remove(d.dataset.drop); renderList(); }
        });

        refreshBadge();
    }

    document.addEventListener('queue:changed', refreshBadge);

    // Warn before leaving with uncommitted work.
    window.addEventListener('beforeunload', function (e) {
        if (!API.isEmpty()) { e.preventDefault(); e.returnValue = ''; return ''; }
    });

    function init() { injectUI(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.EditorQueue = API;
})();
