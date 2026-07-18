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
    function uploadBtn() { return '<button type="button" class="ed-upload-btn" data-upload title="Upload an image">⬆</button>'; }
    // A path input paired with an inline upload button (upload.js fills the input).
    function srcRow(f, v, ph) { return '<div class="ed-src-row">' + textInput(f, v, ph) + uploadBtn() + '</div>'; }

    var REG = {
        heading: {
            label: 'Heading',
            defaults: function () { return { type: 'heading', level: 2, text: '' }; },
            renderBody: function (b) {
                var opts = [2, 3, 4].map(function (n) { return '<option value="' + n + '"' + (Number(b.level) === n ? ' selected' : '') + '>H' + n + '</option>'; }).join('');
                return field('Heading text', textInput('text', b.text, 'Section heading')) +
                    field('Level', '<select class="ed-input" data-f="level">' + opts + '</select>');
            },
            syncFromDOM: function (b, el) { b.text = val(el, 'text'); b.level = parseInt(val(el, 'level'), 10) || 2; }
        },

        text: {
            label: 'Text',
            defaults: function () { return { type: 'text', html: '' }; },
            renderBody: function (b) {
                var content = window.sanitizeRichHtml(b.html || (b.text ? '<p>' + esc(b.text) + '</p>' : ''));
                return '<div class="rt-wrap">' +
                    '<div class="rt-toolbar">' +
                    '<button type="button" class="rt-btn" data-rt="bold" title="Bold"><b>B</b></button>' +
                    '<button type="button" class="rt-btn" data-rt="italic" title="Italic"><i>I</i></button>' +
                    '<button type="button" class="rt-btn" data-rt="underline" title="Underline"><u>U</u></button>' +
                    '<button type="button" class="rt-btn" data-rt="insertUnorderedList" title="Bulleted list">&bull;</button>' +
                    '<button type="button" class="rt-btn" data-rt="link" title="Insert link">&#128279;</button>' +
                    '</div>' +
                    '<div class="rt-editor" contenteditable="true" data-f="html" data-placeholder="Write here…">' + content + '</div>' +
                    '</div>';
            },
            syncFromDOM: function (b, el) { var ed = el.querySelector('[data-f="html"]'); b.html = ed ? window.sanitizeRichHtml(ed.innerHTML) : ''; }
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
            renderBody: function (b) {
                var rows = (b.items || []).map(function (it, i) {
                    return '<div class="ed-gallery-row">' +
                        '<div class="ed-src-row">' +
                        '<input class="ed-input" data-gf="src" data-i="' + i + '" value="' + esc(it.src) + '" placeholder="images/Project/file.png">' +
                        uploadBtn() +
                        '</div>' +
                        '<input class="ed-input" data-gf="alt" data-i="' + i + '" value="' + esc(it.alt) + '" placeholder="Alt text">' +
                        '<button type="button" class="btn btn-ghost btn-sm" data-gallery-remove="' + i + '" title="Remove">✕</button>' +
                        '</div>';
                }).join('');
                return '<div class="ed-gallery">' + rows + '</div>' +
                    '<button type="button" class="btn btn-ghost btn-sm" data-gallery-add>+ Add image</button>';
            },
            syncFromDOM: function (b, el) {
                var items = [];
                el.querySelectorAll('[data-gf="src"]').forEach(function (srcEl) {
                    var i = srcEl.dataset.i;
                    var altEl = el.querySelector('[data-gf="alt"][data-i="' + i + '"]');
                    items[Number(i)] = { src: srcEl.value, alt: altEl ? altEl.value : '' };
                });
                b.items = items.filter(Boolean);
            }
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
    window.EDBLOCK_ORDER = ['heading', 'text', 'bullets', 'image', 'gallery', 'video', 'embed', 'quote', 'divider'];
})();
