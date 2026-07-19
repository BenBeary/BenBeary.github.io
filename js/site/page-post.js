/* page-post.js, renders a single post. ?slug=<project>&post=<post>. Header
   (back-to-hub link, title, date) then the post body via the shared renderBlocks.
   The showcase's "back" points at its project hub. */

(function () {
    'use strict';

    var root;

    function fmtDate(iso) {
        var d = new Date(iso + 'T00:00:00');
        return isNaN(d) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function init() {
        root = document.getElementById('post');
        var u = new URLSearchParams(location.search);
        var slug = u.get('slug') || '';
        var postSlug = u.get('post') || '';

        Promise.all([window.getProject(slug), window.getPost(slug, postSlug)])
            .then(function (res) {
                var project = res[0];
                var post = res[1];
                if (!post) { window.renderDataError(root, new Error('Post not found')); return; }

                document.title = post.title + ' | Ben Beary';
                root.innerHTML = '';

                var header = document.createElement('header');
                header.className = 'post-header';

                var back = document.createElement('a');
                back.className = 'post-back';
                back.href = 'project.html?slug=' + encodeURIComponent(slug);
                back.textContent = '← ' + (project ? project.title : 'Back to project');
                header.appendChild(back);

                var h1 = document.createElement('h1');
                h1.className = 'post-title';
                h1.textContent = post.title;
                header.appendChild(h1);

                var meta = document.createElement('div');
                meta.className = 'post-meta';
                meta.textContent = fmtDate(post.date);
                header.appendChild(meta);

                root.appendChild(header);

                var body = document.createElement('article');
                body.className = 'post-body';
                window.renderBlocks(post.blocks, body);
                root.appendChild(body);
            })
            .catch(function (err) { window.renderDataError(root, err); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
