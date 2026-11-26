// =====================================================================
//  JCT core: Supabase RPC client, session, and shared UI helpers.
//  Exposes a single global: window.JCT
// =====================================================================
(function () {
    'use strict';

    const cfg = window.JCT_CONFIG || {};
    const BASE = (cfg.SUPABASE_URL || '').replace(/\/+$/, '');
    const KEY = cfg.SUPABASE_ANON_KEY || '';
    // Never run with a secret / service_role key: it would bypass all database security.
    const looksSecret = KEY.startsWith('sb_secret_') || (() => {
        try { return KEY.startsWith('eyJ') && JSON.parse(atob(KEY.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role'; }
        catch (e) { return false; }
    })();
    if (looksSecret) console.error('JCT: static/js/config.js contains a SECRET Supabase key. Replace it with the anon/publishable key and rotate the secret key now.');
    const configured = !!(BASE && KEY) && !looksSecret;

    const TOKEN_KEY = 'jct_token';
    const USER_KEY = 'jct_user';

    // ---------- storage (never throws) ----------
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
        sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
        sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
    };

    // ---------- session ----------
    function getSession() {
        const token = store.get(TOKEN_KEY);
        if (!token) return null;
        try {
            const u = JSON.parse(store.get(USER_KEY) || 'null');
            if (!u || !u.username) return null;
            return Object.assign({ token }, u);
        } catch (e) { return null; }
    }
    function setSession(data) {
        store.set(TOKEN_KEY, data.token);
        store.set(USER_KEY, JSON.stringify({
            username: data.username,
            is_guest: !!data.is_guest,
            is_admin: !!data.is_admin
        }));
        // clean up keys from the old Render-based version
        ['jct_logged_in_user', 'jct_guest_user'].forEach(store.del);
    }
    function updateSessionUser(patch) {
        const s = getSession();
        if (!s) return;
        setSession(Object.assign({}, s, patch));
    }
    function clearSession() {
        store.del(TOKEN_KEY);
        store.del(USER_KEY);
    }

    // ---------- RPC ----------
    class ApiError extends Error {
        constructor(message, status) { super(message); this.status = status; }
    }

    async function rpc(fn, params, opts) {
        opts = opts || {};
        if (!configured) throw new ApiError('The site is not connected to Supabase yet (see static/js/config.js).', 0);
        const headers = { 'Content-Type': 'application/json', 'apikey': KEY };
        // Legacy anon keys are JWTs and also go in Authorization; new sb_publishable keys do not.
        if (KEY.startsWith('eyJ')) headers['Authorization'] = 'Bearer ' + KEY;
        let res;
        try {
            res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(params || {}),
                keepalive: !!opts.keepalive
            });
        } catch (e) {
            throw new ApiError('Could not reach the server. Check your internet connection.', 0);
        }
        const text = await res.text();
        let data = null;
        if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
        if (!res.ok) {
            const msg = (data && (data.message || data.error || data.hint)) || `Request failed (${res.status})`;
            if (/session has expired/i.test(msg)) {
                clearSession();
                window.dispatchEvent(new CustomEvent('jct:session-expired'));
            }
            throw new ApiError(msg, res.status);
        }
        return data;
    }

    // Authed RPC: automatically adds p_token.
    function call(fn, params, opts) {
        const s = getSession();
        return rpc(fn, Object.assign({ p_token: s ? s.token : null }, params || {}), opts);
    }

    // ---------- HTML safety ----------
    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Allow only simple formatting tags from the rich-text editor.
    const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'SPAN', 'FONT', 'BLOCKQUOTE', 'A']);
    function sanitize(html) {
        const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
        const root = doc.body.firstChild;
        (function walk(node) {
            [...node.childNodes].forEach(child => {
                if (child.nodeType === 1) {
                    if (!ALLOWED.has(child.tagName)) {
                        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'svg', 'SVG', 'MATH'].includes(child.tagName)) {
                            child.remove();
                            return;
                        }
                        walk(child);
                        child.replaceWith(...child.childNodes);
                        return;
                    }
                    const size = child.tagName === 'FONT' ? child.getAttribute('size') : null;
                    const href = child.tagName === 'A' ? (child.getAttribute('href') || '') : null;
                    [...child.attributes].forEach(a => child.removeAttribute(a.name));
                    if (size && /^[1-7]$/.test(size)) child.setAttribute('size', size);
                    if (href !== null && /^(https:\/\/|[\w-]+\.html(#[\w-]*)?$)/i.test(href)) {
                        child.setAttribute('href', href);
                        if (href.startsWith('https://')) { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener noreferrer'); }
                    }
                    walk(child);
                } else if (child.nodeType !== 3) {
                    child.remove();
                }
            });
        })(root);
        return root ? root.innerHTML : '';
    }
    function textOf(html) {
        const d = document.createElement('div');
        d.innerHTML = sanitize(html);
        return d.textContent || '';
    }

    // ---------- formatting ----------
    function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
    function fmtDuration(totalSeconds) {
        let s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        const d = Math.floor(s / 86400); s %= 86400;
        const h = Math.floor(s / 3600); s %= 3600;
        const m = Math.floor(s / 60); s %= 60;
        if (d) return `${d}d ${h}h ${m}m`;
        if (h) return `${h}h ${m}m`;
        if (m) return `${m}m ${s}s`;
        return `${s}s`;
    }
    function fmtCountdown(ms) {
        let s = Math.max(0, Math.floor(ms / 1000));
        const d = Math.floor(s / 86400); s %= 86400;
        const h = Math.floor(s / 3600); s %= 3600;
        const m = Math.floor(s / 60); s %= 60;
        const p = n => String(n).padStart(2, '0');
        return `${d ? d + 'd ' : ''}${p(h)}:${p(m)}:${p(s)}`;
    }
    function parseDate(v) {
        if (!v) return new Date();
        if (v instanceof Date) return v;
        let str = String(v).replace(' ', 'T');
        if (!/[zZ]|[+-]\d\d:?\d\d$/.test(str)) str += 'Z';
        const d = new Date(str);
        return isNaN(d) ? new Date(v) : d;
    }
    function timeAgo(v) {
        const s = Math.floor((Date.now() - parseDate(v).getTime()) / 1000);
        const units = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
        for (const [sec, name] of units) {
            const n = Math.floor(s / sec);
            if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
        }
        return 'just now';
    }

    // ---------- ranks ----------
    const RANKS = [
        { name: 'Seeker', xp: 0, icon: 'fa-magnifying-glass', verse: 'Seek and you will find. — Matthew 7:7' },
        { name: 'Believer', xp: 500, icon: 'fa-hands-praying', verse: 'Everything is possible for one who believes. — Mark 9:23' },
        { name: 'Follower', xp: 2000, icon: 'fa-shoe-prints', verse: 'Come, follow me. — Matthew 4:19' },
        { name: 'Sheep', xp: 5000, icon: 'fa-dove', verse: 'My sheep listen to my voice. — John 10:27' },
        { name: 'Disciple', xp: 10000, icon: 'fa-book-open', verse: 'Go and make disciples of all nations. — Matthew 28:19' },
        { name: 'Servant', xp: 17000, icon: 'fa-hands-holding', verse: 'Serve one another humbly in love. — Galatians 5:13' },
        { name: 'Worker', xp: 25000, icon: 'fa-hammer', verse: 'The harvest is plentiful but the workers are few. — Matthew 9:37' },
        { name: 'Witness', xp: 32000, icon: 'fa-bullhorn', verse: 'You will be my witnesses. — Acts 1:8' },
        { name: 'Elder', xp: 40000, icon: 'fa-scroll', verse: 'Be shepherds of God’s flock. — 1 Peter 5:2' },
        { name: 'Apostle', xp: 50000, icon: 'fa-crown', verse: 'I have fought the good fight. — 2 Timothy 4:7' }
    ];
    function rankFor(xp) {
        xp = Number(xp) || 0;
        let i = 0;
        for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].xp) i = k;
        const cur = RANKS[i];
        const next = RANKS[i + 1];
        return {
            index: i, name: cur.name, icon: cur.icon, verse: cur.verse,
            prev: cur.xp, next: next ? next.xp : cur.xp, nextName: next ? next.name : null,
            maxed: !next,
            pct: next ? Math.min(100, Math.max(0, ((xp - cur.xp) / (next.xp - cur.xp)) * 100)) : 100
        };
    }

    // ---------- avatars ----------
    const AVATARS = ['static/image/defaultAvatar.jpg', 'static/image/avatar2.jpg', 'static/image/avatar3.jpg',
        'static/image/avatar4.jpg', 'static/image/avatar5.jpg', 'static/image/avatar6.jpg', 'static/image/avatar7.jpg'];
    const FRAMES = [
        { id: 'shape-arch', name: 'Arch' }, { id: 'shape-circle', name: 'Circle' }, { id: 'shape-square', name: 'Square' },
        { id: 'shape-leaf', name: 'Leaf' }, { id: 'shape-blob', name: 'Blob' }, { id: 'shape-heart', name: 'Heart' },
        { id: 'shape-star', name: 'Star' }, { id: 'shape-diamond', name: 'Diamond' }
    ];
    const COLORS = [
        { id: 'color-gold', name: 'Gold', hex: '#ffd76a' }, { id: 'color-silver', name: 'Silver', hex: '#e6e9f0' },
        { id: 'color-ruby', name: 'Ruby', hex: '#e0115f' }, { id: 'color-diamond', name: 'Diamond', hex: '#6ff7ff' },
        { id: 'color-emerald', name: 'Emerald', hex: '#50c878' }, { id: 'color-bronze', name: 'Bronze', hex: '#cd7f32' },
        { id: 'color-purple', name: 'Purple', hex: '#9b5cff' }, { id: 'color-pink', name: 'Pink', hex: '#ff69b4' }
    ];
    const EFFECTS = [
        { id: 'effect-none', name: 'None' }, { id: 'effect-glowing', name: 'Glowing' }, { id: 'effect-stars', name: 'Stars' },
        { id: 'effect-galaxy', name: 'Galaxy' }, { id: 'effect-particles', name: 'Particles' }, { id: 'effect-winter', name: 'Winter' },
        { id: 'effect-fire', name: 'Fire' }, { id: 'effect-water', name: 'Water' }
    ];
    const DEFAULT_AVATAR = AVATARS[0];
    function safeImg(src) {
        src = String(src || '');
        return (src.startsWith('static/image/') || src.startsWith('data:image/')) ? src : DEFAULT_AVATAR;
    }
    function cls(v, prefix, fallback) { return (typeof v === 'string' && /^[a-z]+-[a-z]+$/.test(v) && v.startsWith(prefix)) ? v : fallback; }
    function avatarHTML(u, size) {
        u = u || {};
        const frame = cls(u.avatar_frame, 'shape-', 'shape-arch');
        const color = cls(u.avatar_color, 'color-', 'color-gold');
        const effect = cls(u.avatar_effect, 'effect-', 'effect-none');
        return `<div class="avatar-frame ${size || ''} ${frame} ${color} ${effect}"><img src="${esc(safeImg(u.avatar_url))}" alt="" loading="lazy" onerror="this.src='${DEFAULT_AVATAR}'"></div>`;
    }

    // Resize & compress an image file to a JPEG data URL.
    function compressImage(file, maxSide, quality) {
        maxSide = maxSide || 512; quality = quality || 0.82;
        return new Promise((resolve, reject) => {
            if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Could not read that file.'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('That image could not be opened.'));
                img.onload = () => {
                    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                    const c = document.createElement('canvas');
                    c.width = Math.round(img.width * scale);
                    c.height = Math.round(img.height * scale);
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = '#0a0f2e';
                    ctx.fillRect(0, 0, c.width, c.height);
                    ctx.drawImage(img, 0, 0, c.width, c.height);
                    resolve(c.toDataURL('image/jpeg', quality));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ---------- UI: toasts ----------
    function toast(msg, type) {
        type = type || 'info';
        let stack = document.querySelector('.toast-stack');
        if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; document.body.appendChild(stack); }
        const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-dove';
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.setAttribute('role', 'status');
        el.innerHTML = `<i class="fas ${icon}"></i><span>${esc(msg)}</span>`;
        stack.appendChild(el);
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, type === 'error' ? 5200 : 3600);
    }

    function rewardBurst(title, lines) {
        const wrap = document.createElement('div');
        wrap.className = 'reward-burst';
        wrap.innerHTML = `<div class="rb-card"><i class="fas fa-crown" style="font-size:2rem;color:var(--gold-1)"></i>
            <h3>${esc(title)}</h3>${(lines || []).map(l => `<div class="text-gold">${esc(l)}</div>`).join('')}</div>`;
        document.body.appendChild(wrap);
        if (window.JCTFX && window.JCTFX.burst) window.JCTFX.burst(window.innerWidth / 2, window.innerHeight / 2, 90);
        setTimeout(() => wrap.remove(), 2700);
    }

    // ---------- UI: modals ----------
    function openModal(id) {
        const m = typeof id === 'string' ? document.getElementById(id) : id;
        if (!m) return;
        m.classList.add('open');
        document.body.classList.add('modal-locked');
        requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('show')));
        if (!m.dataset.bound) {
            m.dataset.bound = '1';
            m.addEventListener('mousedown', e => { if (e.target === m && !m.hasAttribute('data-static')) closeModal(m); });
        }
    }
    function closeModal(id) {
        const m = typeof id === 'string' ? document.getElementById(id) : id;
        if (!m) return;
        m.classList.remove('show');
        setTimeout(() => {
            m.classList.remove('open');
            if (!document.querySelector('.modal.open')) document.body.classList.remove('modal-locked');
            m.dispatchEvent(new CustomEvent('modal:closed'));
        }, 350);
    }
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const open = [...document.querySelectorAll('.modal.show')].pop();
        if (open && !open.hasAttribute('data-static')) closeModal(open);
    });

    // Promise-based confirm / prompt built from the modal system.
    function dialog(opts) {
        return new Promise(resolve => {
            const m = document.createElement('div');
            m.className = 'modal';
            m.innerHTML = `<div class="modal-dialog" role="dialog" aria-modal="true">
                <h3 class="modal-title">${esc(opts.title || 'Are you sure?')}</h3>
                ${opts.message ? `<p class="modal-sub">${esc(opts.message)}</p>` : ''}
                ${opts.input ? `<div class="field"><input class="input" maxlength="${opts.maxlength || 80}" value="${esc(opts.value || '')}" placeholder="${esc(opts.placeholder || '')}"></div>` : ''}
                <div class="modal-actions">
                    <button class="btn btn-ghost" data-act="no">${esc(opts.cancel || 'Cancel')}</button>
                    <button class="btn ${opts.danger ? 'btn-danger' : ''}" data-act="yes">${esc(opts.ok || 'Confirm')}</button>
                </div></div>`;
            document.body.appendChild(m);
            const input = m.querySelector('input');
            const done = val => { closeModal(m); setTimeout(() => m.remove(), 400); resolve(val); };
            m.querySelector('[data-act=no]').onclick = () => done(opts.input ? null : false);
            m.querySelector('[data-act=yes]').onclick = () => done(opts.input ? input.value : true);
            if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') done(input.value); });
            m.addEventListener('modal:closed', () => { if (m.isConnected) { m.remove(); resolve(opts.input ? null : false); } });
            openModal(m);
            setTimeout(() => (input || m.querySelector('[data-act=yes]')).focus(), 60);
        });
    }
    const confirmDialog = (title, message, o) => dialog(Object.assign({ title, message }, o));
    const promptDialog = (title, value, o) => dialog(Object.assign({ title, value, input: true, ok: 'Save' }, o));

    function setLoading(btn, on) {
        if (!btn) return;
        btn.classList.toggle('is-loading', !!on);
        btn.disabled = !!on;
    }

    // Validation shared with the database rules.
    function validateUsername(u) {
        if (u.length < 8 || u.length > 20) return 'Username must be 8 to 20 characters.';
        if (!/^[A-Za-z0-9]/.test(u)) return 'Username cannot start with a special character.';
        if (!/^[A-Za-z0-9_.-]+$/.test(u)) return 'Username may only contain letters, numbers, _ . and -';
        if (!/[A-Z]/.test(u)) return 'Username must contain at least one uppercase letter.';
        if (!/[a-z]/.test(u)) return 'Username must contain at least one lowercase letter.';
        if (!/\d/.test(u)) return 'Username must contain at least one number.';
        if (/^guest_/i.test(u)) return 'Usernames starting with "Guest_" are reserved.';
        return null;
    }
    function validatePassword(p) {
        if (p.length < 8 || p.length > 30) return 'Password must be 8 to 30 characters.';
        if (!/^[A-Za-z0-9]/.test(p)) return 'Password cannot start with a special character.';
        if (!/[A-Z]/.test(p)) return 'Password must contain at least one uppercase letter.';
        if (!/[a-z]/.test(p)) return 'Password must contain at least one lowercase letter.';
        if (!/\d/.test(p)) return 'Password must contain at least one number.';
        if (!/[^a-zA-Z0-9]/.test(p)) return 'Password must contain at least one special character.';
        return null;
    }

    window.JCT = {
        configured, rpc, call, ApiError,
        getSession, setSession, updateSessionUser, clearSession, store,
        esc, sanitize, textOf,
        fmtNum, fmtDuration, fmtCountdown, parseDate, timeAgo,
        RANKS, rankFor,
        AVATARS, FRAMES, COLORS, EFFECTS, DEFAULT_AVATAR, safeImg, avatarHTML, compressImage,
        toast, rewardBurst, openModal, closeModal, dialog, confirmDialog, promptDialog, setLoading,
        validateUsername, validatePassword
    };
})();
