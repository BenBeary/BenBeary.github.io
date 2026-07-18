/* editor-index.js — the editor landing page. Sign-in prompt when signed out; a
   project/post/draft picker when signed in. Re-renders on 'auth:ready' /
   'auth:changed' and after queue commits. Creating a NEW project lives here (it
   stages into the change queue, so it shows up immediately). Each post has a
   delete button; edits stage into the queue and commit from 📋 Changes.
   Content comes from EditorQueue.loadProjects() (committed main + queue overlay). */

(function () {
    'use strict';

    var root, data = null;

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function fmtDate(iso) { var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? (iso || '') : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60); }
    function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function toast(m) { var t = document.getElementById('ed-toast'); if (!t) return; t.textContent = m; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, 2000); }

    function renderSignedOut() {
        root.innerHTML =
            '<div class="ed-landing"><div class="ed-signin-prompt">' +
            '<h1>Portfolio Editor</h1>' +
            '<p>Sign in with your GitHub token to create, edit, and publish posts.</p>' +
            '<button class="btn btn-primary" id="ed-signin-btn">🔒 Sign in</button>' +
            '</div></div>';
        var b = document.getElementById('ed-signin-btn');
        if (b) b.addEventListener('click', function () { if (typeof openAuthModal === 'function') openAuthModal(); });
    }

    function postRow(projectSlug, post) {
        var cls = post.type === 'showcase' ? 'is-showcase' : 'is-blog';
        var label = post.type === 'showcase' ? 'Showcase' : 'Blog';
        return '<li class="ed-post">' +
            '<span class="ed-post__type ' + cls + '">' + label + '</span>' +
            '<a class="ed-post__title" href="edit.html?project=' + encodeURIComponent(projectSlug) + '&post=' + encodeURIComponent(post.slug) + '">' + esc(post.title) + '</a>' +
            '<span class="ed-post__date">' + esc(fmtDate(post.date)) + '</span>' +
            '<button class="ed-post__del" data-del-post="' + esc(projectSlug) + '::' + esc(post.slug) + '" title="Delete this post">🗑</button>' +
            '</li>';
    }

    function projectBlock(p) {
        var posts = (p.posts || []).slice().sort(function (a, b) {
            if (a.type === 'showcase') return -1;
            if (b.type === 'showcase') return 1;
            return String(b.date).localeCompare(String(a.date));
        });
        return '<div class="ed-project">' +
            '<div class="ed-project__head">' +
            '<div>' +
            (p.kicker ? '<div class="ed-project__kicker">' + esc(p.kicker) + '</div>' : '') +
            '<div class="ed-project__title">' + esc(p.title) + '</div>' +
            '</div>' +
            '<div class="ed-project__meta">' +
            '<span class="ed-collection-badge">' + esc(p.collection || 'main') + '</span>' +
            '<a class="btn btn-ghost btn-sm" href="edit.html?project=' + encodeURIComponent(p.slug) + '&type=blog">+ New post</a>' +
            '<a class="btn btn-ghost btn-sm" href="manage.html?project=' + encodeURIComponent(p.slug) + '" title="Edit this project\'s metadata &amp; slideshow">⚙ Edit</a>' +
            '</div>' +
            '</div>' +
            (posts.length ? '<ul class="ed-posts">' + posts.map(function (post) { return postRow(p.slug, post); }).join('') + '</ul>'
                          : '<ul class="ed-posts"><li class="ed-empty" style="padding:var(--space-2) var(--space-3)">No posts yet — “+ New post”, or set up the hub slideshow in ⚙ Edit.</li></ul>') +
            '</div>';
    }

    function newProjectForm() {
        var collOpts = (data.collections || []).map(function (c) { return '<option value="' + esc(c.slug) + '">' + esc(c.label) + '</option>'; }).join('');
        return '<div class="ed-project" id="ed-new" style="display:none">' +
            '<div class="ed-project__head"><div class="ed-project__title">New project</div></div>' +
            '<div class="ed-block__body"><div class="ed-meta-grid">' +
            '<div class="ed-field"><label>Title</label><input class="ed-input" id="ed-new-title" placeholder="e.g. Old Work"></div>' +
            '<div class="ed-field"><label>Slug (URL)</label><input class="ed-input mono" id="ed-new-slug" placeholder="old-work"></div>' +
            '<div class="ed-field"><label>Collection</label><select class="ed-input" id="ed-new-coll">' + collOpts + '</select></div>' +
            '<div class="ed-field" style="align-self:end"><button class="btn btn-primary" id="ed-new-add">Add project</button></div>' +
            '</div><p class="ed-block-hint">Staged into 📋 Changes. Then use ⚙ Edit to add its cover &amp; slideshow, and “+ New post” to write posts.</p></div></div>';
    }

    function draftsSection() {
        if (typeof listDrafts !== 'function') return '';
        var drafts = listDrafts();
        if (!drafts.length) return '<div class="ed-drafts"><h2>Local drafts</h2><p class="ed-empty">No local drafts.</p></div>';
        var rows = drafts.map(function (d) {
            return '<div class="ed-draft">' +
                '<span class="ed-draft__title">' + esc(d.title || d.slug) + '</span>' +
                '<span class="ed-post__date">' + esc(fmtDate(d.date)) + '</span>' +
                '<a class="btn btn-ghost btn-sm" href="edit.html?draft=' + encodeURIComponent(d.key) + '">Resume</a>' +
                '<button class="btn btn-ghost btn-sm" data-draft-del="' + esc(d.key) + '">Delete</button>' +
                '</div>';
        }).join('');
        return '<div class="ed-drafts"><h2>Local drafts</h2><p class="ed-block-hint">Auto-saved works-in-progress (before “Add to changes”). Separate from 📋 Changes.</p>' + rows + '</div>';
    }

    function renderSignedIn() {
        var projects = (data.projects || []).slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
        root.innerHTML = '<div class="ed-landing">' +
            '<div class="ed-toolbar-row"><h1>Content</h1>' +
            '<button class="btn btn-ghost" id="ed-new-toggle">➕ New project</button>' +
            '<a class="btn btn-ghost" href="manage.html">🎛 Manage projects</a></div>' +
            newProjectForm() +
            projects.map(projectBlock).join('') +
            draftsSection() +
            '</div>';

        var nt = document.getElementById('ed-new-toggle');
        if (nt) nt.addEventListener('click', function () { var f = document.getElementById('ed-new'); f.style.display = f.style.display === 'none' ? '' : 'none'; });
        var na = document.getElementById('ed-new-add');
        if (na) na.addEventListener('click', addNewProject);
        var nTitle = document.getElementById('ed-new-title');
        if (nTitle) nTitle.addEventListener('input', function () { var s = document.getElementById('ed-new-slug'); if (s && !s.dataset.touched) s.value = slugify(nTitle.value); });
        var nSlug = document.getElementById('ed-new-slug');
        if (nSlug) nSlug.addEventListener('input', function () { nSlug.dataset.touched = '1'; });
    }

    function addNewProject() {
        var title = (document.getElementById('ed-new-title').value || '').trim();
        var slug = slugify(document.getElementById('ed-new-slug').value || title);
        var coll = document.getElementById('ed-new-coll').value;
        if (!title || !slug) { toast('Give the project a title and slug.'); return; }
        if ((data.projects || []).some(function (p) { return p.slug === slug; })) { toast('Slug "' + slug + '" already exists.'); return; }
        data.projects.push({
            slug: slug, title: title, kicker: '', status: 'In Development', date: todayIso(),
            playLink: '', summary: '', tags: [], categories: [], collection: coll,
            order: {}, media: [], bullets: [], cover: '', background: '', posts: []
        });
        window.EditorQueue.stageProjects(data, 'New project: ' + title);
        toast('Added "' + title + '" to changes.');
        renderSignedIn();
    }

    function deletePost(projectSlug, postSlug) {
        var p = (data.projects || []).find(function (x) { return x.slug === projectSlug; });
        if (!p) return;
        var entry = (p.posts || []).find(function (x) { return x.slug === postSlug; });
        var title = entry ? entry.title : postSlug;
        if (!confirm('Delete post "' + title + '"?\n\nStaged into 📋 Changes; it is removed from the live site when you commit. This cannot be undone after committing.')) return;
        p.posts = (p.posts || []).filter(function (x) { return x.slug !== postSlug; });
        window.EditorQueue.stageProjects(data, 'Remove post entry: ' + title);
        window.EditorQueue.stageDelete('content/posts/' + projectSlug + '/' + postSlug + '.json', 'Delete post: ' + title);
        toast('Deleted "' + title + '" — commit from 📋 Changes.');
        renderSignedIn();
    }

    function render() {
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            window.EditorQueue.loadProjects().then(function (d) { data = d; renderSignedIn(); }).catch(function (err) {
                root.innerHTML = '<div class="ed-landing"></div>';
                window.renderDataError(root.firstElementChild, err);
            });
        } else {
            renderSignedOut();
        }
    }

    function init() {
        root = document.getElementById('ed-root');
        document.addEventListener('auth:ready', render);
        document.addEventListener('auth:changed', render);
        document.addEventListener('queue:committed', render);
        root.addEventListener('click', function (e) {
            var del = e.target.closest('[data-draft-del]');
            if (del && typeof deleteDraft === 'function') { deleteDraft(del.dataset.draftDel); render(); return; }
            var dp = e.target.closest('[data-del-post]');
            if (dp) { var parts = dp.dataset.delPost.split('::'); deletePost(parts[0], parts[1]); return; }
        });
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
