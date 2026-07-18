/* page-home.js — the home page.

   Two sections, deliberately different in shape (no repeated sliders):
     1. Featured — ONE horizontal scroll-snap shelf of poster cards (cover art
        with the title/kicker/status laid over it, like the original site's
        big blurred project art) for projects with an `order.home`.
     2. Collections — large banner tiles, one per collection: a blurred
        background pulled from the collection's newest project, a fanned deck of
        its project thumbnails, the label, and a count. Links into the filtered
        catalogue (projects.html?collection=<slug>).

   Hidden projects are excluded everywhere. The intro and about teaser are
   static in home.html. */

(function () {
    'use strict';

    var featuredEl, collectionsEl;

    function visible(p) { return !p.hidden; }
    function newestFirst(a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }

    // ---- Featured: poster card (art with the text laid over it) -------------
    function posterCard(p) {
        var a = document.createElement('a');
        a.className = 'card poster-card';
        a.href = 'project.html?slug=' + encodeURIComponent(p.slug);

        var img = document.createElement('img');
        img.className = 'poster-card__img';
        window.setImg(img, p.cover, 'md');
        img.alt = p.title;
        a.appendChild(img);

        var ov = document.createElement('div');
        ov.className = 'poster-card__overlay';
        if (p.kicker) {
            var k = document.createElement('div');
            k.className = 'poster-card__kicker';
            k.textContent = p.kicker;
            ov.appendChild(k);
        }
        var t = document.createElement('div');
        t.className = 'poster-card__title';
        t.textContent = p.title;
        ov.appendChild(t);
        a.appendChild(ov);

        if (p.status) {
            var s = document.createElement('span');
            s.className = 'poster-card__status';
            s.textContent = p.status;
            a.appendChild(s);
        }
        return a;
    }

    function renderFeatured(projects) {
        var featured = projects.filter(function (p) { return p.order && p.order.home != null; })
            .sort(function (a, b) { return a.order.home - b.order.home || newestFirst(a, b); });
        if (!featured.length) { featuredEl.closest('.home-featured').style.display = 'none'; return; }

        var track = document.createElement('div');
        track.className = 'shelf__track';
        featured.forEach(function (p) { track.appendChild(posterCard(p)); });

        featuredEl.innerHTML = '';
        featuredEl.appendChild(track);

        var prev = document.getElementById('feat-prev');
        var next = document.getElementById('feat-next');
        function step(dir) {
            var first = track.querySelector('.poster-card');
            var w = first ? (first.getBoundingClientRect().width + 20) : 380;
            track.scrollBy({ left: dir * w, behavior: 'smooth' });
        }
        prev.addEventListener('click', function () { step(-1); });
        next.addEventListener('click', function () { step(1); });
        function syncNav() {
            var over = track.scrollWidth > track.clientWidth + 4;
            prev.style.visibility = next.style.visibility = over ? '' : 'hidden';
        }
        window.addEventListener('resize', syncNav);
        requestAnimationFrame(syncNav);
    }

    // ---- Collections: big blurred banner tiles ------------------------------
    function collectionTile(col, inCol) {
        var lead = inCol[0];
        var a = document.createElement('a');
        a.className = 'collection-tile';
        a.href = 'projects.html?collection=' + encodeURIComponent(col.slug);

        // Blurred backdrop from the newest project's background art.
        var bg = document.createElement('img');
        bg.className = 'collection-tile__bg';
        window.setImg(bg, lead.background || lead.cover, 'md');
        bg.alt = '';
        a.appendChild(bg);

        var shade = document.createElement('div');
        shade.className = 'collection-tile__shade';
        a.appendChild(shade);

        // Fanned deck of up to three covers.
        var deck = document.createElement('div');
        deck.className = 'collection-tile__deck';
        inCol.slice(0, 3).forEach(function (p) {
            var d = document.createElement('img');
            d.className = 'collection-tile__thumb';
            window.setImg(d, p.cover, 'thumb');
            d.alt = '';
            deck.appendChild(d);
        });
        a.appendChild(deck);

        var body = document.createElement('div');
        body.className = 'collection-tile__body';
        body.innerHTML =
            '<span class="collection-tile__count">' + inCol.length + ' Project' + (inCol.length === 1 ? '' : 's') + '</span>' +
            '<h3 class="collection-tile__title"></h3>' +
            '<span class="collection-tile__cta">View collection →</span>';
        body.querySelector('.collection-tile__title').textContent = col.label;
        a.appendChild(body);
        return a;
    }

    function renderCollections(data, projects) {
        var grid = document.createElement('div');
        grid.className = 'collection-grid';
        var any = false;
        (data.collections || []).forEach(function (col) {
            var inCol = projects.filter(function (p) { return p.collection === col.slug; }).sort(newestFirst);
            if (!inCol.length) return;
            any = true;
            grid.appendChild(collectionTile(col, inCol));
        });
        collectionsEl.innerHTML = '';
        if (!any) { collectionsEl.closest('.home-collections').style.display = 'none'; return; }
        collectionsEl.appendChild(grid);
    }

    function render(data) {
        var projects = (data.projects || []).filter(visible);
        renderFeatured(projects);
        renderCollections(data, projects);
    }

    function init() {
        featuredEl = document.getElementById('home-featured');
        collectionsEl = document.getElementById('home-collections');
        window.getProjects().then(render).catch(function (err) { window.renderDataError(featuredEl, err); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
