// =====================================================================
//  Shared page shell: sky background, navbar, footer, page transitions,
//  scroll reveal, live presence + active-time tracking.
//  Each page sets <body data-page="..." data-auth="user|any|none">.
// =====================================================================
(function () {
    'use strict';
    const J = window.JCT;
    const body = document.body;
    const page = body.dataset.page || '';
    const authMode = body.dataset.auth || 'none';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------------- Auth guard ----------------
    let session = J.getSession();
    if ((authMode === 'user' && (!session || session.is_guest)) || (authMode === 'any' && !session)) {
        J.store.sset('jct_after_login', location.pathname + location.search);
        location.replace('index.html?skip=1' + (session && session.is_guest ? '&register=1' : ''));
        return;
    }
    window.addEventListener('jct:session-expired', () => {
        if (authMode !== 'none') location.replace('index.html?skip=1&expired=1');
    });

    // ---------------- Page veil (enter / leave transition) ----------------
    const veil = document.createElement('div');
    veil.className = 'page-veil';
    body.prepend(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('gone')));
    window.addEventListener('pageshow', e => { if (e.persisted) veil.classList.remove('leaving'); veil.classList.add('gone'); });
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href]');
        if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || a.hasAttribute('download')) return;
        e.preventDefault();
        veil.classList.remove('gone');
        veil.classList.add('leaving');
        setTimeout(() => { location.href = href; }, reduceMotion ? 0 : 320);
    });

    // ---------------- Sky background ----------------
    const sky = document.createElement('div');
    sky.className = 'sky-bg';
    sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML = '<div class="sky-rays"></div><div class="sky-cloud c1"></div><div class="sky-cloud c2"></div><div class="sky-cloud c3"></div><canvas></canvas><div class="sky-vignette"></div>';
    body.prepend(sky);
    startSkyCanvas(sky.querySelector('canvas'));

    // ---------------- Navbar ----------------
    const LINKS = [
        { id: 'home', href: 'main.html', label: 'Home' },
        { id: 'bible', href: 'bible.html', label: 'Bible' },
        { id: 'church', href: 'church.html', label: 'Church' },
        { id: 'topics', href: 'topic.html', label: 'Topics' },
        { id: 'quests', href: 'quests.html', label: 'Quests', user: true },
        { id: 'rank', href: 'rank.html', label: 'Ranks', user: true },
        { id: 'guidebot', href: 'chatbot.html', label: 'GuideBot' }
    ];
    const isUser = session && !session.is_guest;
    const visibleLinks = LINKS.filter(l => !l.user || isUser);

    const nav = document.createElement('header');
    nav.className = 'site-nav';
    nav.innerHTML = `
      <div class="nav-shell">
        <a class="nav-brand" href="main.html" aria-label="Home">
          <img src="static/image/jesusLogo.png" alt="">
          <span>Jesus Christ<small>THE TRUTH</small></span>
        </a>
        <nav aria-label="Main"><ul class="nav-links">
          <span class="nav-pill" aria-hidden="true"></span>
          ${visibleLinks.map(l => `<li><a href="${l.href}" class="${l.id === page ? 'active' : ''}">${l.label}</a></li>`).join('')}
        </ul></nav>
        <div class="nav-actions">
          <button class="live-pill" type="button" id="live-pill" title="Believers online now">
            <span class="live-dot"></span><span id="live-count">1</span><span class="hide-mobile">&nbsp;online</span>
          </button>
          ${session ? `
            ${isUser ? `<a class="nav-avatar" href="profile.html" title="My profile" id="nav-avatar"><img src="${J.DEFAULT_AVATAR}" alt="My profile"></a>`
                     : `<a class="btn btn-sm nav-login-btn hide-mobile" href="index.html?skip=1&register=1">Register</a>`}
            <button class="nav-icon-btn hide-mobile" type="button" id="nav-logout" title="Log out"><i class="fas fa-right-from-bracket"></i></button>`
          : `<a class="btn btn-sm nav-login-btn" href="index.html?skip=1">Enter</a>`}
          <button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
        </div>
      </div>
      <div class="nav-drawer" role="dialog" aria-label="Menu">
        ${visibleLinks.map((l, i) => `<a href="${l.href}" class="${l.id === page ? 'active' : ''}" style="--i:${i}">${l.label}</a>`).join('')}
        <div class="drawer-sep"></div>
        ${session
            ? `${isUser ? `<a class="drawer-small" href="profile.html" style="--i:${visibleLinks.length}"><i class="fas fa-user"></i> My Profile</a>` : `<a class="drawer-small" href="index.html?skip=1&register=1" style="--i:${visibleLinks.length}"><i class="fas fa-user-plus"></i> Register an account</a>`}
               <a class="drawer-small" href="#" data-logout style="--i:${visibleLinks.length + 1}"><i class="fas fa-right-from-bracket"></i> Log out (${J.esc(session.username)})</a>`
            : `<a class="drawer-small" href="index.html?skip=1" style="--i:${visibleLinks.length}"><i class="fas fa-door-open"></i> Login / Register</a>`}
      </div>`;
    body.insertBefore(nav, sky.nextSibling);

    // sliding gold pill under the active / hovered link
    const linksEl = nav.querySelector('.nav-links');
    const pill = nav.querySelector('.nav-pill');
    function movePill(a) {
        if (!a || !pill) { if (pill) pill.style.opacity = 0; return; }
        const r = a.getBoundingClientRect(), pr = linksEl.getBoundingClientRect();
        pill.style.left = (r.left - pr.left) + 'px';
        pill.style.width = r.width + 'px';
        pill.style.opacity = 1;
        linksEl.querySelectorAll('a').forEach(x => x.classList.toggle('pill-on', x === a));
    }
    const activeLink = () => linksEl.querySelector('a.active');
    linksEl.querySelectorAll('a').forEach(a => a.addEventListener('mouseenter', () => movePill(a)));
    linksEl.addEventListener('mouseleave', () => movePill(activeLink()));
    window.addEventListener('load', () => movePill(activeLink()));
    window.addEventListener('resize', () => movePill(activeLink()));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => movePill(activeLink()));

    const burger = nav.querySelector('.nav-burger');
    burger.addEventListener('click', () => {
        const open = !nav.classList.contains('nav-open');
        nav.classList.toggle('nav-open', open);
        burger.setAttribute('aria-expanded', open);
        body.classList.toggle('modal-locked', open);
    });
    nav.querySelectorAll('.nav-drawer a').forEach(a => a.addEventListener('click', () => {
        nav.classList.remove('nav-open'); body.classList.remove('modal-locked');
    }));

    let lastY = 0;
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        nav.classList.toggle('scrolled', y > 30);
        lastY = y;
    }, { passive: true });

    async function logout(e) {
        if (e) e.preventDefault();
        const s = J.getSession();
        flushTime(true);
        if (s) { try { await J.rpc('jct_logout', { p_token: s.token }); } catch (err) { /* ignore */ } }
        J.clearSession();
        location.href = 'index.html?skip=1';
    }
    const logoutBtn = nav.querySelector('#nav-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    nav.querySelectorAll('[data-logout]').forEach(a => a.addEventListener('click', logout));
    window.JCTLogout = logout;

    // ---------------- Footer ----------------
    if (!body.hasAttribute('data-no-footer')) {
        const f = document.createElement('footer');
        f.className = 'site-footer';
        f.innerHTML = `
          <div class="hero-cross" style="width:30px;height:46px;margin-bottom:18px"></div>
          <p class="f-verse">“Jesus answered, I am the way and the truth and the life. No one comes to the Father except through me.”</p>
          <div class="f-ref">JOHN 14:6</div>
          <nav>${LINKS.filter(l => !l.user || isUser).map(l => `<a href="${l.href}">${l.label}</a>`).join('')}</nav>
          <p class="f-copy">© ${new Date().getFullYear()} Jesus Christ The Truth · Soli Deo Gloria</p>`;
        body.appendChild(f);
    }

    // ---------------- Cursor glow (desktop) ----------------
    if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
        const glow = document.createElement('div');
        glow.className = 'cursor-glow';
        body.appendChild(glow);
        let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
        document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
        (function loop() {
            gx += (tx - gx) * 0.15; gy += (ty - gy) * 0.15;
            glow.style.transform = `translate(${gx}px, ${gy}px)`;
            requestAnimationFrame(loop);
        })();
    }

    // ---------------- Scroll reveal ----------------
    const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting) { en.target.classList.add('revealed'); revealObserver.unobserve(en.target); }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
    function observeReveals(root) {
        (root || document).querySelectorAll('[data-reveal]:not(.revealed)').forEach(el => {
            if (revealObserver) revealObserver.observe(el); else el.classList.add('revealed');
        });
    }
    window.JCTReveal = observeReveals;
    document.addEventListener('DOMContentLoaded', () => observeReveals());
    if (document.readyState !== 'loading') observeReveals();

    // ---------------- Live users modal ----------------
    const liveModal = document.createElement('div');
    liveModal.className = 'modal';
    liveModal.id = 'live-users-modal';
    liveModal.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="live-title">
        <button class="icon-btn modal-close" type="button" aria-label="Close"><i class="fas fa-xmark"></i></button>
        <div class="center"><span class="eyebrow">Live now</span></div>
        <h2 class="modal-title" id="live-title">Believers Online</h2>
        <p class="modal-sub">Brethren walking the site with you right now</p>
        <div id="live-owner"></div>
        <div id="live-list" style="max-height:340px;overflow-y:auto;margin-top:14px"></div>
      </div>`;
    body.appendChild(liveModal);
    liveModal.querySelector('.modal-close').onclick = () => J.closeModal(liveModal);
    nav.querySelector('#live-pill').addEventListener('click', async () => {
        J.openModal(liveModal);
        const ownerEl = liveModal.querySelector('#live-owner');
        const listEl = liveModal.querySelector('#live-list');
        ownerEl.innerHTML = '<div class="skeleton" style="height:56px"></div>';
        listEl.innerHTML = '';
        try {
            const data = await J.rpc('jct_live_users', {});
            const users = data.users || [];
            const ownerOnline = users.some(u => u.name === data.owner);
            ownerEl.innerHTML = `<div class="user-row" style="border-color:var(--line-strong)">
                <i class="fas fa-crown" style="color:var(--gold-1)"></i>
                <span class="name">${J.esc(data.owner)}</span>
                <span class="chip ${ownerOnline ? 'ok' : 'dim'}">${ownerOnline ? 'Online' : 'Offline'}</span></div>`;
            const others = users.filter(u => u.name !== data.owner);
            listEl.innerHTML = others.length ? others.map(u => `
                <div class="user-row"><span class="status-dot on"></span><span class="name">${J.esc(u.name)}</span>
                <span class="chip ${u.is_guest ? 'dim' : 'sky'}">${u.is_guest ? 'Guest' : 'Believer'}</span></div>`).join('')
                : `<div class="empty-state"><i class="fas fa-wind"></i>No other believers online right now.</div>`;
        } catch (err) {
            ownerEl.innerHTML = `<div class="empty-state"><i class="fas fa-cloud"></i>${J.esc(err.message)}</div>`;
        }
    });

    // ---------------- Presence + active time ----------------
    let pending = 0;
    let syncing = false;
    function flushTime(unloading) {
        const s = J.getSession();
        if (!s || pending <= 0 || (syncing && !unloading)) return;
        const amount = pending;
        pending = 0;
        syncing = true;
        J.rpc('jct_sync_time', { p_token: s.token, p_seconds: amount }, { keepalive: !!unloading })
            .then(data => window.dispatchEvent(new CustomEvent('jct:stats', { detail: data })))
            .catch(() => { pending += amount; })
            .finally(() => { syncing = false; });
    }
    window.JCTFlushTime = flushTime;

    function heartbeat() {
        const s = J.getSession();
        J.rpc('jct_ping', { p_token: s ? s.token : null })
            .then(d => { const el = document.getElementById('live-count'); if (el && d) el.textContent = d.count; })
            .catch(() => { });
    }

    if (J.configured) {
        heartbeat();
        setInterval(() => { if (document.visibilityState === 'visible') heartbeat(); }, 12000);
        if (session) {
            setInterval(() => { if (document.visibilityState === 'visible' && document.hasFocus()) pending++; }, 1000);
            setInterval(() => flushTime(false), 15000);
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushTime(true); });
            window.addEventListener('pagehide', () => flushTime(true));
        }
        // nav avatar
        if (isUser) {
            J.rpc('jct_user_profile', { p_username: session.username }).then(u => {
                const img = document.querySelector('#nav-avatar img');
                if (img && u) img.src = J.safeImg(u.avatar_url);
            }).catch(() => { });
        }
    } else {
        const b = document.createElement('div');
        b.className = 'config-banner';
        b.innerHTML = 'Supabase is not configured yet. Add your project URL and anon key in <code>static/js/config.js</code> (see README).';
        body.appendChild(b);
    }

    // =================================================================
    //  SKY CANVAS: twinkling stars + rising golden motes + bursts
    // =================================================================
    function startSkyCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        let w, h, dpr, stars = [], motes = [], sparks = [];
        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            w = canvas.clientWidth; h = canvas.clientHeight;
            canvas.width = w * dpr; canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const area = w * h;
            stars = Array.from({ length: Math.min(260, Math.round(area / 6500)) }, () => ({
                x: Math.random() * w, y: Math.random() * h * 0.9, r: Math.random() * 1.3 + 0.2,
                p: Math.random() * Math.PI * 2, s: 0.5 + Math.random() * 1.6
            }));
            motes = Array.from({ length: Math.min(70, Math.round(area / 22000)) }, () => newMote(true));
        }
        function newMote(anywhere) {
            return {
                x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10,
                r: Math.random() * 2 + 0.6, vy: -(Math.random() * 0.35 + 0.12), vx: (Math.random() - 0.5) * 0.15,
                a: Math.random() * 0.6 + 0.2, p: Math.random() * Math.PI * 2
            };
        }
        window.JCTFX = {
            burst(x, y, n) {
                for (let i = 0; i < (n || 40); i++) {
                    const ang = Math.random() * Math.PI * 2, sp = Math.random() * 6 + 2;
                    sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.5, life: 1, r: Math.random() * 2.4 + 1 });
                }
            }
        };
        let t = 0, running = true;
        document.addEventListener('visibilitychange', () => {
            running = document.visibilityState === 'visible';
            if (running) requestAnimationFrame(frame);
        });
        function frame() {
            if (!running) return;
            t += 0.016;
            ctx.clearRect(0, 0, w, h);
            for (const s of stars) {
                const a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.s + s.p));
                ctx.globalAlpha = a;
                ctx.fillStyle = '#fffaf0';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
                if (s.r > 1.25) { ctx.globalAlpha = a * 0.35; ctx.fillRect(s.x - s.r * 3, s.y - 0.4, s.r * 6, 0.8); ctx.fillRect(s.x - 0.4, s.y - s.r * 3, 0.8, s.r * 6); }
            }
            if (!reduceMotion) {
                for (const m of motes) {
                    m.y += m.vy; m.x += m.vx + Math.sin(t + m.p) * 0.12;
                    if (m.y < -10) Object.assign(m, newMote(false));
                    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
                    g.addColorStop(0, `rgba(255, 228, 160, ${m.a})`);
                    g.addColorStop(1, 'rgba(255, 228, 160, 0)');
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2); ctx.fill();
                }
            }
            for (let i = sparks.length - 1; i >= 0; i--) {
                const p = sparks[i];
                p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.vx *= 0.98; p.life -= 0.014;
                if (p.life <= 0) { sparks.splice(i, 1); continue; }
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.life > 0.6 ? '#fffbe8' : '#f6d98b';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            requestAnimationFrame(frame);
        }
        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(frame);
    }
})();
