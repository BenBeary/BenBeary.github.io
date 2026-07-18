/* auth.js — GitHub PAT auth for the portfolio editor. Adapted from
   docs/reference-cadre/auth.js (CADRE), trimmed to OWNER-ONLY:
     - owner/repo constants point at this repo
     - kept: AES-GCM token-at-rest, "keep me logged in", expiry chip, sign-in modal
     - removed: basic/admin page-role gate + redirects, collaborator messaging,
       contributor-setup flow

   Loads before Editor/github-api.js so getStoredToken / GITHUB_OWNER / GITHUB_REPO
   are in scope. Fires document event 'auth:changed' on sign in / out so the page
   can re-render. Requires the sign-in modal + #auth-chip markup to exist first.

   Security note (unchanged from CADRE): the AES key sits beside the ciphertext in
   the same browser store — this deters casual localStorage scraping, NOT a
   code-aware attacker. Acceptable for a single owner on their own machine. */

const GITHUB_OWNER = 'BenBeary';
const GITHUB_REPO  = 'BenBeary.github.io';

const LS_KEYS = { pat: 'pf_pat', login: 'pf_user_login', avatar: 'pf_user_avatar', expiry: 'pf_pat_expiry', key: 'pf_k' };
const LS_KEEP_PREF = 'pf_keep_logged_in_pref';

// Decrypted token, in memory only. Keeps getStoredToken() synchronous.
let decryptedToken = null;

function readKeepLoggedInPref() {
    const v = localStorage.getItem(LS_KEEP_PREF);
    return v === null ? true : v === '1';
}
function writeKeepLoggedInPref(persistent) {
    try { localStorage.setItem(LS_KEEP_PREF, persistent ? '1' : '0'); } catch (_) {}
}

// --- Public API ------------------------------------------------------------
function isAuthenticated() {
    return !!decryptedToken || !!(localStorage.getItem(LS_KEYS.pat) || sessionStorage.getItem(LS_KEYS.pat));
}
function getStoredToken() { return decryptedToken || ''; }
function getCurrentUser() {
    if (!isAuthenticated()) return null;
    return {
        login: localStorage.getItem(LS_KEYS.login) || sessionStorage.getItem(LS_KEYS.login) || '',
        avatar: localStorage.getItem(LS_KEYS.avatar) || sessionStorage.getItem(LS_KEYS.avatar) || ''
    };
}
function getTokenExpiry() { return localStorage.getItem(LS_KEYS.expiry) || sessionStorage.getItem(LS_KEYS.expiry) || ''; }

function makePersistent() {
    Object.keys(LS_KEYS).forEach(function (field) {
        const key = LS_KEYS[field];
        const sVal = sessionStorage.getItem(key);
        if (sVal !== null && !localStorage.getItem(key)) localStorage.setItem(key, sVal);
        sessionStorage.removeItem(key);
    });
}
function makeSessionOnly() {
    Object.keys(LS_KEYS).forEach(function (field) {
        const key = LS_KEYS[field];
        const lVal = localStorage.getItem(key);
        if (lVal !== null) { sessionStorage.setItem(key, lVal); localStorage.removeItem(key); }
    });
}

// --- Internals -------------------------------------------------------------
function authEscape(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Token-at-rest encryption (AES-GCM), verbatim from CADRE ----------------
function bytesToBase64(bytes) { let b = ''; for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i]); return btoa(b); }
function base64ToBytes(b64) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

async function getOrCreateCryptoKey(store, create) {
    const existing = store.getItem(LS_KEYS.key);
    if (existing) return crypto.subtle.importKey('raw', base64ToBytes(existing), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    if (!create) return null;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const raw = await crypto.subtle.exportKey('raw', key);
    store.setItem(LS_KEYS.key, bytesToBase64(new Uint8Array(raw)));
    return key;
}
async function encryptToken(plain, store) {
    const key = await getOrCreateCryptoKey(store, true);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plain));
    const combined = new Uint8Array(iv.length + ct.byteLength);
    combined.set(iv, 0); combined.set(new Uint8Array(ct), iv.length);
    return bytesToBase64(combined);
}
async function decryptToken(blob, store) {
    try {
        const key = await getOrCreateCryptoKey(store, false);
        if (!key) return '';
        const all = base64ToBytes(blob);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, key, all.slice(12));
        return new TextDecoder().decode(pt);
    } catch (_) { return ''; }
}

async function validateAndStorePAT(pat, persistent) {
    const authHeaders = { 'Authorization': 'Bearer ' + pat, 'Accept': 'application/vnd.github+json' };

    const res = await fetch('https://api.github.com/user', { headers: authHeaders });
    if (!res.ok) throw new Error('Invalid token (' + res.status + ')');
    const user = await res.json();
    const expiryHeader = res.headers.get('github-authentication-token-expiration') || '';

    // Owner-only: the token must belong to the site owner.
    if ((user.login || '').toLowerCase() !== GITHUB_OWNER.toLowerCase()) {
        throw new Error('This token belongs to @' + user.login + ', not the site owner (@' + GITHUB_OWNER + ').');
    }
    // Confirm it can actually write to the repo (contents:write), so a read-only
    // token fails here rather than at publish time.
    const repoRes = await fetch('https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO, { headers: authHeaders });
    if (!repoRes.ok) throw new Error("This token can't access " + GITHUB_OWNER + '/' + GITHUB_REPO + ' (' + repoRes.status + ').');
    const repo = await repoRes.json();
    if (!repo.permissions || repo.permissions.push !== true) {
        throw new Error("This token lacks write access. Give it Contents: read and write on this repo.");
    }

    const store = persistent === false ? sessionStorage : localStorage;
    const other = persistent === false ? localStorage : sessionStorage;
    Object.values(LS_KEYS).forEach(function (k) { other.removeItem(k); });
    store.removeItem(LS_KEYS.key);
    store.setItem(LS_KEYS.pat, await encryptToken(pat, store));
    store.setItem(LS_KEYS.login, user.login || '');
    store.setItem(LS_KEYS.avatar, user.avatar_url || '');
    store.setItem(LS_KEYS.expiry, expiryHeader);
    decryptedToken = pat;
    return user;
}

function signOut() {
    Object.values(LS_KEYS).forEach(function (k) { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    decryptedToken = null;
    renderAuthUI();
    document.dispatchEvent(new CustomEvent('auth:changed'));
}

// --- UI --------------------------------------------------------------------
function renderAuthUI() {
    const chip = document.getElementById('auth-chip');
    if (!chip) return;
    const user = getCurrentUser();
    if (user) {
        chip.innerHTML = '<div class="auth-user">'
            + '<img src="' + authEscape(user.avatar) + '" alt="" class="auth-avatar">'
            + '<span class="auth-login">' + authEscape(user.login) + '</span>'
            + renderExpiryWarning()
            + '<button class="btn-ghost btn-sm" id="btn-sign-out" title="Sign out">Sign out</button>'
            + '</div>';
    } else {
        chip.innerHTML = '<button class="btn-primary btn-sm" id="btn-sign-in">🔒 Sign in</button>';
    }
}

function renderExpiryWarning() {
    const raw = getTokenExpiry();
    if (!raw) return '';
    const when = new Date(raw);
    if (isNaN(when.getTime())) return '';
    const dayMs = 86400000, msLeft = when.getTime() - Date.now();
    if (msLeft > 7 * dayMs) return '';
    const tip = 'Token expires ' + when.toLocaleString();
    if (msLeft <= 0) return '<span class="auth-expiry-warn" title="' + authEscape(tip) + '">⚠ expired</span>';
    const days = Math.max(1, Math.ceil(msLeft / dayMs));
    return '<span class="auth-expiry-warn" title="' + authEscape(tip) + '">⚠ ' + days + 'd left</span>';
}

function buildGenerateTokenUrl() {
    return 'https://github.com/settings/personal-access-tokens/new'
        + '?target_name=' + encodeURIComponent(GITHUB_OWNER)
        + '&repository_names=' + encodeURIComponent(GITHUB_REPO)
        + '&permissions=contents:write,metadata:read'
        + '&description=Portfolio%20Editor';
}

function openAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (!overlay) return;
    const gen = document.getElementById('auth-generate-link');
    if (gen) gen.href = buildGenerateTokenUrl();
    const input = document.getElementById('auth-pat-input');
    if (input) input.value = '';
    const keep = document.getElementById('auth-keep-logged-in');
    if (keep) keep.checked = readKeepLoggedInPref();
    hideAuthError();
    overlay.style.display = 'flex';
    setTimeout(function () { if (input) input.focus(); }, 50);
}
function closeAuthModal() { const o = document.getElementById('auth-modal-overlay'); if (o) o.style.display = 'none'; }
function isAuthModalOpen() { const o = document.getElementById('auth-modal-overlay'); return o && o.style.display === 'flex'; }
function showAuthError(msg) { const el = document.getElementById('auth-error'); if (el) { el.textContent = msg; el.style.display = ''; } }
function hideAuthError() { const el = document.getElementById('auth-error'); if (el) { el.textContent = ''; el.style.display = 'none'; } }

async function handleSignInSubmit() {
    const input = document.getElementById('auth-pat-input');
    const btn = document.getElementById('auth-modal-confirm');
    if (!input || !btn) return;
    const pat = input.value.trim();
    if (!pat) { showAuthError('Please paste a token.'); return; }
    const keep = document.getElementById('auth-keep-logged-in');
    const persistent = keep ? !!keep.checked : true;
    writeKeepLoggedInPref(persistent);

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Signing in…';
    hideAuthError();
    try {
        await validateAndStorePAT(pat, persistent);
        closeAuthModal();
        renderAuthUI();
        document.dispatchEvent(new CustomEvent('auth:changed'));
    } catch (err) {
        showAuthError(err && err.message ? err.message : 'Sign-in failed.');
    } finally {
        btn.disabled = false;
        btn.textContent = label;
    }
}

// --- Wiring (guarded so a missing element never throws) ---------------------
(function wireAuth() {
    const chip = document.getElementById('auth-chip');
    if (chip) chip.addEventListener('click', function (e) {
        if (e.target.closest('#btn-sign-in')) openAuthModal();
        else if (e.target.closest('#btn-sign-out')) signOut();
    });
    const cancel = document.getElementById('auth-modal-cancel');
    if (cancel) cancel.addEventListener('click', closeAuthModal);
    const confirm = document.getElementById('auth-modal-confirm');
    if (confirm) confirm.addEventListener('click', handleSignInSubmit);
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeAuthModal(); });
    const input = document.getElementById('auth-pat-input');
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); handleSignInSubmit(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isAuthModalOpen()) closeAuthModal(); });
})();

// --- Warm-up + boot --------------------------------------------------------
async function warmDecryptToken() {
    const store = localStorage.getItem(LS_KEYS.pat) ? localStorage
                : sessionStorage.getItem(LS_KEYS.pat) ? sessionStorage : null;
    if (!store) { decryptedToken = null; return; }
    const blob = store.getItem(LS_KEYS.pat);
    const plain = await decryptToken(blob, store);
    if (plain) { decryptedToken = plain; return; }
    if (/^(ghp_|github_pat_|gho_|ghu_|ghs_)/.test(blob)) {   // pre-encryption value, adopt + re-encrypt
        decryptedToken = blob;
        store.removeItem(LS_KEYS.key);
        try { store.setItem(LS_KEYS.pat, await encryptToken(blob, store)); } catch (_) {}
        return;
    }
    decryptedToken = null;
}

(async function bootAuth() {
    await warmDecryptToken();
    renderAuthUI();
    document.dispatchEvent(new CustomEvent('auth:ready'));
})();
