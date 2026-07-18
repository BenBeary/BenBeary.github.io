/* history.js — 📜 changes log: recent commits on main, in a modal. Builds its
   own overlay on first open (no per-page markup). Works unauthenticated for a
   public repo; uses the token when signed in. Load after github-api.js.
   window.EditorHistory.open() */

(function () {
    'use strict';

    var built = false;

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function build() {
        var o = document.createElement('div');
        o.className = 'modal-overlay';
        o.id = 'hist-overlay';
        o.innerHTML =
            '<div class="hist-box">' +
            '<div class="imgb-bar"><span class="imgb-bar__title">📜 Recent changes (main)</span>' +
            '<button class="imgb-tool" id="hist-reload" title="Reload">↻</button>' +
            '<button class="ed-preview-close" id="hist-close" aria-label="Close">✕</button></div>' +
            '<div class="hist-body" id="hist-body"></div>' +
            '</div>';
        document.body.appendChild(o);
        o.addEventListener('click', function (e) { if (e.target === o) close(); });
        document.getElementById('hist-close').addEventListener('click', close);
        document.getElementById('hist-reload').addEventListener('click', load);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && o.style.display === 'flex') close(); });
        built = true;
    }

    async function load() {
        var body = document.getElementById('hist-body');
        body.innerHTML = '<div class="imgb-empty">Loading…</div>';
        try {
            var commits = await ghFetch('GET', '/commits?per_page=25');
            body.innerHTML = (commits || []).map(function (c) {
                var msg = (c.commit && c.commit.message || '').split('\n')[0];
                var when = c.commit && c.commit.author && c.commit.author.date
                    ? new Date(c.commit.author.date).toLocaleString() : '';
                var isEditor = /^Editor:/.test(msg);
                return '<a class="hist-row' + (isEditor ? ' is-editor' : '') + '" href="' + esc(c.html_url) + '" target="_blank" rel="noopener">' +
                    '<span class="hist-msg">' + esc(msg) + '</span>' +
                    '<span class="hist-meta">' + esc(when) + ' · ' + esc((c.sha || '').slice(0, 7)) + '</span>' +
                    '</a>';
            }).join('') || '<div class="imgb-empty">No commits found.</div>';
        } catch (err) {
            body.innerHTML = '<div class="imgb-empty">Couldn\'t load history: ' + esc(err.message || err) + '</div>';
        }
    }

    function open() {
        if (!built) build();
        document.getElementById('hist-overlay').style.display = 'flex';
        load();
    }
    function close() { var o = document.getElementById('hist-overlay'); if (o) o.style.display = 'none'; }

    window.EditorHistory = { open: open, close: close };
})();
