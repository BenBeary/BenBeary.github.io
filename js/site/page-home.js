/* page-home.js, the home page.

   Two sections, deliberately different in shape:

   1. FEATURED - a vertical stack of big showcase rows, one per project, that
      alternate sides (art left / info right, then flipped). Each row is about a
      third of the viewport tall, sits on the project's own blurred artwork, and
      carries the same information as the project hub: kicker, title, date,
      status, tags, summary, highlight bullets, and a play link. The art side is
      the project's media slideshow (original-site style) when it has media,
      otherwise its cover.

      Which projects appear is driven by the URL:
         home.html                      -> ranked by order.home  ("Featured")
         home.html?featured=programming -> ranked by order.programming
      Any skill category in projects.json works. Chips above the list switch
      between them (pushState, so back/forward and sharing work).

   2. COLLECTIONS - large blurred banner tiles, one per collection, with a fanned
      deck of covers; links into the filtered catalogue.

   Hidden projects are excluded everywhere. */

(function () {
    'use strict';

    var data = null;
    var featWrap, featChips, featList, collectionsEl;

    function visible(p) { return !p.hidden; }
    function newestFirst(a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }
    function fmtDate(iso) {
        var d = new Date(iso + 'T00:00:00');
        return isNaN(d) ? (iso || '') : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // ---- which ranking is showing -------------------------------------------
    function currentKey() { return new URLSearchParams(location.search).get('featured') || 'home'; }
    function keyLabel(key) {
        if (key === 'home') return 'Featured';
        var c = (data.categories || []).find(function (x) { return x.slug === key; });
        return c ? c.label : key;
    }
    function rankedFor(key) {
        return (data.projects || []).filter(visible)
            .filter(function (p) { return p.order && p.order[key] != null; })
            .sort(function (a, b) { return a.order[key] - b.order[key] || newestFirst(a, b); });
    }

    function go(key) {
        var url = 'home.html' + (key === 'home' ? '' : '?featured=' + encodeURIComponent(key));
        history.pushState(null, '', url);
        renderFeatured();
    }

    // ---- one showcase row ----------------------------------------------------
    function featuredRow(p, index) {
        var row = document.createElement('article');
        row.className = 'featured-row' + (index % 2 ? ' is-flipped' : '');

        var bg = document.createElement('img');
        bg.className = 'featured-row__bg';
        window.setImg(bg, p.background || p.cover, 'md');
        bg.alt = '';
        row.appendChild(bg);

        var shade = document.createElement('div');
        shade.className = 'featured-row__shade';
        row.appendChild(shade);

        var grid = document.createElement('div');
        grid.className = 'featured-row__grid';

        // --- art side: the project's slideshow, else its cover ---
        var art = document.createElement('div');
        art.className = 'featured-row__art';
        if (p.media && p.media.length) {
            window.makeSlideshow(art, p.media);
        } else {
            var img = document.createElement('img');
            img.className = 'featured-row__cover';
            window.setImg(img, p.cover, 'md');
            img.alt = p.title;
            art.appendChild(img);
        }
        grid.appendChild(art);

        // --- info side: the same details as the project hub ---
        var info = document.createElement('div');
        info.className = 'featured-row__info';

        var head = '';
        if (p.kicker) head += '<div class="featured-row__kicker">' + esc(p.kicker) + '</div>';
        head += '<h3 class="featured-row__title">' + esc(p.title) + '</h3>';
        head += '<div class="featured-row__date">' + esc(fmtDate(p.date)) + '</div>';
        info.innerHTML = head;

        if (p.status) {
            var st = document.createElement('span');
            st.className = 'featured-row__status';
            st.textContent = p.status;
            row.appendChild(st);
        }

        if (p.tags && p.tags.length) {
            var tl = document.createElement('div');
            tl.className = 'chip-list featured-row__tags';
            p.tags.forEach(function (tag) {
                var c = document.createElement('span'); c.className = 'chip chip-accent'; c.textContent = tag; tl.appendChild(c);
            });
            info.appendChild(tl);
        }
        if (p.summary) {
            var sum = document.createElement('p');
            sum.className = 'featured-row__summary';
            sum.textContent = p.summary;
            info.appendChild(sum);
        }
        if (p.bullets && p.bullets.length) {
            var ul = document.createElement('ul');
            ul.className = 'featured-row__bullets';
            p.bullets.slice(0, 4).forEach(function (b) {
                var li = document.createElement('li'); li.textContent = b; ul.appendChild(li);
            });
            info.appendChild(ul);
        }

        var actions = document.createElement('div');
        actions.className = 'featured-row__actions';
        var view = document.createElement('a');
        view.className = 'btn btn-primary';
        view.href = 'project.html?slug=' + encodeURIComponent(p.slug);
        view.textContent = 'View Project →';
        actions.appendChild(view);
        if (p.playLink) {
            var play = document.createElement('a');
            play.className = 'btn btn-secondary';
            play.href = p.playLink; play.target = '_blank'; play.rel = 'noopener';
            play.textContent = '▶ Play the Game';
            actions.appendChild(play);
        }
        info.appendChild(actions);

        grid.appendChild(info);
        row.appendChild(grid);
        return row;
    }

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // ---- featured section ----------------------------------------------------
    function renderChips() {
        var key = currentKey();
        var keys = ['home'].concat((data.categories || []).map(function (c) { return c.slug; }));
        featChips.innerHTML = '';
        keys.forEach(function (k) {
            // Only offer a ranking that actually has projects in it.
            if (!rankedFor(k).length) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'filter-chip' + (k === key ? ' is-active' : '');
            b.textContent = keyLabel(k);
            b.addEventListener('click', function () { go(k); });
            featChips.appendChild(b);
        });
    }

    function renderFeatured() {
        var key = currentKey();
        renderChips();
        var list = rankedFor(key);
        featList.innerHTML = '';
        var title = document.getElementById('featured-heading');
        if (title) title.textContent = key === 'home' ? 'Featured Projects' : 'Top ' + keyLabel(key) + ' Work';

        if (!list.length) {
            featList.innerHTML = '<p class="loading-note">Nothing ranked for this skill yet. Set an Order value for it in the editor.</p>';
            return;
        }
        list.forEach(function (p, i) { featList.appendChild(featuredRow(p, i)); });
    }

    // ---- collections ---------------------------------------------------------
    function collectionTile(col, inCol) {
        var lead = inCol[0];
        var a = document.createElement('a');
        a.className = 'collection-tile';
        a.href = 'projects.html?collection=' + encodeURIComponent(col.slug);

        var bg = document.createElement('img');
        bg.className = 'collection-tile__bg';
        window.setImg(bg, lead.background || lead.cover, 'md');
        bg.alt = '';
        a.appendChild(bg);

        var shade = document.createElement('div');
        shade.className = 'collection-tile__shade';
        a.appendChild(shade);

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

    function renderCollections() {
        var projects = (data.projects || []).filter(visible);
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

    function init() {
        featWrap = document.querySelector('.home-featured');
        featChips = document.getElementById('featured-chips');
        featList = document.getElementById('featured-list');
        collectionsEl = document.getElementById('home-collections');

        window.getProjects().then(function (d) {
            data = d;
            renderFeatured();
            renderCollections();
            window.addEventListener('popstate', renderFeatured);
        }).catch(function (err) { window.renderDataError(featList, err); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
