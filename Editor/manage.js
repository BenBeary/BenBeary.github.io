/* manage.js — project & taxonomy metadata editor. Loads the freshest
   content/projects.json from the repo, renders a form per project (title,
   kicker, status, collection, order, tags, categories, links, summary) plus the
   collection/category labels, and commits the whole file back via ghBatchCommit
   (bumping contentVersion). Owner-only; requires sign-in to load/save. */

(function () {
    'use strict';

    var data = null;   // the working projects.json
    var root, toastEl;

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function toast(m) { toastEl.textContent = m; toastEl.style.display = 'block'; clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.display = 'none'; }, 2000); }
    function decodeB64Utf8(b64) { var bin = atob(String(b64).replace(/\s/g, '')); var by = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) by[i] = bin.charCodeAt(i); return new TextDecoder('utf-8').decode(by); }

    function textField(label, k, v) {
        return '<div class="ed-field"><label>' + label + '</label><input class="ed-input" data-k="' + k + '" value="' + esc(v) + '"></div>';
    }

    function projectForm(p) {
        var collOpts = (data.collections || []).map(function (c) {
            return '<option value="' + esc(c.slug) + '"' + (p.collection === c.slug ? ' selected' : '') + '>' + esc(c.label) + '</option>';
        }).join('');
        var catChecks = (data.categories || []).map(function (c) {
            var on = (p.categories || []).indexOf(c.slug) !== -1;
            return '<label class="ed-check"><input type="checkbox" data-cat="' + esc(c.slug) + '"' + (on ? ' checked' : '') + '> ' + esc(c.label) + '</label>';
        }).join('');
        var order = p.order || {};
        var orderInputs = [{ slug: 'home', label: 'Home' }].concat(data.categories || []).map(function (c) {
            var v = order[c.slug] != null ? order[c.slug] : '';
            return '<div class="ed-order-cell"><label>' + esc(c.label) + '</label><input class="ed-input" type="number" data-order="' + esc(c.slug) + '" value="' + esc(v) + '" min="0"></div>';
        }).join('');

        return '<div class="ed-project" data-slug="' + esc(p.slug) + '">' +
            '<div class="ed-project__head"><div class="ed-project__title">' + esc(p.title) + '</div>' +
            '<div class="ed-project__meta"><span class="ed-collection-badge">' + esc(p.slug) + '</span></div></div>' +
            '<div class="ed-block__body">' +
            '<div class="ed-meta-grid">' +
            textField('Title', 'title', p.title) +
            textField('Kicker', 'kicker', p.kicker || '') +
            textField('Status', 'status', p.status || '') +
            '<div class="ed-field"><label>Collection</label><select class="ed-input" data-k="collection">' + collOpts + '</select></div>' +
            textField('Play link', 'playLink', p.playLink || '') +
            textField('Cover path', 'cover', p.cover || '') +
            textField('Background path', 'background', p.background || '') +
            textField('Date', 'date', p.date || '') +
            '<div class="ed-field ed-field--wide"><label>Tags (comma-separated)</label><input class="ed-input" data-k="tags" value="' + esc((p.tags || []).join(', ')) + '"></div>' +
            '<div class="ed-field ed-field--wide"><label>Summary</label><textarea class="ed-input" data-k="summary" rows="2">' + esc(p.summary || '') + '</textarea></div>' +
            '</div>' +
            '<div class="ed-field"><label>Skill categories</label><div class="ed-checks">' + catChecks + '</div></div>' +
            '<div class="ed-field"><label>Order (blank = not featured there; lower shows first)</label><div class="ed-order-grid">' + orderInputs + '</div></div>' +
            '</div></div>';
    }

    function taxonomyForm() {
        var cols = (data.collections || []).map(function (c) {
            return '<div class="ed-tax-row"><span class="ed-collection-badge">' + esc(c.slug) + '</span><input class="ed-input" data-coll="' + esc(c.slug) + '" value="' + esc(c.label) + '"></div>';
        }).join('');
        var cats = (data.categories || []).map(function (c) {
            return '<div class="ed-tax-row"><span class="ed-collection-badge">' + esc(c.slug) + '</span><input class="ed-input" data-catlabel="' + esc(c.slug) + '" value="' + esc(c.label) + '"></div>';
        }).join('');
        return '<div class="ed-project"><div class="ed-project__head"><div class="ed-project__title">Collections &amp; Categories</div></div>' +
            '<div class="ed-block__body"><div class="ed-meta-grid">' +
            '<div class="ed-field"><label>Collection labels</label>' + cols + '</div>' +
            '<div class="ed-field"><label>Category labels</label>' + cats + '</div>' +
            '</div></div></div>';
    }

    function render() {
        var html = '<div class="ed-landing"><h1>Manage content</h1>' +
            '<p class="ed-empty">Edit metadata, then “Save changes” commits content/projects.json to the live site (~10 min to appear).</p>' +
            taxonomyForm() +
            (data.projects || []).map(projectForm).join('') +
            '</div>';
        root.innerHTML = html;
    }

    // Read every form back into `data`.
    function collect() {
        root.querySelectorAll('[data-coll]').forEach(function (inp) {
            var c = (data.collections || []).find(function (x) { return x.slug === inp.dataset.coll; });
            if (c) c.label = inp.value;
        });
        root.querySelectorAll('[data-catlabel]').forEach(function (inp) {
            var c = (data.categories || []).find(function (x) { return x.slug === inp.dataset.catlabel; });
            if (c) c.label = inp.value;
        });
        root.querySelectorAll('.ed-project[data-slug]').forEach(function (form) {
            var p = (data.projects || []).find(function (x) { return x.slug === form.dataset.slug; });
            if (!p) return;
            form.querySelectorAll('[data-k]').forEach(function (inp) {
                var k = inp.dataset.k, v = inp.value;
                if (k === 'tags') p.tags = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                else p[k] = v;
            });
            p.categories = Array.prototype.map.call(form.querySelectorAll('[data-cat]:checked'), function (c) { return c.dataset.cat; });
            var order = {};
            form.querySelectorAll('[data-order]').forEach(function (inp) {
                if (inp.value !== '') order[inp.dataset.order] = Number(inp.value);
            });
            p.order = order;
        });
    }

    async function save() {
        if (typeof isAuthenticated !== 'function' || !isAuthenticated()) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
        collect();
        if (!confirm('Commit content/projects.json to main (the live site)? It can take ~10 minutes to appear.')) return;
        var btn = document.getElementById('mg-save');
        btn.disabled = true; var label = btn.textContent; btn.textContent = 'Saving…';
        try {
            data.contentVersion = (data.contentVersion || 0) + 1;
            await ghBatchCommit({
                message: 'Editor: update project metadata',
                changes: [{ op: 'put', path: 'content/projects.json', content: JSON.stringify(data, null, 2) + '\n' }]
            });
            toast('Saved! Live in ~10 min.');
        } catch (err) {
            alert('Save failed: ' + (err && err.message ? err.message : err));
        } finally {
            btn.disabled = false; btn.textContent = label;
        }
    }

    function renderSignedOut() {
        root.innerHTML = '<div class="ed-landing"><div class="ed-signin-prompt"><h1>Manage content</h1>' +
            '<p>Sign in to edit project metadata.</p><button class="btn btn-primary" id="mg-signin">🔑 Sign in</button></div></div>';
        var b = document.getElementById('mg-signin');
        if (b) b.addEventListener('click', function () { if (typeof openAuthModal === 'function') openAuthModal(); });
    }

    function load() {
        if (typeof isAuthenticated !== 'function' || !isAuthenticated()) { renderSignedOut(); return; }
        // Load the freshest copy straight from the repo.
        ghFetch('GET', '/contents/content/projects.json').then(function (res) {
            data = JSON.parse(decodeB64Utf8(res.content));
            render();
        }).catch(function (err) {
            root.innerHTML = '<div class="ed-landing"><div class="data-error"><h2>Couldn\'t load projects.json</h2><p>' + esc(err.message || err) + '</p></div></div>';
        });
    }

    function init() {
        root = document.getElementById('mg-root');
        toastEl = document.getElementById('ed-toast');
        document.getElementById('mg-save').addEventListener('click', save);
        document.addEventListener('auth:ready', load);
        document.addEventListener('auth:changed', load);
        load();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
