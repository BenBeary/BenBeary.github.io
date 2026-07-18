/* editor.js — the block editor. Loads a post (or a blank one), renders the meta
   form + block list, and keeps a live preview in sync via the SHARED site
   renderer (../js/site/blocks.js) so preview == production. Blocks come from the
   EDBLOCKS registry (blocks-edit.js). Autosaves to localStorage so work isn't
   lost. Publish (M5d) is wired later; the button is disabled for now.

   URL: edit.html?project=<slug>&post=<slug>  (edit existing)
        edit.html?project=<slug>&type=blog     (new post)
        edit.html?draft=<key>                   (resume a local draft) */

(function () {
    'use strict';

    var DRAFT_PREFIX = 'pf.editor.draft.';
    var DRAFT_INDEX = 'pf.editor.drafts';

    var state = { project: '', projectMeta: null, slug: '', type: 'blog', title: '', date: '', excerpt: '', cover: '', blocks: [] };
    var slugTouched = false;
    var els = {};
    var previewTimer = null, saveTimer = null;

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60); }
    function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function fmtDate(iso) { var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? (iso || '') : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); }

    function toast(msg) {
        els.toast.textContent = msg;
        els.toast.style.display = 'block';
        clearTimeout(els.toast._t);
        els.toast._t = setTimeout(function () { els.toast.style.display = 'none'; }, 1800);
    }

    // ---- meta form ----
    function renderMeta() {
        var m = state.projectMeta || {};
        els.meta.innerHTML =
            '<div class="ed-meta-project">Project: <strong>' + esc(m.title || state.project) + '</strong>' +
            '<span class="ed-collection-badge">' + esc(m.collection || 'main') + '</span></div>' +
            '<div class="ed-meta-grid">' +
            '<div class="ed-field"><label>Type</label><select class="ed-input" id="m-type">' +
            '<option value="showcase"' + (state.type === 'showcase' ? ' selected' : '') + '>Showcase (pinned)</option>' +
            '<option value="blog"' + (state.type === 'blog' ? ' selected' : '') + '>Blog</option></select></div>' +
            '<div class="ed-field"><label>Date</label><input class="ed-input" type="date" id="m-date" value="' + esc(state.date) + '"></div>' +
            '<div class="ed-field ed-field--wide"><label>Title</label><input class="ed-input" id="m-title" value="' + esc(state.title) + '" placeholder="Post title"></div>' +
            '<div class="ed-field"><label>Slug (URL)</label><input class="ed-input mono" id="m-slug" value="' + esc(state.slug) + '" placeholder="post-slug"></div>' +
            '<div class="ed-field"><label>Cover image path</label><div class="ed-src-row"><input class="ed-input" id="m-cover" value="' + esc(state.cover) + '" placeholder="images/Project/cover.png"><button type="button" class="ed-upload-btn" data-upload title="Upload an image">⬆</button></div></div>' +
            '<div class="ed-field ed-field--wide"><label>Excerpt</label><textarea class="ed-input" id="m-excerpt" rows="2" placeholder="Short summary for listings">' + esc(state.excerpt) + '</textarea></div>' +
            '</div>';
    }

    function syncMeta() {
        state.type = els.byId('m-type').value;
        state.date = els.byId('m-date').value;
        state.title = els.byId('m-title').value;
        state.slug = els.byId('m-slug').value;
        state.cover = els.byId('m-cover').value;
        state.excerpt = els.byId('m-excerpt').value;
    }

    // ---- block list ----
    function renderBlocks() {
        els.blocks.innerHTML = state.blocks.map(function (b, i) {
            var def = window.EDBLOCKS[b.type];
            if (!def) return '';
            var isFirst = i === 0, isLast = i === state.blocks.length - 1;
            return '<div class="ed-block" data-i="' + i + '">' +
                '<div class="ed-block__head">' +
                '<span class="ed-block__type">' + esc(def.label) + '</span>' +
                '<div class="ed-block__ctrl">' +
                '<button type="button" data-up="' + i + '"' + (isFirst ? ' disabled' : '') + ' title="Move up">↑</button>' +
                '<button type="button" data-down="' + i + '"' + (isLast ? ' disabled' : '') + ' title="Move down">↓</button>' +
                '<button type="button" data-del="' + i + '" title="Delete" class="is-danger">✕</button>' +
                '</div></div>' +
                '<div class="ed-block__body">' + def.renderBody(b) + '</div>' +
                '</div>';
        }).join('');
    }

    function renderAddBar() {
        els.addbar.innerHTML = '<span class="ed-addbar__label">Add block:</span>' +
            window.EDBLOCK_ORDER.map(function (t) {
                return '<button type="button" class="btn btn-ghost btn-sm" data-add="' + t + '">+ ' + esc(window.EDBLOCKS[t].label) + '</button>';
            }).join('');
    }

    // Read every block's form back into state.blocks.
    function syncBlocks() {
        els.blocks.querySelectorAll('.ed-block').forEach(function (el) {
            var i = Number(el.dataset.i);
            var b = state.blocks[i];
            if (b && window.EDBLOCKS[b.type]) window.EDBLOCKS[b.type].syncFromDOM(b, el);
        });
    }

    // ---- flush DOM -> state ----
    function flush() { syncMeta(); syncBlocks(); }

    // Autosave (debounced). No live render — preview is on-demand via the modal.
    function scheduleUpdate() {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(function () { flush(); saveDraftLocal(false); }, 400);
    }

    // ---- preview modal (shared site renderer, on demand) ----
    function openPreview() {
        flush();
        els.previewTitle.textContent = state.title || 'Untitled post';
        els.previewMeta.textContent = fmtDate(state.date);
        window.renderBlocks(state.blocks, els.previewBody);
        els.previewOverlay.style.display = 'flex';
        document.body.classList.add('ed-preview-open');
    }
    function closePreview() { els.previewOverlay.style.display = 'none'; document.body.classList.remove('ed-preview-open'); }

    // ---- local draft autosave ----
    function draftKey() { return DRAFT_PREFIX + state.project + '.' + (state.slug || 'untitled'); }
    function buildPost() { return { version: 1, slug: state.slug, project: state.project, type: state.type, title: state.title, date: state.date, excerpt: state.excerpt, blocks: state.blocks }; }
    function readIndex() { try { return JSON.parse(localStorage.getItem(DRAFT_INDEX) || '[]'); } catch (_) { return []; } }

    function saveDraftLocal(announce) {
        try {
            var key = draftKey();
            var rec = { post: buildPost(), cover: state.cover, savedAt: Date.now() };
            localStorage.setItem(key, JSON.stringify(rec));
            var entry = { key: key, project: state.project, slug: state.slug, title: state.title, date: state.date, type: state.type, savedAt: rec.savedAt };
            var idx = readIndex().filter(function (e) { return e.key !== key; });
            idx.unshift(entry);
            localStorage.setItem(DRAFT_INDEX, JSON.stringify(idx.slice(0, 50)));
            if (announce) toast('Draft saved locally');
        } catch (e) { if (announce) toast('Could not save draft (storage full?)'); }
    }
    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () { saveDraftLocal(false); }, 900);
    }
    function clearLocalDraft() {
        try {
            var key = draftKey();
            localStorage.removeItem(key);
            localStorage.setItem(DRAFT_INDEX, JSON.stringify(readIndex().filter(function (e) { return e.key !== key; })));
        } catch (_) {}
    }

    // ---- publish (GitHub) ----
    function decodeB64Utf8(b64) {
        var bin = atob(String(b64).replace(/\s/g, ''));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    }

    async function publish() {
        if (typeof isAuthenticated !== 'function' || !isAuthenticated()) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
        flush();   // DOM -> state
        if (!state.title.trim()) { toast('Add a title first.'); return; }
        if (!state.slug.trim()) { toast('Add a slug first.'); return; }
        if (!state.date) { toast('Add a date first.'); return; }

        var postPath = 'content/posts/' + state.project + '/' + state.slug + '.json';
        var msg = 'Publish "' + state.title + '" to ' + state.project + '?\n\n' +
            'Commits ' + postPath + ' and content/projects.json to main (the live site).\n' +
            'It can take ~10 minutes to appear.';
        if (!confirm(msg)) return;

        var btn = els.byId('ed-publish');
        btn.disabled = true;
        var label = btn.textContent;
        btn.textContent = 'Publishing…';
        try {
            // Fetch the freshest projects.json from the repo, upsert this post's entry.
            var res = await ghFetch('GET', '/contents/content/projects.json');
            var projectsJson = JSON.parse(decodeB64Utf8(res.content));
            var proj = (projectsJson.projects || []).find(function (p) { return p.slug === state.project; });
            if (!proj) throw new Error('Project "' + state.project + '" not found in projects.json.');

            var entry = { slug: state.slug, type: state.type, title: state.title, date: state.date, excerpt: state.excerpt, cover: state.cover };
            if (state.type === 'showcase') {
                proj.posts = (proj.posts || []).filter(function (p) { return p.type !== 'showcase' || p.slug === state.slug; });
            }
            if (!proj.posts) proj.posts = [];
            var i = proj.posts.findIndex(function (p) { return p.slug === state.slug; });
            if (i >= 0) proj.posts[i] = entry; else proj.posts.push(entry);
            projectsJson.contentVersion = (projectsJson.contentVersion || 0) + 1;

            var result = await ghBatchCommit({
                message: 'Editor: publish ' + state.project + '/' + state.slug,
                changes: [
                    { op: 'put', path: postPath, content: JSON.stringify(buildPost(), null, 2) + '\n' },
                    { op: 'put', path: 'content/projects.json', content: JSON.stringify(projectsJson, null, 2) + '\n' }
                ]
            });
            clearLocalDraft();
            toast('Published! Live in ~10 min.');
            if (result && result.commitUrl) console.log('Commit:', result.commitUrl);
        } catch (err) {
            alert('Publish failed: ' + (err && err.message ? err.message : err));
        } finally {
            btn.disabled = false;
            btn.textContent = label;
        }
    }

    // ---- events ----
    function wire() {
        // Meta: auto-slug from title until the slug is edited by hand.
        els.meta.addEventListener('input', function (e) {
            if (e.target.id === 'm-slug') slugTouched = true;
            if (e.target.id === 'm-title' && !slugTouched) { els.byId('m-slug').value = slugify(e.target.value); }
            scheduleUpdate();
        });
        els.meta.addEventListener('change', scheduleUpdate);
        els.meta.addEventListener('click', function (e) { var up = e.target.closest('[data-upload]'); if (up) uploadFromButton(up); });

        // Block list: input + change → preview.
        els.blocks.addEventListener('input', scheduleUpdate);
        els.blocks.addEventListener('change', scheduleUpdate);

        // Rich-text paste → sanitize into the editor.
        els.blocks.addEventListener('paste', function (e) {
            var ed = e.target.closest && e.target.closest('.rt-editor');
            if (!ed || !e.clipboardData) return;
            e.preventDefault();
            var html = e.clipboardData.getData('text/html');
            var clean = html ? window.sanitizeRichHtml(html) : esc(e.clipboardData.getData('text/plain')).replace(/\n/g, '<br>');
            document.execCommand('insertHTML', false, clean);
            scheduleUpdate();
        });

        // Clicks: add / move / delete / gallery rows / rich-text toolbar.
        els.addbar.addEventListener('click', function (e) {
            var add = e.target.closest('[data-add]');
            if (!add) return;
            var def = window.EDBLOCKS[add.dataset.add];
            if (!def) return;
            syncBlocks();
            state.blocks.push(def.defaults());
            renderBlocks();
            saveDraftLocal(false);
        });

        els.blocks.addEventListener('click', function (e) {
            var t = e.target;
            var up = t.closest('[data-upload]');
            if (up) { uploadFromButton(up); return; }
            var rt = t.closest('.rt-btn');
            if (rt) { handleRichText(rt); return; }

            var gAdd = t.closest('[data-gallery-add]');
            var gDel = t.closest('[data-gallery-remove]');
            var up = t.closest('[data-up]');
            var down = t.closest('[data-down]');
            var del = t.closest('[data-del]');
            if (!gAdd && !gDel && !up && !down && !del) return;

            syncBlocks();
            if (gAdd) {
                var bi = Number(gAdd.closest('.ed-block').dataset.i);
                if (!state.blocks[bi].items) state.blocks[bi].items = [];
                state.blocks[bi].items.push({ src: '', alt: '' });
            } else if (gDel) {
                var gbi = Number(gDel.closest('.ed-block').dataset.i);
                state.blocks[gbi].items.splice(Number(gDel.dataset.galleryRemove), 1);
                if (!state.blocks[gbi].items.length) state.blocks[gbi].items.push({ src: '', alt: '' });
            } else if (up) {
                var u = Number(up.dataset.up); if (u > 0) { var tmp = state.blocks[u - 1]; state.blocks[u - 1] = state.blocks[u]; state.blocks[u] = tmp; }
            } else if (down) {
                var d = Number(down.dataset.down); if (d < state.blocks.length - 1) { var t2 = state.blocks[d + 1]; state.blocks[d + 1] = state.blocks[d]; state.blocks[d] = t2; }
            } else if (del) {
                state.blocks.splice(Number(del.dataset.del), 1);
            }
            renderBlocks();
            saveDraftLocal(false);
        });

        els.byId('ed-save-draft').addEventListener('click', function () { flush(); saveDraftLocal(true); });
        els.byId('ed-publish').addEventListener('click', publish);
        els.byId('ed-tool-preview').addEventListener('click', openPreview);
        els.byId('ed-preview-close').addEventListener('click', closePreview);
        els.previewOverlay.addEventListener('click', function (e) { if (e.target === els.previewOverlay) closePreview(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && els.previewOverlay.style.display === 'flex') closePreview(); });
    }

    // ---- image upload (upload.js) ----
    function folderFromMeta() {
        var m = state.projectMeta || {};
        var c = m.cover || m.background || ('images/' + state.project + '/_');
        return c.replace(/\/[^/]+$/, '') || ('images/' + state.project);
    }
    function uploadFromButton(btn) {
        if (!window.EditorUpload) { alert('Upload is unavailable.'); return; }
        var input = btn.previousElementSibling;
        while (input && input.tagName !== 'INPUT') input = input.previousElementSibling;
        if (!input) return;
        window.EditorUpload.pickAndUpload(folderFromMeta(), function (path) {
            input.value = path;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            toast('Uploaded ' + path);
        });
    }

    function handleRichText(btn) {
        var wrap = btn.closest('.rt-wrap');
        var ed = wrap && wrap.querySelector('.rt-editor');
        if (!ed) return;
        ed.focus();
        var cmd = btn.dataset.rt;
        if (cmd === 'link') {
            var url = prompt('Link URL:');
            if (url) document.execCommand('createLink', false, url);
        } else {
            document.execCommand(cmd, false, null);
        }
        scheduleUpdate();
    }

    // ---- load ----
    function showError(msg) {
        document.getElementById('ed-editor').innerHTML = '<div class="ed-landing"><div class="data-error"><h2>' + esc(msg) + '</h2><p><a href="index.html">Back to editor</a></p></div></div>';
    }

    function finishLoad() {
        renderMeta();
        renderBlocks();
        renderAddBar();
        wire();
    }

    function loadFromDraft(key) {
        var raw = localStorage.getItem(key);
        if (!raw) { showError('Draft not found'); return; }
        var rec;
        try { rec = JSON.parse(raw); } catch (_) { showError('Draft is corrupted'); return; }
        var post = rec.post || {};
        window.getProjects().then(function (data) {
            state.project = post.project || '';
            state.projectMeta = (data.projects || []).find(function (p) { return p.slug === state.project; }) || null;
            state.slug = post.slug || ''; state.type = post.type || 'blog';
            state.title = post.title || ''; state.date = post.date || todayIso();
            state.excerpt = post.excerpt || ''; state.cover = rec.cover || '';
            state.blocks = Array.isArray(post.blocks) ? post.blocks : [];
            slugTouched = true;
            finishLoad();
        }).catch(function (err) { showError(err.message || 'Failed to load'); });
    }

    function init() {
        els.meta = document.getElementById('ed-meta');
        els.blocks = document.getElementById('ed-blocks');
        els.addbar = document.getElementById('ed-addbar');
        els.previewOverlay = document.getElementById('ed-preview-overlay');
        els.previewTitle = document.getElementById('ed-preview-title');
        els.previewMeta = document.getElementById('ed-preview-meta');
        els.previewBody = document.getElementById('ed-preview-body');
        els.toast = document.getElementById('ed-toast');
        els.byId = function (id) { return document.getElementById(id); };

        var params = new URLSearchParams(location.search);
        var draft = params.get('draft');
        if (draft) { loadFromDraft(draft); return; }

        var projectSlug = params.get('project') || '';
        var postSlug = params.get('post') || '';
        var type = params.get('type') || 'blog';

        window.getProjects().then(function (data) {
            var meta = (data.projects || []).find(function (p) { return p.slug === projectSlug; });
            if (!meta) { showError('Unknown project "' + projectSlug + '"'); return; }
            state.project = projectSlug;
            state.projectMeta = meta;

            if (postSlug) {
                return window.getPost(projectSlug, postSlug).then(function (post) {
                    state.slug = post.slug; state.type = post.type || 'blog';
                    state.title = post.title || ''; state.date = post.date || todayIso();
                    state.excerpt = post.excerpt || ''; state.blocks = Array.isArray(post.blocks) ? post.blocks : [];
                    var entry = (meta.posts || []).find(function (p) { return p.slug === postSlug; });
                    state.cover = entry && entry.cover ? entry.cover : '';
                    slugTouched = true;
                    finishLoad();
                });
            }
            // New post
            state.slug = ''; state.type = type === 'showcase' ? 'showcase' : 'blog';
            state.title = ''; state.date = todayIso(); state.excerpt = ''; state.cover = ''; state.blocks = [];
            finishLoad();
        }).catch(function (err) { showError(err.message || 'Failed to load'); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
