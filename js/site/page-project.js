/* page-project.js — a project hub. ?slug=<project>. The hero is a two-column
   card over the blurred background (original-site style): left = kicker, title,
   date, tags, play link, contribution bullets; right = the media slideshow with
   the summary under it. Status tag pins top-right. Below: the post list — the
   showcase pinned on top, then blog posts newest-first, 5 shown with a "Load
   more". Each post links to post.html?slug=<project>&post=<post>. */

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

        // Hero: blurred-bg card holding everything. Left column (~1/3): kicker,
        // title, date, tags, play, bullets. Right (~2/3): slideshow + summary.
        var hasMedia = !!(project.media && project.media.length);
        var hero = document.createElement('section');
        hero.className = 'hub-hero' + (hasMedia ? '' : ' hub-hero--nomedia') + (project.status ? ' hub-hero--status' : '');
        var bg = document.createElement('img');
        bg.className = 'hub-hero__bg';
        window.setImg(bg, project.background || project.cover, 'md');
        bg.alt = '';
        hero.appendChild(bg);

        // Status tag stays pinned top-right of the hero card.
        if (project.status) {
            var status = document.createElement('div');
            status.className = 'hub-status';
            status.textContent = project.status;
            hero.appendChild(status);
        }

        var grid = document.createElement('div');
        grid.className = 'hub-hero__grid';

        var info = document.createElement('div');
        info.className = 'hub-hero__info';
        var html = '';
        if (project.kicker) html += '<div class="hub-hero__kicker">' + escAttr(project.kicker) + '</div>';
        html += '<h1 class="hub-hero__title">' + escAttr(project.title) + '</h1>';
        html += '<div class="hub-hero__date">' + escAttr(fmtDate(project.date)) + '</div>';
        info.innerHTML = html;

        if (project.tags && project.tags.length) {
            var tl = document.createElement('div');
            tl.className = 'chip-list hub-hero__tags';
            project.tags.forEach(function (tag) {
                var c = document.createElement('span'); c.className = 'chip chip-accent'; c.textContent = tag; tl.appendChild(c);
            });
            info.appendChild(tl);
        }
        if (project.playLink) {
            var play = document.createElement('a');
            play.className = 'btn btn-primary hub-hero__play';
            play.href = project.playLink;
            play.target = '_blank';
            play.rel = 'noopener';
            play.textContent = '▶ Play the Game';
            info.appendChild(play);
        }
        if (project.bullets && project.bullets.length) {
            var ul = document.createElement('ul');
            ul.className = 'hub-bullets';
            project.bullets.forEach(function (item) {
                var li = document.createElement('li'); li.textContent = item; ul.appendChild(li);
            });
            info.appendChild(ul);
        }
        grid.appendChild(info);

        if (hasMedia || project.summary) {
            var mediaCol = document.createElement('div');
            mediaCol.className = 'hub-hero__media';
            if (hasMedia) window.makeSlideshow(mediaCol, project.media);
            if (project.summary) {
                var sum = document.createElement('p');
                sum.className = 'hub-hero__summary';
                sum.textContent = project.summary;
                mediaCol.appendChild(sum);
            }
            grid.appendChild(mediaCol);
        }
        hero.appendChild(grid);
        hub.appendChild(hero);

        // Posts
        var posts = (project.posts || []).slice().filter(function (p) { return !p.hidden; });
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
