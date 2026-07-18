/* page-project.js — a project hub. ?slug=<project>. Renders a hero (kicker,
   title, date, tags, play link, summary over the blurred background) and the
   post list: the showcase pinned on top, then blog posts newest-first, 5 shown
   with a "Load more". Each post links to post.html?slug=<project>&post=<post>. */

(function () {
    'use strict';

    var BLOG_PAGE = 5;
    var hub, project, shownBlogs = BLOG_PAGE;

    function fmtDate(iso) {
        var d = new Date(iso + 'T00:00:00');
        if (isNaN(d)) return iso;
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function postCard(post) {
        var a = document.createElement('a');
        a.className = 'card post-card';
        a.href = 'post.html?slug=' + encodeURIComponent(project.slug) + '&post=' + encodeURIComponent(post.slug);

        if (post.cover) {
            var img = document.createElement('img');
            img.className = 'card__media';
            window.setImg(img, post.cover, 'thumb');
            img.alt = post.title;
            a.appendChild(img);
        }
        var body = document.createElement('div');
        body.className = 'card__body';
        if (post.type === 'showcase') {
            var badge = document.createElement('span');
            badge.className = 'post-card__badge';
            badge.textContent = '★ Showcase';
            body.appendChild(badge);
        }
        var t = document.createElement('div'); t.className = 'card__title'; t.textContent = post.title; body.appendChild(t);
        var meta = document.createElement('div'); meta.className = 'post-card__date'; meta.textContent = fmtDate(post.date); body.appendChild(meta);
        if (post.excerpt) { var ex = document.createElement('div'); ex.className = 'card__text'; ex.textContent = post.excerpt; body.appendChild(ex); }
        a.appendChild(body);
        return a;
    }

    function render() {
        hub.innerHTML = '';
        document.title = project.title + ' — Ben Beary';

        // Hero
        var hero = document.createElement('section');
        hero.className = 'hub-hero';
        var bg = document.createElement('img');
        bg.className = 'hub-hero__bg';
        window.setImg(bg, project.background || project.cover, 'md');
        bg.alt = '';
        hero.appendChild(bg);

        var overlay = document.createElement('div');
        overlay.className = 'hub-hero__inner';
        var html = '';
        if (project.kicker) html += '<div class="hub-hero__kicker">' + escAttr(project.kicker) + '</div>';
        html += '<h1 class="hub-hero__title">' + escAttr(project.title) + '</h1>';
        html += '<div class="hub-hero__date">' + escAttr(fmtDate(project.date)) + '</div>';
        overlay.innerHTML = html;

        if (project.tags && project.tags.length) {
            var tl = document.createElement('div');
            tl.className = 'chip-list hub-hero__tags';
            project.tags.forEach(function (tag) {
                var c = document.createElement('span'); c.className = 'chip chip-accent'; c.textContent = tag; tl.appendChild(c);
            });
            overlay.appendChild(tl);
        }
        if (project.playLink) {
            var play = document.createElement('a');
            play.className = 'btn btn-primary hub-hero__play';
            play.href = project.playLink;
            play.target = '_blank';
            play.rel = 'noopener';
            play.textContent = '▶ Play the Game';
            overlay.appendChild(play);
        }
        hero.appendChild(overlay);
        hub.appendChild(hero);

        // Summary
        if (project.summary) {
            var sum = document.createElement('p');
            sum.className = 'hub-summary';
            sum.textContent = project.summary;
            hub.appendChild(sum);
        }

        // Posts
        var posts = (project.posts || []).slice();
        var showcase = posts.filter(function (p) { return p.type === 'showcase'; });
        var blogs = posts.filter(function (p) { return p.type !== 'showcase'; })
            .sort(function (a, b) { return b.date.localeCompare(a.date); });

        var section = document.createElement('section');
        section.className = 'hub-posts';
        var h = document.createElement('h2'); h.className = 'section-title hub-posts__title'; h.textContent = 'Posts'; section.appendChild(h);

        var list = document.createElement('div');
        list.className = 'post-list';
        showcase.forEach(function (p) { list.appendChild(postCard(p)); });
        blogs.slice(0, shownBlogs).forEach(function (p) { list.appendChild(postCard(p)); });
        section.appendChild(list);

        if (blogs.length > shownBlogs) {
            var more = document.createElement('button');
            more.className = 'btn btn-ghost load-more';
            more.type = 'button';
            more.textContent = 'Load more posts';
            more.addEventListener('click', function () { shownBlogs += BLOG_PAGE; render(); });
            section.appendChild(more);
        }
        if (!blogs.length) {
            var note = document.createElement('p');
            note.className = 'loading-note';
            note.textContent = 'More devlog posts coming soon.';
            section.appendChild(note);
        }
        hub.appendChild(section);
    }

    function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function init() {
        hub = document.getElementById('hub');
        var slug = new URLSearchParams(location.search).get('slug') || '';
        window.getProject(slug).then(function (p) {
            if (!p) { hub.innerHTML = '<div class="data-error"><h2>Project not found</h2><p><a href="projects.html">Back to all projects</a></p></div>'; return; }
            project = p;
            render();
        }).catch(function (err) { window.renderDataError(hub, err); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
