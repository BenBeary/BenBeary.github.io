/* richtext-sanitize.js, whitelist sanitizer for the `text` block's stored HTML.
   Ported (sanitize-only) from the CADRE post-gen-richtext.js in docs/reference-cadre/.

   Rule (see ARCHITECTURE): stored post HTML is never trusted blindly, the site
   re-sanitizes it on render. Allowed: p, strong, em, u, a[href http(s)/mailto/
   relative], ul/ol/li, br, and text-align on blocks. Everything else is unwrapped
   or dropped. Exposes the global `sanitizeRichHtml(html) -> string`.

   Editor note (M5): the editing toolbar/link-modal live in a separate editor
   script; this file is the shared render-time sanitizer only. */

(function () {
    'use strict';

    // Incoming tagName -> tag the clean copy uses. Block-ish tags collapse to <p>.
    // Anything not listed (span, font, td, …) is unwrapped (children survive).
    var TAG_MAP = {
        B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u',
        A: 'a', BR: 'br', P: 'p', DIV: 'p', CENTER: 'p',
        H1: 'p', H2: 'p', H3: 'p', H4: 'p', H5: 'p', H6: 'p',
        BLOCKQUOTE: 'p', PRE: 'p', UL: 'ul', OL: 'ol', LI: 'li'
    };
    // Tags removed wholesale (content is junk too).
    var DROP_TAGS = {
        SCRIPT: 1, STYLE: 1, HEAD: 1, TITLE: 1, META: 1, LINK: 1, NOSCRIPT: 1,
        IFRAME: 1, OBJECT: 1, EMBED: 1, SVG: 1, MATH: 1, TEMPLATE: 1,
        IMG: 1, PICTURE: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1,
        BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, FORM: 1
    };
    var BLOCK_TAGS = { p: 1, ul: 1, ol: 1, li: 1 };

    function safeHref(raw) {
        var url = String(raw || '').trim();
        if (!url) return '';
        if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
        if (/^[a-z][a-z0-9+.\-]*:/i.test(url)) return '';   // block javascript:, data:, …
        return url;                                          // relative path or #anchor
    }

    function textAlign(el) {
        if (el.tagName === 'CENTER') return 'center';
        var v = (el.style.textAlign || el.getAttribute('align') || '').toLowerCase();
        return /^(left|center|right|justify)$/.test(v) ? v : '';
    }

    // Inline styling that pasted content expresses as CSS rather than tags.
    function styleWrappers(el) {
        var st = el.style, out = [];
        if (st.fontWeight === 'bold' || st.fontWeight === 'bolder' || parseInt(st.fontWeight, 10) >= 600) out.push('strong');
        if (st.fontStyle === 'italic' || st.fontStyle === 'oblique') out.push('em');
        if ((st.textDecoration + ' ' + st.textDecorationLine).indexOf('underline') !== -1) out.push('u');
        return out;
    }

    function cleanChildren(parent) {
        Array.prototype.slice.call(parent.childNodes).forEach(function (node) {
            if (node.nodeType === 3) return;                               // text, keep
            var tagName = node.nodeType === 1 ? node.tagName.toUpperCase() : '';
            if (node.nodeType !== 1 || DROP_TAGS[tagName]) { parent.removeChild(node); return; }

            cleanChildren(node);   // depth-first

            var tag = TAG_MAP[tagName] || '';
            if (tag === 'strong' && /^(normal|400)$/.test(node.style.fontWeight)) tag = '';
            if (tag === 'p' && node.querySelector('p, ul, ol, li')) tag = '';
            if (tag === 'li' && !(parent.tagName === 'UL' || parent.tagName === 'OL')) tag = '';

            var out, inner;
            if (tag) {
                out = document.createElement(tag);
                if (tag === 'a') {
                    var href = safeHref(node.getAttribute('href'));
                    if (href) out.setAttribute('href', href);
                }
                inner = out;
                if (BLOCK_TAGS[tag]) {
                    var align = textAlign(node);
                    if (align) out.style.textAlign = align;
                    styleWrappers(node).forEach(function (w) { inner = inner.appendChild(document.createElement(w)); });
                }
            } else {
                out = document.createDocumentFragment();
                inner = out;
                styleWrappers(node).forEach(function (w) { inner = inner.appendChild(document.createElement(w)); });
            }
            while (node.firstChild) inner.appendChild(node.firstChild);
            parent.replaceChild(out, node);
        });
    }

    // Chrome nests indented lists as a sibling of the <li> - fold into the prior <li>.
    function fixListNesting(root) {
        Array.prototype.slice.call(root.querySelectorAll('ul > ul, ul > ol, ol > ul, ol > ol'))
            .forEach(function (list) {
                var prev = list.previousElementSibling;
                if (prev && prev.tagName === 'LI') prev.appendChild(list);
            });
    }

    window.sanitizeRichHtml = function (html) {
        var root = document.createElement('div');
        root.innerHTML = String(html || '');
        cleanChildren(root);
        fixListNesting(root);
        return root.innerHTML;
    };
})();
