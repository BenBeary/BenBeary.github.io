/* media.js, derived-media URL resolution, lazy images, click-to-play video, and
   the shared lightbox. Reads only original `images/…` paths from content JSON and
   maps them to the derivatives produced by tools/optimize-media.mjs.

   Path transform (see ARCHITECTURE): images/X/y.ext -> images/_derived/X/y.<kind> - insert "_derived/" after the leading "images/", strip the source extension,
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

    // ---- Slideshow (Steam-style stage + thumb strip; mixed png/jpg/gif/mp4) --
    // Used by BOTH the slideshow post block (blocks.js) and the project hub's
    // project.media. Video thumbs use the derived .poster.webp (no black frames);
    // gifs animate in the stage (original file) but use their derived still as
    // the thumb. Image stages open the lightbox (images only).
    var isVid = function (s) { return /\.mp4$/i.test(s || ''); };
    var isGif = function (s) { return /\.gif$/i.test(s || ''); };

    // Auto-advance timing. Stills get a flat dwell; videos advance when they end;
    // gifs advance after two full loops (see gifDurationMs below).
    var FADE_MS = 350;            // slide cross-fade, matches the CSS transition
    var AUTO_STILL_MS = 5000;
    var GIF_FALLBACK_MS = 6000;   // used when a gif's frame delays can't be read
    // Safety valve: a very long gif (e.g. a minutes-long screen capture) would
    // otherwise park the slideshow for its whole run twice over. Every gif
    // currently in the content is well under this, so they all get both loops.
    var MAX_SLIDE_MS = 20000;
    var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // Total animation length of a GIF, by summing the frame delays in its
    // Graphic Control Extension blocks (21 F9 04 <packed> <delay lo> <delay hi>).
    // Delays are in 1/100s; browsers render 0 and 1 as 100ms, so clamp to match.
    // Resolves to 0 if the file can't be read or isn't animated.
    var gifDurationCache = {};
    function gifDurationMs(url) {
        if (gifDurationCache[url]) return gifDurationCache[url];
        gifDurationCache[url] = fetch(url).then(function (r) {
            if (!r.ok) throw new Error('gif fetch ' + r.status);
            return r.arrayBuffer();
        }).then(function (buf) {
            var b = new Uint8Array(buf), total = 0, i = 0;
            while (i < b.length - 8) {
                if (b[i] === 0x21 && b[i + 1] === 0xF9 && b[i + 2] === 0x04) {
                    var d = b[i + 4] | (b[i + 5] << 8);
                    total += (d <= 1 ? 10 : d) * 10;
                    i += 8;
                } else { i++; }
            }
            return total;
        }).catch(function () { return 0; });
        return gifDurationCache[url];
    }

    window.makeSlideshow = function (container, items) {
        items = (items || []).filter(function (i) { return i && i.src; });
        if (!items.length) return null;
        var idx = 0;
        var imageItems = items.filter(function (i) { return !isVid(i.src); });

        // Auto-advance state. `gen` invalidates async work (gif measuring, video
        // events) belonging to a slide that has already been replaced.
        var gen = 0, timer = null;
        var onScreen = false, hovering = false, pendingAdvance = false;
        var stageVideo = null;

        function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
        function canAuto() { return items.length > 1 && onScreen && !hovering && !REDUCED_MOTION; }
        function schedule(ms, token) {
            clearTimer();
            if (!canAuto()) return;
            timer = setTimeout(function () { if (token === gen) go(idx + 1); }, ms);
        }

        // Decide how long the CURRENT slide should stay up. Called on render and
        // again whenever the show becomes eligible to advance (scrolled into
        // view, pointer left), so a slide that was measured while off-screen
        // still gets its timer once it matters.
        function scheduleForCurrent() {
            var token = gen;
            var item = items[idx];
            clearTimer();
            if (!canAuto()) return;
            if (isVid(item.src)) {
                // Driven by the video's own 'ended' event; if it already ended
                // while we were paused/off-screen, move on now.
                if (pendingAdvance) { pendingAdvance = false; go(idx + 1); }
                return;
            }
            if (isGif(item.src)) {
                gifDurationMs(encodeURI(ROOT + item.src)).then(function (d) {
                    if (token !== gen) return;
                    var wait = d > 0 ? d * 2 : GIF_FALLBACK_MS;         // at least two loops
                    schedule(Math.min(wait, MAX_SLIDE_MS), token);
                });
                return;
            }
            schedule(AUTO_STILL_MS, token);
        }

        function playVideo(v) {
            var p = v.play();
            if (p && p.catch) {
                var token = gen;
                p.catch(function () { if (token === gen) schedule(AUTO_STILL_MS, token); });
            }
        }

        var root = document.createElement('div');
        root.className = 'pshow';
        root.innerHTML =
            '<div class="pshow__stagewrap">' +
            '<button class="pshow__arrow pshow__arrow--prev" aria-label="Previous">❮</button>' +
            '<div class="pshow__stage"></div>' +
            '<button class="pshow__arrow pshow__arrow--next" aria-label="Next">❯</button>' +
            '</div><div class="pshow__thumbs"></div>';
        var stage = root.querySelector('.pshow__stage');
        var thumbs = root.querySelector('.pshow__thumbs');

        function renderStage() {
            gen++;
            var token = gen;
            var item = items[idx];
            clearTimer();
            pendingAdvance = false;
            if (stageVideo) { try { stageVideo.pause(); } catch (_) {} stageVideo = null; }

            // Each slide is its own layer stacked on the stage, so the outgoing
            // and incoming ones can cross-fade instead of the stage blanking and
            // snapping to the next image.
            var slide = document.createElement('div');
            slide.className = 'pshow__slide';

            if (isVid(item.src)) {
                // Muted autoplay (the only kind browsers allow unprompted).
                // Controls stay on so the clip can be unmuted or scrubbed.
                var v = document.createElement('video');
                v.className = 'pshow__video';
                v.muted = true; v.defaultMuted = true; v.playsInline = true;
                // 'metadata', not 'auto': these clips are tens of MB, and the
                // browser must not prefetch one just because its slide exists.
                // play() streams it when the slide is actually active and visible.
                v.controls = true; v.preload = 'metadata'; v.loop = false;
                v.setAttribute('muted', '');            // Safari needs the attribute too
                v.setAttribute('playsinline', '');
                v.poster = window.posterUrl(item.src);
                var s1 = document.createElement('source'); s1.src = window.optVideoUrl(item.src); s1.type = 'video/mp4';
                var s2 = document.createElement('source'); s2.src = originalUrl(item.src); s2.type = 'video/mp4';
                v.appendChild(s1); v.appendChild(s2);
                // Advance only once the clip has finished playing.
                v.addEventListener('ended', function () {
                    if (token !== gen) return;
                    if (canAuto()) go(idx + 1); else pendingAdvance = true;
                });
                v.addEventListener('error', function () { if (token === gen) schedule(AUTO_STILL_MS, token); }, true);
                slide.appendChild(v);
                stageVideo = v;
                if (onScreen) playVideo(v);
            } else {
                var img = document.createElement('img');
                img.className = 'pshow__img';
                if (isGif(item.src)) {              // animate: serve the original gif
                    img.loading = 'lazy'; img.decoding = 'async';
                    img.src = encodeURI(ROOT + item.src);
                } else {
                    window.setImg(img, item.src, 'md');
                }
                img.alt = item.alt || '';
                img.addEventListener('click', function () {
                    window.openLightbox(imageItems, imageItems.indexOf(item));
                });
                slide.appendChild(img);
            }

            // Cross-fade: the new layer starts transparent, goes opaque next
            // frame while the outgoing layers fade out, then they're dropped.
            // The incoming layer goes on top (appended last) and fades in over
            // the outgoing ones, which fade out beneath it.
            var previous = Array.prototype.slice.call(stage.children);
            if (REDUCED_MOTION) {
                previous.forEach(function (el) { el.remove(); });
                stage.appendChild(slide);
            } else {
                slide.classList.add('is-entering');
                stage.appendChild(slide);
                previous.forEach(function (el) {
                    el.classList.remove('is-entering');
                    el.classList.add('is-leaving');
                });
                // Drop the faded-out layers. Guarded by the token: without it, a
                // sweep queued by an earlier render would delete the slide a
                // later render just put up.
                setTimeout(function () {
                    if (token !== gen) return;
                    Array.prototype.slice.call(stage.children).forEach(function (el) {
                        if (el !== slide) el.remove();
                    });
                    slide.classList.remove('is-entering');
                }, FADE_MS + 80);
            }

            Array.prototype.forEach.call(thumbs.children, function (t, i) {
                t.classList.toggle('is-active', i === idx);
            });
            scheduleForCurrent();
        }
        function go(i) { idx = (i + items.length) % items.length; renderStage(); }

        items.forEach(function (item, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'pshow__thumb';
            b.setAttribute('aria-label', 'Slide ' + (i + 1));
            var t = document.createElement('img');
            t.loading = 'lazy'; t.decoding = 'async'; t.alt = '';
            if (isVid(item.src)) {
                t.src = window.posterUrl(item.src);
                t.onerror = function () { t.onerror = null; t.style.visibility = 'hidden'; };
                var play = document.createElement('span');
                play.className = 'pshow__thumb-play';
                play.setAttribute('aria-hidden', 'true');
                play.textContent = '▶';
                b.appendChild(t); b.appendChild(play);
            } else {
                window.setImg(t, item.src, 'thumb');
                b.appendChild(t);
            }
            b.addEventListener('click', function () { go(i); });
            thumbs.appendChild(b);
        });

        root.querySelector('.pshow__arrow--prev').addEventListener('click', function () { go(idx - 1); });
        root.querySelector('.pshow__arrow--next').addEventListener('click', function () { go(idx + 1); });

        // Hovering holds the current slide so it can't slide out from under you.
        // (A playing video keeps playing; it just won't hand over when it ends.)
        root.addEventListener('mouseenter', function () { hovering = true; clearTimer(); });
        root.addEventListener('mouseleave', function () { hovering = false; scheduleForCurrent(); });

        // Only run while the show is actually on screen: off-screen shows stop
        // advancing and pause their video instead of playing to nobody.
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    onScreen = e.isIntersecting;
                    if (onScreen) {
                        if (stageVideo && stageVideo.paused) playVideo(stageVideo);
                        scheduleForCurrent();
                    } else {
                        clearTimer();
                        if (stageVideo) { try { stageVideo.pause(); } catch (_) {} }
                    }
                });
            }, { threshold: 0.35 });
            io.observe(root);
        } else {
            onScreen = true;   // no observer support: behave as if always visible
        }

        // A backgrounded tab shouldn't burn through slides.
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { clearTimer(); if (stageVideo) { try { stageVideo.pause(); } catch (_) {} } }
            else if (onScreen) { if (stageVideo && stageVideo.paused) playVideo(stageVideo); scheduleForCurrent(); }
        });

        renderStage();
        container.appendChild(root);
        return root;
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
