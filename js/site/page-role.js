/* page-role.js, a curated role landing page. ?slug=<role>. Renders a headline,
   intro, optional resume button, and the role's featured projects in order, each
   with role-specific bullets that override the project's own. Linked per job
   application (not in the navbar). */

(function () {
    'use strict';

    var root;

    function featuredCard(project, bullets) {
        var card = document.createElement('div');
        card.className = 'card role-feature';

        var a = document.createElement('a');
        a.className = 'role-feature__link';
        a.href = 'project.html?slug=' + encodeURIComponent(project.slug);

        var img = document.createElement('img');
        img.className = 'card__media';
        window.setImg(img, project.cover, 'thumb');
        img.alt = project.title;
        a.appendChild(img);
        card.appendChild(a);

        var body = document.createElement('div');
        body.className = 'card__body';
        if (project.kicker) {
            var k = document.createElement('div'); k.className = 'project-card__kicker'; k.textContent = project.kicker; body.appendChild(k);
        }
        var titleLink = document.createElement('a');
        titleLink.href = a.href;
        titleLink.className = 'card__title role-feature__title';
        titleLink.textContent = project.title;
        body.appendChild(titleLink);

        if (bullets && bullets.length) {
            var ul = document.createElement('ul');
            ul.className = 'role-feature__bullets';
            bullets.forEach(function (b) { var li = document.createElement('li'); li.textContent = b; ul.appendChild(li); });
            body.appendChild(ul);
        }
        card.appendChild(body);
        return card;
    }

    function init() {
        root = document.getElementById('role');
        var slug = new URLSearchParams(location.search).get('slug') || '';
        if (!slug) { window.renderDataError(root, new Error('No role specified (?slug=…)')); return; }

        Promise.all([window.getRole(slug), window.getProjects()])
            .then(function (res) {
                var role = res[0];
                var byslug = {};
                (res[1].projects || []).forEach(function (p) { byslug[p.slug] = p; });

                document.title = role.headline + ' | Ben Beary';
                root.innerHTML = '';

                var header = document.createElement('header');
                header.className = 'role-header';
                header.innerHTML = '<h1 class="role-headline">' + esc(role.headline) + '</h1>' +
                    '<p class="role-intro">' + esc(role.intro || '') + '</p>';
                if (role.resumeLink) {
                    var btn = document.createElement('a');
                    btn.className = 'btn btn-secondary';
                    btn.href = role.resumeLink; btn.target = '_blank'; btn.rel = 'noopener';
                    btn.textContent = 'Download Resume ⤓';
                    header.appendChild(btn);
                }
                root.appendChild(header);

                var grid = document.createElement('div');
                grid.className = 'role-grid';
                (role.featured || []).forEach(function (f) {
                    var project = byslug[f.project];
                    if (!project) return;   // skip unknown slugs gracefully
                    grid.appendChild(featuredCard(project, f.bullets));
                });
                root.appendChild(grid);
            })
            .catch(function (err) { window.renderDataError(root, err); });
    }

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
