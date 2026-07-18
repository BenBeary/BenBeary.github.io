/* media.js — derived-media URL resolution, lazy images, click-to-play video, and
   the shared lightbox. Reads only original `images/…` paths from content JSON and
   maps them to the derivatives produced by tools/optimize-media.mjs.

   Path transform (see ARCHITECTURE): images/X/y.ext -> images/_derived/X/y.<kind>
   — insert "_derived/" after the leading "images/", strip the source extension,
   append the kind suffix. Everything is encodeURI'd (filenames contain spaces).
   A body[data-root] prefix ('' at site root, '../' under Editor/) lets the same
   code work in the editor preview.

   Globals: thumbUrl, mediumUrl, posterUrl, optVideoUrl, setImg, makeVideo,
   openLightbox. */

(function () {
    'use strict';

    var ROOT = (document.body && document.body.dataset.root) || '';

    function derivedBase(src) {
        var noExt = String(src || '').replace(/\.[^./]+$/, '');
        return noExt.replace(/^images\//, 'images/_derived/');
    }
    function enc(p) { return encodeURI(ROOT + p); }

    window.thumbUrl = function (src) { return enc(derivedBase(src) + '.thumb.webp'); };
    window.mediumUrl = function (src) { return enc(derivedBase(src) + '.md.webp'); };
    window.posterUrl = function (src) { return enc(derivedBase(src) + '.poster.webp'); };
    window.optVideoUrl = function (src) { return enc(derivedBase(src) + '.opt.mp4'); };
    function originalUrl(src) { return enc(String(src || '')); }

    // Set a lazy <img> to a derived kind ('thumb'|'md'); fall back to the encoded
    // original if the derivative is missing (freshly uploaded, pipeline not re-run).
    window.setImg = function (img, src, kind) {
        var derived = kind === 'md' ? window.mediumUrl(src) : window.thumbUrl(src);
        var original = originalUrl(src);
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = function () { img.onerror = null; img.src = original; };
        img.src = derived;
    };

    // Poster + play button; on click swaps in a real <video preload="none"> that
    // prefers the optimized mp4 and falls back to the original via <source> order.
    window.makeVideo = function (container, src, caption) {
        var fig = document.createElement('figure');
        fig.className = 'post-video';

        var btn = document.createElement('button');
        btn.className = 'post-video__play';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Play video');

        var poster = document.createElement('img');
        poster.className = 'post-video__poster';
        poster.loading = 'lazy';
        poster.decoding = 'async';
        poster.alt = caption || '';
        poster.src = window.posterUrl(src);
        poster.onerror = function () { poster.onerror = null; poster.style.visibility = 'hidden'; };

        var icon = document.createElement('span');
        icon.className = 'post-video__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '▶';

        btn.appendChild(poster);
        btn.appendChild(icon);
        fig.appendChild(btn);

        if (caption) {
            var cap = document.createElement('figcaption');
            cap.className = 'post-figcaption';
            cap.textContent = caption;
            fig.appendChild(cap);
        }

        btn.addEventListener('click', function () {
            var video = document.createElement('video');
            video.className = 'post-video__player';
            video.controls = true;
            video.autoplay = true;
            video.preload = 'none';
            video.playsInline = true;
            // Prefer the optimized mp4, fall back to the original on load error.
            var s1 = document.createElement('source'); s1.src = window.optVideoUrl(src); s1.type = 'video/mp4';
            var s2 = document.createElement('source'); s2.src = originalUrl(src); s2.type = 'video/mp4';
            video.appendChild(s1);
            video.appendChild(s2);
            fig.replaceChild(video, btn);
            video.load();
        });

        container.appendChild(fig);
        return fig;
    };

    // ---- Lightbox (singleton; originals loaded on open only) ----------------
    var lb = null, lbItems = [], lbIndex = 0;

    function buildLightbox() {
        lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        lb.innerHTML =
            '<button class="lightbox__close" aria-label="Close">✕</button>' +
            '<button class="lightbox__nav lightbox__prev" aria-label="Previous">❮</button>' +
            '<figure class="lightbox__stage"><img class="lightbox__img" alt=""><figcaption class="lightbox__cap"></figcaption></figure>' +
            '<button class="lightbox__nav lightbox__next" aria-label="Next">❯</button>';
        document.body.appendChild(lb);

        lb.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
        lb.querySelector('.lightbox__prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
        lb.querySelector('.lightbox__next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
        lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
        document.addEventListener('keydown', function (e) {
            if (!lb || !lb.classList.contains('is-open')) return;
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') step(-1);
            else if (e.key === 'ArrowRight') step(1);
        });
    }

    function showCurrent() {
        var item = lbItems[lbIndex];
        if (!item) return;
        var img = lb.querySelector('.lightbox__img');
        var cap = lb.querySelector('.lightbox__cap');
        img.src = originalUrl(item.src);       // full-res original, only now
        img.alt = item.alt || '';
        cap.textContent = item.caption || item.alt || '';
        cap.style.display = cap.textContent ? '' : 'none';
        var multi = lbItems.length > 1;
        lb.querySelector('.lightbox__prev').style.display = multi ? '' : 'none';
        lb.querySelector('.lightbox__next').style.display = multi ? '' : 'none';
    }
    function step(d) { lbIndex = (lbIndex + d + lbItems.length) % lbItems.length; showCurrent(); }
    function closeLightbox() {
        if (!lb) return;
        lb.classList.remove('is-open');
        document.body.classList.remove('lightbox-open');
        lb.querySelector('.lightbox__img').src = '';   // release the big image
    }

    window.openLightbox = function (items, startIndex) {
        lbItems = (items || []).filter(function (i) { return i && i.src; });
        if (!lbItems.length) return;
        lbIndex = Math.min(Math.max(startIndex || 0, 0), lbItems.length - 1);
        if (!lb) buildLightbox();
        showCurrent();
        lb.classList.add('is-open');
        document.body.classList.add('lightbox-open');
    };
})();
