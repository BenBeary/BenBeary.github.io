/* partials.js, injects the universal site header and footer so every page
   shares one nav/footer definition. Modeled on the CADRE partials pattern.

   A page opts in by including empty slots and this script:
       <div id="site-header"></div>
       ... <main> ...
       <div id="site-footer"></div>
       <script src="js/site/partials.js"></script>   (path relative to the page)

   Path handling: links contain {{root}} which is replaced with
   `document.body.dataset.root` (default '' for root-level pages; '../' for pages
   under Editor/). Active nav: set `document.body.dataset.page` to one of
   home | projects | about and the matching link gets .is-active.

   The Projects dropdown is progressively enhanced: after injecting the header we
   try to load content/projects.json and build a collection-grouped menu. If that
   file doesn't exist yet (before Milestone 3) the trigger stays a plain link to
   projects.html. This module has no hard dependency on data.js, it uses the
   global getProjects() if present, else does its own guarded fetch. */

(function () {
    'use strict';

    var root = (document.body && document.body.dataset.root) || '';
    var page = (document.body && document.body.dataset.page) || '';

    function render(tpl) { return tpl.replace(/\{\{root\}\}/g, root); }

    var HEADER = `
    <header class="site-header">
        <div class="site-header__inner">
            <a class="site-brand" href="{{root}}index.html">
                <span class="site-brand__name">Ben Beary</span>
                <span class="site-brand__role">Level Designer · Technical Artist · Gameplay Programmer</span>
            </a>
            <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="site-nav">☰</button>
            <nav class="site-nav" id="site-nav">
                <a href="{{root}}index.html" data-nav="home">Home</a>
                <span class="nav-projects" data-nav="projects">
                    <a href="{{root}}projects.html">Projects</a>
                    <button class="nav-projects__toggle" type="button" aria-label="Show projects" aria-expanded="false">▾</button>
                    <span class="nav-projects__menu"></span>
                </span>
                <a href="{{root}}about.html" data-nav="about">About</a>
            </nav>
        </div>
    </header>`;

    var FOOTER = `
    <footer class="site-footer">
        <div class="site-footer__inner">
            <span class="site-footer__brand">Ben Beary</span>
            <span class="site-footer__socials social-row">
                <a href="https://benbeary.itch.io/" target="_blank" rel="noopener" aria-label="itch.io">
                    <img src="{{root}}images/SocialIcons/Itch-io-icon.png" alt=""></a>
                <a href="https://www.linkedin.com/in/ben-beary-856b75304/" target="_blank" rel="noopener" aria-label="LinkedIn">
                    <img src="{{root}}images/SocialIcons/icon-logo-linkedin.png" alt=""></a>
                <a href="https://laguna-interactive.carrd.co/" target="_blank" rel="noopener" aria-label="Laguna Interactive">
                    <img src="{{root}}images/SocialIcons/laguna_logo_2.png" alt=""></a>
            </span>
            <span class="site-footer__copy">© ${new Date().getFullYear()} Ben Beary</span>
        </div>
    </footer>`;

    function injectSlot(id, html) {
        var slot = document.getElementById(id);
        if (slot) slot.outerHTML = render(html);
    }

    function markActiveNav() {
        if (!page) return;
        var el = document.querySelector('.site-nav [data-nav="' + page + '"]');
        if (el) el.classList.add('is-active');
    }

    function wireMobileToggle() {
        var toggle = document.querySelector('.nav-toggle');
        var nav = document.getElementById('site-nav');
        if (!toggle || !nav) return;
        toggle.addEventListener('click', function () {
            var open = nav.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        // Collapse the menu after following a link on mobile.
        nav.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') {
                nav.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Projects submenu: on mobile it collapses, and the caret expands it.
        // (On desktop the menu opens on hover and the caret stays hidden.)
        var projects = document.querySelector('.nav-projects');
        var caret = document.querySelector('.nav-projects__toggle');
        if (projects && caret) {
            caret.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var open = projects.classList.toggle('is-open');
                caret.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }
    }

    // --- Progressive enhancement: collection-grouped Projects dropdown ---
    async function loadProjectsData() {
        try {
            if (typeof getProjects === 'function') return await getProjects();
            var res = await fetch(root + 'content/projects.json');
            if (!res.ok) return null;
            return await res.json();
        } catch (_) {
            return null;   // not built yet (pre-M3) or offline, keep the plain link
        }
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function enhanceProjectsMenu() {
        var menu = document.querySelector('.nav-projects__menu');
        if (!menu) return;
        var data = await loadProjectsData();
        if (!data || !Array.isArray(data.projects) || !data.projects.length) return;

        var collections = Array.isArray(data.collections) ? data.collections : [];
        var html = '';
        // A link to the full catalogue first.
        html += '<a href="' + root + 'projects.html">All Projects</a>';
        collections.forEach(function (col) {
            var inCol = data.projects.filter(function (p) { return !p.hidden && p.collection === col.slug; });
            if (!inCol.length) return;
            html += '<span class="nav-projects__group">' + escapeHtml(col.label) + '</span>';
            inCol.forEach(function (p) {
                html += '<a href="' + root + 'project.html?slug=' + encodeURIComponent(p.slug) + '">'
                     + escapeHtml(p.title) + '</a>';
            });
        });
        menu.innerHTML = html;
    }

    function init() {
        injectSlot('site-header', HEADER);
        injectSlot('site-footer', FOOTER);
        markActiveNav();
        wireMobileToggle();
        enhanceProjectsMenu();
        document.dispatchEvent(new CustomEvent('partials:ready'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
