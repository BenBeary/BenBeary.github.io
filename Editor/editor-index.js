/* editor-index.js — the editor landing page. Renders a sign-in prompt when
   signed out, and a project/post/draft picker when signed in. Re-renders on
   'auth:ready' / 'auth:changed'. Links into edit.html (M5b) and manage.html (M5d).
   Content comes from ../content/projects.json via ../js/site/data.js. */

(function () {
    'use strict';

    var root;

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function fmtDate(iso) { var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? (iso || '') : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }

    function renderSignedOut() {
        root.innerHTML =
            '<div class="ed-landing"><div class="ed-signin-prompt">' +
            '<h1>Portfolio Editor</h1>' +
            '<p>Sign in with your GitHub token to create, edit, and publish posts.</p>' +
            '<button class="btn btn-primary" id="ed-signin-btn">🔑 Sign in</button>' +
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
            '</li>';
    }

    function projectBlock(p) {
        var posts = (p.posts || []).slice().sort(function (a, b) {
            if (a.type === 'showcase') return -1;
            if (b.type === 'showcase') return 1;
            return b.date.localeCompare(a.date);
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
            '</div>' +
            '</div>' +
            '<ul class="ed-posts">' + posts.map(function (post) { return postRow(p.slug, post); }).join('') + '</ul>' +
            '</div>';
    }

    function draftsSection() {
        if (typeof listDrafts !== 'function') return '';   // drafts.js arrives in M5c
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
        return '<div class="ed-drafts"><h2>Local drafts</h2>' + rows + '</div>';
    }

    function renderSignedIn(data) {
        var html = '<div class="ed-landing">' +
            '<div class="ed-toolbar"><h1>Content</h1>' +
            '<a class="btn btn-ghost" href="manage.html">🎛 Manage projects &amp; roles</a></div>' +
            (data.projects || []).map(projectBlock).join('') +
            draftsSection() +
            '</div>';
        root.innerHTML = html;
    }

    function render() {
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            window.getProjects().then(renderSignedIn).catch(function (err) {
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
        // Draft delete (delegated; root element persists across re-renders).
        root.addEventListener('click', function (e) {
            var del = e.target.closest('[data-draft-del]');
            if (del && typeof deleteDraft === 'function') { deleteDraft(del.dataset.draftDel); render(); }
        });
        render();   // paint immediately (auth:ready re-renders after token warm-up)
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
