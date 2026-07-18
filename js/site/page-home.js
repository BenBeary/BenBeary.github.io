/* page-home.js — the home page. Renders Steam-style horizontal shelves from
   content/projects.json: a "Featured" shelf (projects with order.home, lowest
   first) followed by one shelf per collection (newest-first). Hidden projects are
   excluded everywhere. Each card links to its project hub. Shelves scroll-snap
   horizontally; the ❮ ❯ buttons are a progressive enhancement over native scroll
   / swipe. The intro and about teaser are static in home.html. */

(function () {
    'use strict';

    var shelvesEl;

    function visible(p) { return !p.hidden; }

    function card(p) {
        var a = document.createElement('a');
        a.className = 'card shelf-card';
        a.href = 'project.html?slug=' + encodeURIComponent(p.slug);

        var img = document.createElement('img');
        img.className = 'card__media';
        window.setImg(img, p.cover, 'thumb');
        img.alt = p.title;
        a.appendChild(img);

        var body = document.createElement('div');
        body.className = 'card__body';
        if (p.kicker) {
            var k = document.createElement('div');
            k.className = 'project-card__kicker';
            k.textContent = p.kicker;
            body.appendChild(k);
        }
        var t = document.createElement('div');
        t.className = 'card__title';
        t.textContent = p.title;
        body.appendChild(t);
        if (p.status) {
            var s = document.createElement('span');
            s.className = 'shelf-card__status';
            s.textContent = p.status;
            body.appendChild(s);
        }
        a.appendChild(body);
        return a;
    }

    function shelf(title, projects, href) {
        if (!projects.length) return null;
        var sec = document.createElement('section');
        sec.className = 'shelf';

        var head = document.createElement('div');
        head.className = 'shelf__head';
        var h = document.createElement('h2');
        h.className = 'shelf__title';
        if (href) {
            var link = document.createElement('a');
            link.href = href; link.textContent = title; link.className = 'shelf__title-link';
            h.appendChild(link);
        } else {
            h.textContent = title;
        }
        head.appendChild(h);

        var nav = document.createElement('div');
        nav.className = 'shelf__nav';
        var prev = document.createElement('button');
        prev.type = 'button'; prev.className = 'shelf__arrow'; prev.setAttribute('aria-label', 'Scroll ' + title + ' left'); prev.textContent = '❮';
        var next = document.createElement('button');
        next.type = 'button'; next.className = 'shelf__arrow'; next.setAttribute('aria-label', 'Scroll ' + title + ' right'); next.textContent = '❯';
        nav.appendChild(prev); nav.appendChild(next);
        head.appendChild(nav);
        sec.appendChild(head);

        var track = document.createElement('div');
        track.className = 'shelf__track';
        projects.forEach(function (p) { track.appendChild(card(p)); });
        sec.appendChild(track);

        function scrollByCards(dir) {
            var first = track.querySelector('.shelf-card');
            var step = first ? (first.getBoundingClientRect().width + 20) : 320;
            track.scrollBy({ left: dir * step * 1.5, behavior: 'smooth' });
        }
        prev.addEventListener('click', function () { scrollByCards(-1); });
        next.addEventListener('click', function () { scrollByCards(1); });

        // Hide the arrows when everything already fits (no horizontal overflow).
        function syncNav() { nav.style.visibility = track.scrollWidth > track.clientWidth + 4 ? '' : 'hidden'; }
        window.addEventListener('resize', syncNav);
        requestAnimationFrame(syncNav);

        return sec;
    }

    function render(data) {
        shelvesEl.innerHTML = '';
        var projects = (data.projects || []).filter(visible);

        // Featured — projects with an order.home, lowest first (then newest).
        var featured = projects.filter(function (p) { return p.order && p.order.home != null; })
            .sort(function (a, b) { return a.order.home - b.order.home || String(b.date).localeCompare(String(a.date)); });
        var fShelf = shelf('Featured', featured, 'projects.html');
        if (fShelf) shelvesEl.appendChild(fShelf);

        // One shelf per collection (in the collections[] order), newest-first.
        (data.collections || []).forEach(function (col) {
            var inCol = projects.filter(function (p) { return p.collection === col.slug; })
                .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
            var s = shelf(col.label, inCol, 'projects.html?collection=' + encodeURIComponent(col.slug));
            if (s) shelvesEl.appendChild(s);
        });

        if (!shelvesEl.children.length) {
            shelvesEl.innerHTML = '<p class="loading-note">No projects to show yet.</p>';
        }
    }

    function init() {
        shelvesEl = document.getElementById('home-shelves');
        window.getProjects().then(render).catch(function (err) { window.renderDataError(shelvesEl, err); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
