/* data.js — content loader with a module-level Promise cache and a visible error
   state. All content reads on the site go through here. Reads body[data-root]
   ('' at site root, '../' under Editor/) so the same code works in the editor.

   Globals: getProjects, getProject, getPost, getRole, renderDataError.
   getPost cache-busts with ?v=<contentVersion> (from projects.json) so a freshly
   published post isn't served stale by the GitHub Pages CDN. */

(function () {
    'use strict';

    var ROOT = (document.body && document.body.dataset.root) || '';
    var cache = {};   // path -> Promise<json>

    function fetchJson(path) {
        if (cache[path]) return cache[path];
        cache[path] = fetch(ROOT + path).then(function (r) {
            if (!r.ok) throw new Error('Failed to load ' + path + ' (' + r.status + ')');
            return r.json();
        }).catch(function (err) {
            delete cache[path];   // don't cache failures — allow a retry
            throw err;
        });
        return cache[path];
    }

    window.getProjects = function () { return fetchJson('content/projects.json'); };

    window.getProject = function (slug) {
        return window.getProjects().then(function (d) {
            return (d.projects || []).find(function (p) { return p.slug === slug; }) || null;
        });
    };

    window.getPost = function (projectSlug, postSlug) {
        return window.getProjects().then(function (d) {
            var v = d.contentVersion || 0;
            return fetchJson('content/posts/' + projectSlug + '/' + postSlug + '.json?v=' + v);
        });
    };

    window.getRole = function (slug) { return fetchJson('content/roles/' + slug + '.json'); };

    // Render a friendly error into a container (used by page scripts' catch blocks).
    window.renderDataError = function (container, err) {
        if (!container) return;
        var onFile = location.protocol === 'file:';
        container.innerHTML =
            '<div class="data-error">' +
            '<h2>Couldn\'t load this page\'s content</h2>' +
            '<p>' + String(err && err.message ? err.message : err).replace(/[<&]/g, '') + '</p>' +
            (onFile ? '<p>You opened this file directly. Run a local server (fetch is blocked on file://).</p>' : '') +
            '</div>';
    };
})();
