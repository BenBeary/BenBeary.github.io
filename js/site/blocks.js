/* blocks.js — THE post-body renderer. Turns a post's `blocks` array into DOM.
   Shared by the site (post.html) and the editor's live preview (M5) so the two
   never drift. Depends on media.js (setImg / makeVideo / openLightbox) and
   richtext-sanitize.js (sanitizeRichHtml). Exposes global renderBlocks().

   Block types (see ARCHITECTURE): heading, text, bullets, image, gallery, video,
   embed (youtube), quote, divider. Unknown types are skipped. */

(function () {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function youtubeId(url) {
        var m = String(url || '').match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
        return m ? m[1] : '';
    }

    function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

    function figureImage(src, alt, caption, lightboxItems, index) {
        var fig = el('figure', 'post-figure');
        var img = el('img', 'post-image');
        window.setImg(img, src, 'md');
        img.alt = alt || '';
        if (lightboxItems) {
            img.tabIndex = 0;
            img.setAttribute('role', 'button');
            var open = function () { window.openLightbox(lightboxItems, index || 0); };
            img.addEventListener('click', open);
            img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        }
        fig.appendChild(img);
        if (caption) { var c = el('figcaption', 'post-figcaption'); c.textContent = caption; fig.appendChild(c); }
        return fig;
    }

    var RENDERERS = {
        heading: function (b) {
            var lvl = Math.min(Math.max(parseInt(b.level, 10) || 2, 2), 4);
            var h = el('h' + lvl, 'post-heading');
            h.textContent = b.text || '';
            return h;
        },
        text: function (b) {
            var d = el('div', 'post-text');
            d.innerHTML = window.sanitizeRichHtml(b.html || (b.text ? '<p>' + esc(b.text) + '</p>' : ''));
            return d;
        },
        bullets: function (b) {
            var ul = el('ul', 'post-bullets');
            (b.items || []).forEach(function (it) { var li = document.createElement('li'); li.textContent = it; ul.appendChild(li); });
            return ul;
        },
        image: function (b) {
            return figureImage(b.src, b.alt, b.caption, [{ src: b.src, alt: b.alt, caption: b.caption }], 0);
        },
        gallery: function (b) {
            var items = (b.items || []).filter(function (i) { return i && i.src; });
            var grid = el('div', 'post-gallery');
            items.forEach(function (it, i) {
                var btn = el('button', 'post-gallery__item');
                btn.type = 'button';
                var img = el('img', 'post-gallery__img');
                window.setImg(img, it.src, 'thumb');
                img.alt = it.alt || '';
                btn.appendChild(img);
                btn.addEventListener('click', function () { window.openLightbox(items, i); });
                grid.appendChild(btn);
            });
            return grid;
        },
        slideshow: function (b) {
            var holder = el('div', 'post-slideshow');
            window.makeSlideshow(holder, b.items || []);
            return holder.firstChild ? holder : null;
        },
        video: function (b) {
            var holder = el('div', 'post-video-holder');
            window.makeVideo(holder, b.src, b.caption || '');
            return holder;
        },
        embed: function (b) {
            if (b.provider === 'youtube') {
                var id = youtubeId(b.url);
                if (!id) return null;
                var wrap = el('div', 'post-embed');
                var iframe = document.createElement('iframe');
                iframe.src = 'https://www.youtube.com/embed/' + id;
                iframe.title = b.title || 'Embedded video';
                iframe.loading = 'lazy';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                iframe.setAttribute('allowfullscreen', '');
                wrap.appendChild(iframe);
                return wrap;
            }
            return null;
        },
        quote: function (b) {
            var q = el('blockquote', 'post-quote');
            var p = document.createElement('p'); p.textContent = b.text || ''; q.appendChild(p);
            if (b.cite) { var c = el('cite', 'post-quote__cite'); c.textContent = b.cite; q.appendChild(c); }
            return q;
        },
        divider: function () { return el('hr', 'post-divider'); }
    };

    window.renderBlocks = function (blocks, container) {
        container.innerHTML = '';
        (blocks || []).forEach(function (b) {
            var fn = RENDERERS[b && b.type];
            if (!fn) return;
            var node = fn(b);
            if (node) container.appendChild(node);
        });
    };
})();
