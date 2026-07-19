/* upload.js, image/video upload to the repo.

   Uploading also GENERATES THE DERIVATIVES in the browser and commits them
   alongside the original, so anything added through the editor is served the
   same optimised way as media processed by tools/optimize-media.mjs. Without
   this, an editor-uploaded image has no _derived files, every request for its
   .thumb.webp / .md.webp 404s, and the site quietly falls back to the full-size
   original (js/site/media.js setImg onerror).

   Sizes and quality mirror the node pipeline so both paths agree:
       .thumb.webp  width 480,  q0.70
       .md.webp     width 1280, q0.78
       .poster.webp width 1280, q0.78   (a frame from an uploaded mp4)
   Images are never enlarged, and EXIF orientation is honoured (the equivalent of
   sharp's .rotate()). Animated GIFs derive from their first frame, as sharp does;
   the animated original is what the slideshow stage actually plays.

   The original plus its derivatives go up in ONE ghBatchCommit, so a half-done
   upload can't leave an image without its derivatives. Uploads stay immediate
   rather than joining the change queue, because binary can't live in localStorage.

   Exposes window.EditorUpload.{ uploadImage(folder,file)->path, pickAndUpload(folder,cb) }.
   Requires auth.js + github-api.js. Load after github-api.js, before editor.js. */

(function () {
    'use strict';

    var THUMB_W = 480, THUMB_Q = 0.70;
    var MD_W = 1280, MD_Q = 0.78;
    var POSTER_W = 1280, POSTER_Q = 0.78;

    function sanitizeName(name) { return String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-'); }

    // images/X/y.png -> images/_derived/X/y   (same transform as js/site/media.js)
    function derivedBase(path) {
        return path.replace(/\.[^./]+$/, '').replace(/^images\//, 'images/_derived/');
    }

    function readAsBase64(blob) {
        return new Promise(function (resolve, reject) {
            var r = new FileReader();
            r.onload = function () { resolve(String(r.result).split(',')[1]); };
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
    }

    // Does this browser actually encode webp from a canvas?
    var webpOk = (function () {
        try {
            var c = document.createElement('canvas');
            c.width = c.height = 1;
            return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch (_) { return false; }
    })();

    // Synchronous on purpose: toDataURL hands back base64 directly, which is what
    // the commit needs, and avoids toBlob's callback (which also never fires in a
    // headless render, making this impossible to test).
    function toWebpBase64(canvas, quality) {
        var url = canvas.toDataURL('image/webp', quality);
        if (url.indexOf('data:image/webp') !== 0) throw new Error('this browser did not encode webp');
        return url.split(',')[1];
    }

    // Draw `source` scaled to `targetW` wide, preserving aspect and never enlarging.
    function drawScaled(source, srcW, srcH, targetW) {
        var w = Math.max(1, Math.min(targetW, srcW));
        var h = Math.max(1, Math.round(srcH * (w / srcW)));
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, 0, 0, w, h);
        return canvas;
    }

    function withTimeout(promise, ms, label) {
        return Promise.race([
            Promise.resolve(promise),
            new Promise(function (_, reject) {
                setTimeout(function () { reject(new Error(label + ' timed out')); }, ms);
            })
        ]);
    }

    function imgDecode(file) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('could not decode the image')); };
            img.src = url;
        });
    }

    async function decode(file) {
        // createImageBitmap applies EXIF orientation when asked, so portraits
        // don't come out sideways in the derivatives. It is RACED against a
        // timeout because it can hang without ever rejecting (it does exactly
        // that in a headless render), which would otherwise wedge the upload
        // with no error. <img> decoding is auto-oriented too, so the fallback
        // produces the same result.
        if (typeof createImageBitmap === 'function') {
            try { return await withTimeout(createImageBitmap(file, { imageOrientation: 'from-image' }), 5000, 'createImageBitmap'); }
            catch (_) { /* fall through to the <img> path */ }
        }
        return await imgDecode(file);
    }

    async function imageDerivatives(path, file) {
        var src = await decode(file);
        var w = src.width || src.naturalWidth;
        var h = src.height || src.naturalHeight;
        try {
            var base = derivedBase(path);
            return [
                { path: base + '.thumb.webp', base64: toWebpBase64(drawScaled(src, w, h, THUMB_W), THUMB_Q) },
                { path: base + '.md.webp', base64: toWebpBase64(drawScaled(src, w, h, MD_W), MD_Q) }
            ];
        } finally { if (src && src.close) src.close(); }
    }

    // Grab a frame ~1s in (or the midpoint of a very short clip) for the poster
    // the slideshow uses as a video thumbnail.
    function videoPoster(path, file) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var video = document.createElement('video');
            var settled = false;
            function cleanup() { URL.revokeObjectURL(url); }
            function fail(err) { if (!settled) { settled = true; cleanup(); reject(err); } }

            video.muted = true; video.playsInline = true; video.preload = 'auto';
            video.addEventListener('error', function () { fail(new Error('could not read the video')); });
            video.addEventListener('loadeddata', function () {
                var t = isFinite(video.duration) && video.duration > 1 ? 1 : (video.duration || 0) / 2;
                try { video.currentTime = t; } catch (_) { fail(new Error('could not seek the video')); }
            });
            video.addEventListener('seeked', function () {
                if (settled) return;
                try {
                    var b64 = toWebpBase64(drawScaled(video, video.videoWidth, video.videoHeight, POSTER_W), POSTER_Q);
                    settled = true; cleanup();
                    resolve([{ path: derivedBase(path) + '.poster.webp', base64: b64 }]);
                } catch (err) { fail(err); }
            });
            setTimeout(function () { fail(new Error('timed out making the poster')); }, 20000);
            video.src = url;
        });
    }

    // Upload `file` to <folder>/<name> together with its derivatives.
    // Returns the repo-relative path of the ORIGINAL (what content JSON stores).
    async function uploadImage(folder, file) {
        if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
            if (typeof openAuthModal === 'function') openAuthModal();
            throw new Error('Sign in to upload images.');
        }
        var isVideo = /^video\/mp4$/.test(file.type) || /\.mp4$/i.test(file.name);
        if (!/^image\//.test(file.type) && !isVideo) throw new Error('That file is not an image or mp4.');

        var limitMb = isVideo ? 40 : 4;
        if (file.size > limitMb * 1024 * 1024) {
            var mb = (file.size / 1024 / 1024).toFixed(1);
            if (!confirm('This file is ' + mb + ' MB (over ' + limitMb + ' MB). Large files slow the site and bloat the repo. Upload anyway?')) {
                throw new Error('cancelled');
            }
        }

        var path = folder.replace(/\/+$/, '') + '/' + sanitizeName(file.name);
        var changes = [{ op: 'putB64', path: path, base64: await readAsBase64(file) }];

        // Derivatives are best-effort: if the browser can't encode them the
        // upload still succeeds, and re-running tools/optimize-media.mjs fills
        // the gap. Better a working upload than a blocked one.
        var derived = [];
        if (webpOk) {
            try {
                derived = isVideo ? await videoPoster(path, file) : await imageDerivatives(path, file);
            } catch (err) {
                console.warn('Derivative generation failed for ' + path + ':', err);
            }
        }
        derived.forEach(function (d) { changes.push({ op: 'putB64', path: d.path, base64: d.base64 }); });

        await ghBatchCommit({
            message: 'Editor: upload ' + path + (derived.length ? ' (+' + derived.length + ' derivative' + (derived.length === 1 ? '' : 's') + ')' : ''),
            changes: changes
        });

        if (!derived.length) {
            console.warn('Uploaded ' + path + ' WITHOUT derivatives. Run tools/optimize-media.mjs locally to generate them.');
        }
        return path;
    }

    function pickAndUpload(folder, cb) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/gif,image/webp';
        input.addEventListener('change', function () {
            var f = input.files && input.files[0];
            if (!f) return;
            uploadImage(folder, f).then(cb).catch(function (err) {
                if (err && err.message !== 'cancelled') alert('Upload failed: ' + (err.message || err));
            });
        });
        input.click();
    }

    window.EditorUpload = {
        uploadImage: uploadImage,
        pickAndUpload: pickAndUpload,
        sanitizeName: sanitizeName,
        derivedBase: derivedBase,
        webpSupported: webpOk
    };
})();
