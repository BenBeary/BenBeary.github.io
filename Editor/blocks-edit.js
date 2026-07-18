/* blocks-edit.js — the editor-side block registry. One entry per block type
   with { label, defaults(), renderBody(b), syncFromDOM(b, el) }. The SITE renders
   these same block objects via ../js/site/blocks.js, so the live preview equals
   production. Rich text uses the shared sanitizeRichHtml (richtext-sanitize.js).

   Exposes window.EDBLOCKS (registry) and window.EDBLOCK_ORDER (add-button order). */

(function () {
    'use strict';

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function val(el, f) { var x = el.querySelector('[data-f="' + f + '"]'); return x ? x.value : ''; }

    function field(label, inner) { return '<div class="ed-field"><label>' + label + '</label>' + inner + '</div>'; }
    function textInput(f, v, ph) { return '<input class="ed-input" data-f="' + f + '" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '">'; }
    // Sanitize + wrap top-level loose inline runs in <p> (split at <br>) so
    // execCommand list/alignment act per-line — port of CADRE richWrapLooseLines.
    window.edNormalizeRich = function (html) {
        var root = document.createElement('div');
        root.innerHTML = window.sanitizeRichHtml(html || '');
        var p = null;
        Array.prototype.slice.call(root.childNodes).forEach(function (node) {
            var tag = node.nodeType === 1 ? node.tagName : '';
            if (tag === 'P' || tag === 'UL' || tag === 'OL') { p = null; return; }
            if (tag === 'BR') { root.removeChild(node); p = null; return; }
            if (node.nodeType === 3 && !node.textContent.trim() && !p) { root.removeChild(node); return; }
            if (!p) { p = document.createElement('p'); root.insertBefore(p, node); }
            p.appendChild(node);
        });
        return root.innerHTML;
    };

    // Shared media-row markup for gallery + slideshow items (browse/upload wired
    // by editor.js; sync reads data-gf pairs inside the block element).
    function mediaRows(b, accept) {
        var rows = (b.items || []).map(function (it, i) {
            return '<div class="ed-gallery-row">' +
                '<div class="ed-src-row">' +
                '<input class="ed-input" data-gf="src" data-i="' + i + '" value="' + esc(it.src) + '" placeholder="' + accept + '">' +
                browseBtn() + uploadBtn() +
                '</div>' +
                '<input class="ed-input" data-gf="alt" data-i="' + i + '" value="' + esc(it.alt) + '" placeholder="Alt text">' +
                '<button type="button" class="btn btn-ghost btn-sm" data-gallery-remove="' + i + '" title="Remove">✕</button>' +
                '</div>';
        }).join('');
        return '<div class="ed-gallery">' + rows + '</div>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-gallery-add>+ Add item</button>';
    }
    function mediaSync(b, el) {
        var items = [];
        el.querySelectorAll('[data-gf="src"]').forEach(function (srcEl) {
            var i = srcEl.dataset.i;
            var altEl = el.querySelector('[data-gf="alt"][data-i="' + i + '"]');
            items[Number(i)] = { src: srcEl.value, alt: altEl ? altEl.value : '' };
        });
        b.items = items.filter(Boolean);
    }

    function uploadBtn() { return '<button type="button" class="ed-upload-btn" data-upload title="Upload an image">⬆</button>'; }
    function browseBtn() { return '<button type="button" class="ed-upload-btn" data-browse title="Browse repo images">🔍</button>'; }
    // A path input paired with inline browse (pick existing) + upload (new) buttons.
    function srcRow(f, v, ph) { return '<div class="ed-src-row">' + textInput(f, v, ph) + browseBtn() + uploadBtn() + '</div>'; }

    var REG = {
        heading: {
            label: 'Heading',
            defaults: function () { return { type: 'heading', level: 2, text: '' }; },
            renderBody: function (b) {
                // One-line row: text input + compact level select (CADRE style).
                var opts = [2, 3, 4].map(function (n) { return '<option value="' + n + '"' + (Number(b.level) === n ? ' selected' : '') + '>H' + n + '</option>'; }).join('');
                return '<div class="ed-heading-row">' +
                    textInput('text', b.text, 'Section heading…') +
                    '<select class="ed-input ed-heading-level" data-f="level" title="Heading level" aria-label="Heading level">' + opts + '</select>' +
                    '</div>';
            },
            syncFromDOM: function (b, el) { b.text = val(el, 'text'); b.level = parseInt(val(el, 'level'), 10) || 2; }
        },

        text: {
            label: 'Paragraph',
            defaults: function () { return { type: 'text', html: '' }; },
            renderBody: function (b) {
                // CADRE-style toolbar: B/I/U · link (modal) · align L/C/R · bullet
                // list. Content is re-sanitized + loose lines wrapped in <p> so
                // alignment/list commands act on one line, not the whole editor.
                var content = window.edNormalizeRich(b.html || (b.text ? '<p>' + esc(b.text) + '</p>' : ''));
                function btn(cmd, title, inner) { return '<button type="button" class="rt-btn" data-rt="' + cmd + '" title="' + title + '">' + inner + '</button>'; }
                var sep = '<span class="rt-sep" aria-hidden="true"></span>';
                return '<div class="rt-wrap">' +
                    '<div class="rt-toolbar" role="toolbar" aria-label="Text formatting">' +
                    btn('bold', 'Bold (Ctrl+B)', '<b>B</b>') +
                    btn('italic', 'Italic (Ctrl+I)', '<i>I</i>') +
                    btn('underline', 'Underline (Ctrl+U)', '<u>U</u>') +
                    sep +
                    btn('link', 'Insert link (Ctrl+K)', '&#128279;') +
                    sep +
                    btn('justifyLeft', 'Align left', '⇤') +
                    btn('justifyCenter', 'Align center', '↔') +
                    btn('justifyRight', 'Align right', '⇥') +
                    sep +
                    btn('insertUnorderedList', 'Bulleted list (Tab indents)', '&bull;≡') +
                    '</div>' +
                    '<div class="rt-editor" contenteditable="true" data-f="html" data-placeholder="Write your paragraph here…">' + content + '</div>' +
                    '</div>';
            },
            syncFromDOM: function (b, el) {
                var ed = el.querySelector('[data-f="html"]');
                if (!ed) return;
                var clean = window.sanitizeRichHtml(ed.innerHTML);
                var probe = document.createElement('div'); probe.innerHTML = clean;
                b.html = probe.textContent.trim() ? clean : '';
            }
        },

        bullets: {
            label: 'Bullets',
            defaults: function () { return { type: 'bullets', items: [] }; },
            renderBody: function (b) {
                return field('Bullets (one per line)', '<textarea class="ed-input" data-f="items" rows="4" placeholder="One bullet per line">' + esc((b.items || []).join('\n')) + '</textarea>');
            },
            syncFromDOM: function (b, el) {
                b.items = val(el, 'items').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
            }
        },

        image: {
            label: 'Image',
            defaults: function () { return { type: 'image', src: '', alt: '', caption: '' }; },
            renderBody: function (b) {
                return field('Image path', srcRow('src', b.src, 'images/Project/file.png')) +
                    field('Alt text', textInput('alt', b.alt, 'Describe the image')) +
                    field('Caption (optional)', textInput('caption', b.caption, ''));
            },
            syncFromDOM: function (b, el) { b.src = val(el, 'src'); b.alt = val(el, 'alt'); b.caption = val(el, 'caption'); }
        },

        gallery: {
            label: 'Gallery',
            defaults: function () { return { type: 'gallery', items: [{ src: '', alt: '' }] }; },
            renderBody: function (b) { return mediaRows(b, 'images/Blog Images/Project/file.png'); },
            syncFromDOM: mediaSync
        },

        slideshow: {
            label: 'Slideshow',
            defaults: function () { return { type: 'slideshow', items: [{ src: '', alt: '' }] }; },
            renderBody: function (b) {
                return '<p class="ed-block-hint">Steam-style slideshow — mix png / jpg / gif / mp4. Video slides get their thumbnail from the generated poster automatically.</p>' +
                    mediaRows(b, 'images/Blog Images/Project/file-or-clip.mp4');
            },
            syncFromDOM: mediaSync
        },

        video: {
            label: 'Video',
            defaults: function () { return { type: 'video', src: '', caption: '' }; },
            renderBody: function (b) {
                return field('Video path (.mp4)', textInput('src', b.src, 'images/Project/clip.mp4')) +
                    field('Caption (optional)', textInput('caption', b.caption, ''));
            },
            syncFromDOM: function (b, el) { b.src = val(el, 'src'); b.caption = val(el, 'caption'); }
        },

        embed: {
            label: 'YouTube',
            defaults: function () { return { type: 'embed', provider: 'youtube', url: '', title: '' }; },
            renderBody: function (b) {
                return field('YouTube URL', textInput('url', b.url, 'https://www.youtube.com/watch?v=…')) +
                    field('Title (for accessibility)', textInput('title', b.title, ''));
            },
            syncFromDOM: function (b, el) { b.provider = 'youtube'; b.url = val(el, 'url'); b.title = val(el, 'title'); }
        },

        quote: {
            label: 'Quote',
            defaults: function () { return { type: 'quote', text: '', cite: '' }; },
            renderBody: function (b) {
                return field('Quote', '<textarea class="ed-input" data-f="text" rows="2">' + esc(b.text) + '</textarea>') +
                    field('Citation (optional)', textInput('cite', b.cite, ''));
            },
            syncFromDOM: function (b, el) { b.text = val(el, 'text'); b.cite = val(el, 'cite'); }
        },

        divider: {
            label: 'Divider',
            defaults: function () { return { type: 'divider' }; },
            renderBody: function () { return '<p class="ed-empty">Horizontal rule — no options.</p>'; },
            syncFromDOM: function () { }
        }
    };

    window.EDBLOCKS = REG;
    // NOTE: 'bullets' is intentionally NOT in the add bar (paragraph lists
    // replaced it) but stays in REG so migrated posts remain editable.
    window.EDBLOCK_ORDER = ['heading', 'text', 'image', 'slideshow', 'gallery', 'video', 'embed', 'quote', 'divider'];
})();
