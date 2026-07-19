/* drafts.js, local draft index management for the editor landing page.
   editor.js writes drafts (key `pf.editor.draft.<project>.<slug>`) and maintains
   the index `pf.editor.drafts`; this exposes listDrafts()/deleteDraft() for
   editor-index.js to render + manage them. Prunes drafts older than 30 days.
   Load before editor-index.js on index.html. */

(function () {
    'use strict';

    var DRAFT_INDEX = 'pf.editor.drafts';
    var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

    function readIndex() { try { return JSON.parse(localStorage.getItem(DRAFT_INDEX) || '[]'); } catch (_) { return []; } }
    function writeIndex(a) { try { localStorage.setItem(DRAFT_INDEX, JSON.stringify(a)); } catch (_) {} }

    function prune() {
        var cutoff = Date.now() - MAX_AGE_MS;
        var next = readIndex().filter(function (e) {
            if (e.savedAt && e.savedAt < cutoff) { try { localStorage.removeItem(e.key); } catch (_) {} return false; }
            return true;
        });
        writeIndex(next);
    }

    window.listDrafts = function () {
        prune();
        return readIndex().slice().sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    };

    window.deleteDraft = function (key) {
        try { localStorage.removeItem(key); } catch (_) {}
        writeIndex(readIndex().filter(function (e) { return e.key !== key; }));
    };
})();
