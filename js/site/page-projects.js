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

    function projectCard(p) {
        var a = document.createElement('a');
        a.className = 'card project-card';
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

        if (p.tags && p.tags.length) {
            var tl = document.createElement('div');
            tl.className = 'chip-list';
            p.tags.slice(0, 4).forEach(function (tag) {
                var c = document.createElement('span');
                c.className = 'chip chip-accent';
                c.textContent = tag;
                tl.appendChild(c);
            });
            body.appendChild(tl);
        }
        a.appendChild(body);
        return a;
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
        list.forEach(function (p) { gridEl.appendChild(projectCard(p)); });
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
