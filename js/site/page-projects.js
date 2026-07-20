/* page-projects.js, the catalogue. Renders a filter bar (collection tabs +
   skill-category chips) and a grid of project cards. Reads ?cat= and ?collection=
   from the URL; chips update the URL (pushState) and re-render in place so views
   are shareable and the back button works. */

(function () {
    'use strict';

    var data = null;
    var gridEl, barEl;

    function readState() {
        var u = new URLSearchParams(location.search);
        return { cat: u.get('cat') || '', collection: u.get('collection') || '' };
    }

    function go(next) {
        var u = new URLSearchParams();
        if (next.collection) u.set('collection', next.collection);
        if (next.cat) u.set('cat', next.cat);
        var qs = u.toString();
        history.pushState(null, '', 'projects.html' + (qs ? '?' + qs : ''));
        render();
    }

    function filtered(st) {
        var list = (data.projects || []).filter(function (p) {
            return !p.hidden &&
                   (!st.collection || p.collection === st.collection) &&
                   (!st.cat || (p.categories || []).indexOf(st.cat) !== -1);
        });
        var rank = function (p) { return p.order && p.order[st.cat] != null ? p.order[st.cat] : 9999; };
        if (st.cat) list.sort(function (a, b) { return rank(a) - rank(b) || b.date.localeCompare(a.date); });
        else list.sort(function (a, b) { return b.date.localeCompare(a.date); });
        return list;
    }

    // A compact version of the home page's featured showcase row: same blurred
    // artwork, scrim and left/right alternation, but about a quarter of the
    // screen tall and showing the cover instead of a slideshow. The whole row is
    // the link, so it carries no buttons of its own.
    function projectCard(p, index) {
        var a = document.createElement('a');
        a.className = 'featured-row featured-row--compact' + (index % 2 ? ' is-flipped' : '');
        a.href = 'project.html?slug=' + encodeURIComponent(p.slug);

        var bg = document.createElement('img');
        bg.className = 'featured-row__bg';
        window.setImg(bg, p.background || p.cover, 'md');
        bg.alt = '';
        a.appendChild(bg);

        var shade = document.createElement('div');
        shade.className = 'featured-row__shade';
        a.appendChild(shade);

        if (p.status) {
            var st = document.createElement('span');
            st.className = 'featured-row__status';
            st.textContent = p.status;
            a.appendChild(st);
        }

        var grid = document.createElement('div');
        grid.className = 'featured-row__grid';

        var art = document.createElement('div');
        art.className = 'featured-row__art';
        var cover = document.createElement('img');
        cover.className = 'featured-row__cover';
        window.setImg(cover, p.cover, 'md');
        cover.alt = p.title;
        art.appendChild(cover);
        grid.appendChild(art);

        var info = document.createElement('div');
        info.className = 'featured-row__info';
        // Kicker and date share one line above the title.
        var head = '';
        if (p.kicker || p.date) {
            head += '<div class="featured-row__meta">';
            if (p.kicker) head += '<span class="featured-row__kicker">' + esc(p.kicker) + '</span>';
            if (p.date) head += '<span class="featured-row__date">' + esc(fmtDate(p.date)) + '</span>';
            head += '</div>';
        }
        head += '<h2 class="featured-row__title">' + esc(p.title) + '</h2>';
        info.innerHTML = head;

        if (p.summary) {
            var s = document.createElement('p');
            s.className = 'featured-row__summary';
            s.textContent = p.summary;
            info.appendChild(s);
        }
        if (p.tags && p.tags.length) {
            var tl = document.createElement('div');
            tl.className = 'chip-list featured-row__tags';
            p.tags.slice(0, 4).forEach(function (tag) {
                var c = document.createElement('span');
                c.className = 'chip chip-accent';
                c.textContent = tag;
                tl.appendChild(c);
            });
            info.appendChild(tl);
        }
        grid.appendChild(info);
        a.appendChild(grid);
        return a;
    }

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // Short form, since it sits inline next to the kicker on a compact card.
    function fmtDate(iso) {
        var d = new Date(iso + 'T00:00:00');
        return isNaN(d) ? (iso || '') : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function chip(label, active, onClick) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'filter-chip' + (active ? ' is-active' : '');
        b.textContent = label;
        b.addEventListener('click', onClick);
        return b;
    }

    function renderBar(st) {
        barEl.innerHTML = '';

        // Collection row
        var colRow = document.createElement('div');
        colRow.className = 'filter-row';
        colRow.appendChild(chip('All Projects', !st.collection, function () { go({ cat: st.cat, collection: '' }); }));
        (data.collections || []).forEach(function (c) {
            colRow.appendChild(chip(c.label, st.collection === c.slug, function () { go({ cat: st.cat, collection: c.slug }); }));
        });
        barEl.appendChild(colRow);

        // Skill category row
        var catRow = document.createElement('div');
        catRow.className = 'filter-row';
        catRow.appendChild(chip('Most Recent', !st.cat, function () { go({ cat: '', collection: st.collection }); }));
        (data.categories || []).forEach(function (c) {
            catRow.appendChild(chip(c.label, st.cat === c.slug, function () { go({ cat: c.slug, collection: st.collection }); }));
        });
        barEl.appendChild(catRow);
    }

    function render() {
        var st = readState();
        renderBar(st);
        var list = filtered(st);
        gridEl.innerHTML = '';
        if (!list.length) {
            gridEl.innerHTML = '<p class="loading-note">No projects match this filter yet.</p>';
            return;
        }
        list.forEach(function (p, i) { gridEl.appendChild(projectCard(p, i)); });
    }

    function init() {
        gridEl = document.getElementById('project-grid');
        barEl = document.getElementById('filter-bar');
        window.getProjects().then(function (d) {
            data = d;
            render();
            window.addEventListener('popstate', render);
        }).catch(function (err) { window.renderDataError(gridEl, err); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
