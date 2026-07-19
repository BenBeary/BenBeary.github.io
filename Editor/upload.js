/* upload.js, image upload to the repo via the GitHub Contents API. A single
   immediate PUT at insert time (not batched) so the returned raw path is usable
   right away. Derivatives (_derived thumbs/md) won't exist until optimize-media
   is re-run locally, the site's setImg onerror-fallback covers that meanwhile.

   Exposes window.EditorUpload.{ uploadImage(folder,file)->path, pickAndUpload(folder,cb) }.
   Requires auth.js + github-api.js. Load after github-api.js, before editor.js. */

(function () {
    'use strict';

    function readAsBase64(file) {
        return new Promise(function (resolve, reject) {
            var r = new FileReader();
            r.onload = function () { resolve(String(r.result).split(',')[1]); };
            r.onerror = reject;
            r.readAsDataURL(file);
        });
    }

    function sanitizeName(name) { return String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-'); }

    // Upload `file` to images/<folder>/<name>; returns the repo-relative path.
    // Accepts images and mp4 clips (for slideshow videos). Warns past a size
    // threshold that differs by type (images are meant to be small).
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
        var base64 = await readAsBase64(file);

        // If the path already exists we must pass its sha to update it.
        var sha = null;
        try { var existing = await ghFetch('GET', '/contents/' + encodeURI(path)); if (existing && existing.sha) sha = existing.sha; }
        catch (e) { /* 404 => new file */ }

        var body = { message: 'Editor: upload ' + path, content: base64, branch: 'main' };
        if (sha) body.sha = sha;
        await ghFetch('PUT', '/contents/' + encodeURI(path), body);
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

    window.EditorUpload = { uploadImage: uploadImage, pickAndUpload: pickAndUpload, sanitizeName: sanitizeName };
})();
