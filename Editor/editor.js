/* editor.js — the block editor. Loads a post (or a blank one), renders the meta
   form + block list, and keeps a live preview in sync via the SHARED site
   renderer (../js/site/blocks.js) so preview == production. Blocks come from the
   EDBLOCKS registry (blocks-edit.js). Autosaves to localStorage so an in-progress
   edit isn't lost. "Add to changes" STAGES the post + updated projects.json into
   the shared change queue (queue.js) rather than committing; the actual GitHub
   commit happens from the 📋 Changes modal.

   URL: edit.html?project=<slug>&post=<slug>  (edit existing)
        edit.html?project=<slug>&type=blog     (new post)
        edit.html?draft=<key>                   (resume a local draft) */

(function () {
    'use strict';

    var DRAFT_PREFIX = 'pf.editor.draft.';
    var DRAFT_INDEX = 'pf.editor.drafts';

    var state = { project: '', projectMeta: null, allProjects: [], slug: '', type: 'blog', title: '', date: '', excerpt: '', cover: '', hidden: false, blocks: [] };
    // Set when editing an existing published post; publish relocates (delete +
    // re-add) when the project or slug changed. Enables moving posts between
    // projects (e.g. consolidating small games into one collection project).
    var loadedPath = '', origProject = '', origSlug = '';
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
        var projOpts = (state.allProjects || []).map(function (p) {
            return '<option value="' + esc(p.slug) + '"' + (p.slug === state.project ? ' selected' : '') + '>' + esc(p.title || p.slug) + '</option>';
        }).join('');
        els.meta.innerHTML =
            '<div class="ed-meta-project"><label class="ed-meta-project__label">Project</label>' +
            '<select class="ed-input ed-meta-project__select" id="m-project" title="Move this post to another project">' + projOpts + '</select>' +
            '<span class="ed-collection-badge">' + esc(m.collection || 'main') + '</span></div>' +
            '<div class="ed-meta-grid">' +
            '<div class="ed-field"><label>Type</label><select class="ed-input" id="m-type">' +
            '<option value="showcase"' + (state.type === 'showcase' ? ' selected' : '') + '>Showcase (pinned)</option>' +
            '<option value="blog"' + (state.type === 'blog' ? ' selected' : '') + '>Blog</option></select></div>' +
            '<div class="ed-field"><label>Date</label><input class="ed-input" type="date" id="m-date" value="' + esc(state.date) + '"></div>' +
            '<div class="ed-field ed-field--wide"><label>Title</label><input class="ed-input" id="m-title" value="' + esc(state.title) + '" placeholder="Post title"></div>' +
            '<div class="ed-field"><label>Slug (URL)</label><input class="ed-input mono" id="m-slug" value="' + esc(state.slug) + '" placeholder="post-slug"></div>' +
            '<div class="ed-field"><label>Cover image path</label><div class="ed-src-row"><input class="ed-input" id="m-cover" value="' + esc(state.cover) + '" placeholder="images/Blog Images/Project/cover.png"><button type="button" class="ed-upload-btn" data-browse title="Pick from the image folders (right-click inside to upload)">📁</button></div></div>' +
            '<div class="ed-field ed-field--wide"><label>Excerpt</label><textarea class="ed-input" id="m-excerpt" rows="2" placeholder="Short summary for listings">' + esc(state.excerpt) + '</textarea></div>' +
            '<div class="ed-field ed-field--wide"><label class="ed-check ed-hide-toggle"><input type="checkbox" id="m-hidden"' + (state.hidden ? ' checked' : '') + '> Hide this post (keep it off the project page — direct link still works)</label></div>' +
            '</div>';
    }

    function syncMeta() {
        var proj = els.byId('m-project');
        if (proj && proj.value !== state.project) {
            state.project = proj.value;
            state.projectMeta = (state.allProjects || []).find(function (p) { return p.slug === state.project; }) || state.projectMeta;
        }
        state.type = els.byId('m-type').value;
        state.date = els.byId('m-date').value;
        state.title = els.byId('m-title').value;
        state.slug = els.byId('m-slug').value;
        state.cover = els.byId('m-cover').value;
        state.excerpt = els.byId('m-excerpt').value;
        var hid = els.byId('m-hidden'); state.hidden = !!(hid && hid.checked);
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

    // Debounced: autosave + push the latest state into the live preview iframe.
    function scheduleUpdate() {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(function () { flush(); saveDraftLocal(false); sendPreview(); }, 350);
    }

    // ---- live preview (iframe: Editor/preview.html, site CSS only) ----------
    var previewReady = false, pendingPreview = null;
    var PREVIEW_VIS_KEY = 'pf.editor.previewVisible';
    var PREVIEW_W_KEY = 'pf.editor.previewWidthPct';

    function sendPreview() {
        var payload = { type: 'post', title: state.title, date: state.date, blocks: state.blocks };
        if (!previewReady || !els.previewFrame.contentWindow) { pendingPreview = payload; return; }
        els.previewFrame.contentWindow.postMessage(payload, '*');
    }

    function previewVisible() { return localStorage.getItem(PREVIEW_VIS_KEY) !== '0'; }
    function applyPreviewVis() {
        var on = previewVisible();
        els.previewPane.style.display = on ? '' : 'none';
        els.splitHandle.style.display = on ? '' : 'none';
        els.byId('ed-tool-preview').classList.toggle('is-active', on);
        if (on) sendPreview();
    }
    function togglePreview() {
        try { localStorage.setItem(PREVIEW_VIS_KEY, previewVisible() ? '0' : '1'); } catch (_) {}
        applyPreviewVis();
    }

    function initSplit() {
        var saved = parseFloat(localStorage.getItem(PREVIEW_W_KEY));
        if (saved >= 20 && saved <= 70) els.previewPane.style.width = saved + '%';
        var dragging = false;
        els.splitHandle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            dragging = true;
            els.previewFrame.style.pointerEvents = 'none';   // iframe would eat mousemove
            document.body.style.cursor = 'col-resize';
        });
        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            var rect = document.getElementById('ed-editor').getBoundingClientRect();
            var pct = ((rect.right - e.clientX) / rect.width) * 100;
            pct = Math.min(70, Math.max(20, pct));
            els.previewPane.style.width = pct + '%';
        });
        document.addEventListener('mouseup', function () {
            if (!dragging) return;
            dragging = false;
            els.previewFrame.style.pointerEvents = '';
            document.body.style.cursor = '';
            var pct = parseFloat(els.previewPane.style.width);
            if (pct) { try { localStorage.setItem(PREVIEW_W_KEY, String(pct)); } catch (_) {} }
        });
    }

    // preview.html announces readiness; deliver the latest payload then.
    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'preview-ready') {
            previewReady = true;
            if (pendingPreview) { els.previewFrame.contentWindow.postMessage(pendingPreview, '*'); pendingPreview = null; }
            else sendPreview();
        }
    });

    // ---- local draft autosave ----
    function draftKey() { return DRAFT_PREFIX + state.project + '.' + (state.slug || 'untitled'); }
    function buildPost() { return { version: 1, slug: state.slug, project: state.project, type: state.type, title: state.title, date: state.date, excerpt: state.excerpt, blocks: state.blocks }; }
    function readIndex() { try { return JSON.parse(localStorage.getItem(DRAFT_INDEX) || '[]'); } catch (_) { return []; } }

    function saveDraftLocal(announce) {
        try {
            var key = draftKey();
            var rec = { post: buildPost(), cover: state.cover, hidden: state.hidden, savedAt: Date.now() };
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

    // ---- stage into the change queue (queue.js) ----
    // Instead of committing immediately, this post + the updated projects.json
    // are staged in the local queue, which persists across editor pages. The
    // actual GitHub commit happens from the 📋 Changes modal (queue.js).
    async function stageChanges() {
        flush();   // DOM -> state
        if (!state.title.trim()) { toast('Add a title first.'); return; }
        if (!state.slug.trim()) { toast('Add a slug first.'); return; }
        if (!state.date) { toast('Add a date first.'); return; }

        var postPath = 'content/posts/' + state.project + '/' + state.slug + '.json';
        var btn = els.byId('ed-publish');
        btn.disabled = true;
        var label = btn.textContent;
        btn.textContent = 'Adding…';
        try {
            // Effective projects.json (committed on main + anything already queued)
            // so this composes with other staged edits.
            var projectsJson = await window.EditorQueue.loadProjects();
            var proj = (projectsJson.projects || []).find(function (p) { return p.slug === state.project; });
            if (!proj) throw new Error('Project "' + state.project + '" not found. Create it in Manage first.');

            // Stage the post file.
            window.EditorQueue.stagePut(postPath, JSON.stringify(buildPost(), null, 2) + '\n',
                (state.type === 'showcase' ? 'Showcase' : 'Post') + ': ' + state.title);

            // Relocation: post loaded from elsewhere (moved project or renamed
            // slug) — delete the old file and drop the old index entry.
            if (loadedPath && loadedPath !== postPath) {
                window.EditorQueue.stageDelete(loadedPath, 'Delete old post: ' + origSlug);
                var oldProj = (projectsJson.projects || []).find(function (p) { return p.slug === origProject; });
                if (oldProj && oldProj.posts) oldProj.posts = oldProj.posts.filter(function (p) { return p.slug !== origSlug; });
            }

            var entry = { slug: state.slug, type: state.type, title: state.title, date: state.date, excerpt: state.excerpt, cover: state.cover };
            if (state.hidden) entry.hidden = true;
            if (state.type === 'showcase') {
                proj.posts = (proj.posts || []).filter(function (p) { return p.type !== 'showcase' || p.slug === state.slug; });
            }
            if (!proj.posts) proj.posts = [];
            var i = proj.posts.findIndex(function (p) { return p.slug === state.slug; });
            if (i >= 0) proj.posts[i] = entry; else proj.posts.push(entry);

            window.EditorQueue.stageProjects(projectsJson, 'Project index (posts)');
            clearLocalDraft();
            loadedPath = postPath; origProject = state.project; origSlug = state.slug;
            toast('Added to changes — commit from 📋 Changes when ready.');
        } catch (err) {
            alert('Could not add to changes: ' + (err && err.message ? err.message : err));
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
        els.meta.addEventListener('click', function (e) {
            var br = e.target.closest('[data-browse]'); if (br) browseFromButton(br);
        });

        // Block list: input + change → preview.
        els.blocks.addEventListener('input', scheduleUpdate);
        els.blocks.addEventListener('change', scheduleUpdate);

        // Enter makes <p> (not <div>) so stored HTML matches the site output.
        try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (_) {}

        // Toolbar mousedown would collapse the editor selection before click — suppress.
        els.blocks.addEventListener('mousedown', function (e) {
            if (e.target.closest('.rt-btn')) e.preventDefault();
        });

        // Rich-text paste → sanitize; multi-line pastes get real <p> structure.
        els.blocks.addEventListener('paste', function (e) {
            var ed = e.target.closest && e.target.closest('.rt-editor');
            if (!ed || !e.clipboardData) return;
            e.preventDefault();
            var html = e.clipboardData.getData('text/html');
            var clean = html ? window.sanitizeRichHtml(html) : esc(e.clipboardData.getData('text/plain')).replace(/\n/g, '<br>');
            if (/<(p|ul|ol|br)[\s>/]/i.test(clean)) clean = window.edNormalizeRich(clean);
            document.execCommand('insertHTML', false, clean);
            scheduleUpdate();
        });

        // Keyboard: Tab indents list items; Ctrl+B/I/U/K shortcuts.
        els.blocks.addEventListener('keydown', function (e) {
            var ed = e.target.closest && e.target.closest('.rt-editor');
            if (!ed) return;
            if (e.key === 'Tab') {
                if (selectionInListItem(ed)) {
                    e.preventDefault();
                    document.execCommand(e.shiftKey ? 'outdent' : 'indent', false, null);
                    scheduleUpdate();
                }
                return;
            }
            if (!(e.ctrlKey || e.metaKey) || e.shiftKey) return;
            var key = e.key.toLowerCase();
            if (key === 'k') { e.preventDefault(); openLinkModal(ed); return; }
            var cmd = { b: 'bold', i: 'italic', u: 'underline' }[key];
            if (cmd) { e.preventDefault(); document.execCommand(cmd, false, null); scheduleUpdate(); }
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
            var br = t.closest('[data-browse]');
            if (br) { browseFromButton(br); return; }
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

        // Link modal wiring
        els.byId('link-modal-confirm').addEventListener('click', confirmLinkModal);
        els.byId('link-modal-cancel').addEventListener('click', closeLinkModal);
        els.byId('link-modal-remove').addEventListener('click', removeLinkModal);
        var lmo = els.byId('link-modal-overlay');
        lmo.addEventListener('click', function (e) { if (e.target === lmo) closeLinkModal(); });
        ['link-modal-text', 'link-modal-url'].forEach(function (id) {
            els.byId(id).addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); confirmLinkModal(); }
                else if (e.key === 'Escape') { e.preventDefault(); closeLinkModal(); }
            });
        });
        els.byId('ed-publish').addEventListener('click', stageChanges);
        els.byId('ed-tool-preview').addEventListener('click', togglePreview);
        els.byId('ed-tool-images').addEventListener('click', function () { if (window.ImageBrowser) window.ImageBrowser.open({ pick: false }); });
        applyPreviewVis();
        initSplit();
        sendPreview();
    }

    // ---- image field browse (image-browser.js) ----
    function inputForButton(btn) {
        var input = btn.previousElementSibling;
        while (input && input.tagName !== 'INPUT') input = input.previousElementSibling;
        return input;
    }
    function browseFromButton(btn) {
        if (!window.ImageBrowser) { alert('Image browser is unavailable.'); return; }
        var input = inputForButton(btn);
        if (!input) return;
        window.ImageBrowser.open({ pick: true, onPick: function (path) {
            input.value = path;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            toast('Selected ' + path);
        } });
    }

    function handleRichText(btn) {
        var wrap = btn.closest('.rt-wrap');
        var ed = wrap && wrap.querySelector('.rt-editor');
        if (!ed) return;
        ed.focus();
        var cmd = btn.dataset.rt;
        if (cmd === 'link') { openLinkModal(ed); return; }
        document.execCommand(cmd, false, null);
        scheduleUpdate();
    }

    // ---- link modal (port of CADRE richLinkFlow: text + url in one dialog) ----
    var linkPending = null;   // { editor, range, anchor }

    function safeHref(raw) {
        var url = String(raw || '').trim();
        if (!url) return '';
        if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
        if (/^[a-z][a-z0-9+.\-]*:/i.test(url)) return '';   // javascript:, data:, …
        return url;
    }
    function closestAnchor(ed) {
        var sel = window.getSelection();
        if (!sel.rangeCount) return null;
        var n = sel.getRangeAt(0).commonAncestorContainer;
        if (n.nodeType === 3) n = n.parentNode;
        var a = n && n.closest ? n.closest('a') : null;
        return a && ed.contains(a) ? a : null;
    }
    function openLinkModal(ed) {
        var sel = window.getSelection();
        if (!sel.rangeCount || !ed.contains(sel.anchorNode)) return;
        var anchor = closestAnchor(ed);
        linkPending = { editor: ed, range: sel.getRangeAt(0).cloneRange(), anchor: anchor };
        els.byId('link-modal-text').value = anchor ? (anchor.textContent || '') : sel.toString();
        els.byId('link-modal-url').value = anchor ? (anchor.getAttribute('href') || '') : '';
        els.byId('link-modal-remove').style.display = anchor ? '' : 'none';
        els.byId('link-modal-error').style.display = 'none';
        els.byId('link-modal-overlay').style.display = 'flex';
        var focusUrl = !!els.byId('link-modal-text').value.trim();
        var target = els.byId(focusUrl ? 'link-modal-url' : 'link-modal-text');
        setTimeout(function () { target.focus(); target.select(); }, 30);
    }
    function closeLinkModal() { els.byId('link-modal-overlay').style.display = 'none'; linkPending = null; }
    function restoreLinkSelection() {
        var p = linkPending;
        p.editor.focus();
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(p.range);
        return sel;
    }
    function confirmLinkModal() {
        var p = linkPending;
        if (!p) return;
        var text = els.byId('link-modal-text').value.trim();
        var raw = els.byId('link-modal-url').value.trim();
        if (!raw) { var e1 = els.byId('link-modal-error'); e1.textContent = 'Enter a URL.'; e1.style.display = ''; return; }
        var safe = safeHref(raw);
        if (!safe) { var e2 = els.byId('link-modal-error'); e2.textContent = 'Use an http(s), mailto:, or relative URL.'; e2.style.display = ''; return; }
        restoreLinkSelection();
        if (p.anchor) {
            p.anchor.setAttribute('href', safe);
            var label = text || safe;
            if (label !== p.anchor.textContent) p.anchor.textContent = label;
        } else {
            var lbl = text || safe;
            document.execCommand('insertHTML', false, '<a href="' + esc(safe) + '">' + esc(lbl) + '</a>');
        }
        closeLinkModal();
        scheduleUpdate();
    }
    function removeLinkModal() {
        var p = linkPending;
        if (p && p.anchor) {
            var sel = restoreLinkSelection();
            var r = document.createRange();
            r.selectNodeContents(p.anchor);
            sel.removeAllRanges();
            sel.addRange(r);
            document.execCommand('unlink', false, null);
        }
        closeLinkModal();
        scheduleUpdate();
    }
    function selectionInListItem(ed) {
        var sel = window.getSelection();
        if (!sel.rangeCount) return false;
        var n = sel.getRangeAt(0).commonAncestorContainer;
        if (n.nodeType === 3) n = n.parentNode;
        var li = n && n.closest ? n.closest('li') : null;
        return !!(li && ed.contains(li));
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
        window.EditorQueue.loadProjects().then(function (data) {
            state.project = post.project || '';
            state.allProjects = data.projects || [];
            state.projectMeta = (data.projects || []).find(function (p) { return p.slug === state.project; }) || null;
            // A draft of an already-published post relocates on publish too.
            var published = state.projectMeta && (state.projectMeta.posts || []).some(function (x) { return x.slug === post.slug; });
            if (published) {
                loadedPath = 'content/posts/' + state.project + '/' + post.slug + '.json';
                origProject = state.project; origSlug = post.slug;
            }
            state.slug = post.slug || ''; state.type = post.type || 'blog';
            state.title = post.title || ''; state.date = post.date || todayIso();
            state.excerpt = post.excerpt || ''; state.cover = rec.cover || '';
            state.hidden = !!rec.hidden;
            state.blocks = Array.isArray(post.blocks) ? post.blocks : [];
            slugTouched = true;
            finishLoad();
        }).catch(function (err) { showError(err.message || 'Failed to load'); });
    }

    function init() {
        els.meta = document.getElementById('ed-meta');
        els.blocks = document.getElementById('ed-blocks');
        els.addbar = document.getElementById('ed-addbar');
        els.previewPane = document.getElementById('ed-preview-pane');
        els.previewFrame = document.getElementById('ed-preview-frame');
        els.splitHandle = document.getElementById('ed-split-handle');
        els.toast = document.getElementById('ed-toast');
        els.byId = function (id) { return document.getElementById(id); };

        var params = new URLSearchParams(location.search);
        var draft = params.get('draft');
        if (draft) { loadFromDraft(draft); return; }

        var projectSlug = params.get('project') || '';
        var postSlug = params.get('post') || '';
        var type = params.get('type') || 'blog';

        // Effective projects (committed + anything queued) so newly-created
        // projects and staged post entries are visible here.
        window.EditorQueue.loadProjects().then(function (data) {
            var meta = (data.projects || []).find(function (p) { return p.slug === projectSlug; });
            if (!meta) { showError('Unknown project "' + projectSlug + '"'); return; }
            state.project = projectSlug;
            state.projectMeta = meta;
            state.allProjects = data.projects || [];

            if (postSlug) {
                var postPath = 'content/posts/' + projectSlug + '/' + postSlug + '.json';
                // Prefer a queued (unstaged-to-GitHub) version so pending edits reopen.
                var staged = window.EditorQueue.getStaged(postPath);
                var loadPost = (staged && staged.kind === 'text')
                    ? Promise.resolve(JSON.parse(staged.content))
                    : window.getPost(projectSlug, postSlug);
                return loadPost.then(function (post) {
                    state.slug = post.slug; state.type = post.type || 'blog';
                    state.title = post.title || ''; state.date = post.date || todayIso();
                    state.excerpt = post.excerpt || ''; state.blocks = Array.isArray(post.blocks) ? post.blocks : [];
                    var entry = (meta.posts || []).find(function (p) { return p.slug === postSlug; });
                    state.cover = entry && entry.cover ? entry.cover : '';
                    state.hidden = !!(entry && entry.hidden);
                    slugTouched = true;
                    loadedPath = postPath;
                    origProject = projectSlug; origSlug = postSlug;
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
