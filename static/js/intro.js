// =====================================================================
//  ENTRY PAGE — cinematic intro sequence + login / register portal
// =====================================================================
(function () {
    'use strict';
    const J = window.JCT;
    const $ = id => document.getElementById(id);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const params = new URLSearchParams(location.search);

    const intro = $('intro'), gate = $('intro-gate'), textBox = $('intro-text'), ref = $('intro-ref');
    const cracks = $('intro-cracks'), core = $('intro-core'), bolt = $('intro-bolt'), shardsBox = $('intro-shards');
    const flash = $('intro-flash'), skipBtn = $('intro-skip'), clouds = $('clouds');
    const portal = $('portal'), video = $('portal-video'), audio = $('intro-audio'), soundBtn = $('sound-toggle');

    const PHRASES = ['I AM THE ALPHA', 'AND THE OMEGA', 'THE FIRST', 'AND THE LAST', 'THE BEGINNING', 'AND THE END'];

    $('year').textContent = new Date().getFullYear();

    // ---------------- helpers ----------------
    let skipped = false, started = false, finished = false;
    const sleepers = new Set();
    function sleep(ms) {
        return new Promise(res => {
            if (skipped) return res();
            const t = setTimeout(() => { sleepers.delete(done); res(); }, ms);
            const done = () => { clearTimeout(t); res(); };
            sleepers.add(done);
        });
    }
    function wakeAll() { sleepers.forEach(fn => fn()); sleepers.clear(); }

    function splitChars(el, startIndex) {
        let i = startIndex || 0;
        const text = el.textContent;
        el.textContent = '';
        for (const c of text) {
            const s = document.createElement('span');
            s.className = c === ' ' ? 'ch sp' : 'ch';
            s.textContent = c === ' ' ? ' ' : c;
            s.style.setProperty('--i', i++);
            s.setAttribute('aria-hidden', 'true');
            el.appendChild(s);
        }
        return i;
    }
    // Title: letters animate individually but each word stays unbroken.
    let idx = 0;
    document.querySelectorAll('#portal-h1 .line').forEach(line => {
        const words = line.textContent.trim().split(/\s+/);
        line.textContent = '';
        words.forEach((w, wi) => {
            const word = document.createElement('span');
            word.className = 'word';
            word.textContent = w;
            idx = splitChars(word, idx);
            line.appendChild(word);
            if (wi < words.length - 1) line.appendChild(document.createTextNode(' '));
        });
    });

    // =================================================================
    //  INTRO CANVAS: drifting dust -> converges into the core -> explodes
    // =================================================================
    const ic = $('intro-canvas'), ictx = ic.getContext('2d');
    let iw, ih, idpr, dust = [], mode = 'idle', rafIntro = 0;
    function sizeIntro() {
        idpr = Math.min(devicePixelRatio || 1, 1.5);
        iw = ic.clientWidth; ih = ic.clientHeight;
        ic.width = iw * idpr; ic.height = ih * idpr;
        ictx.setTransform(idpr, 0, 0, idpr, 0, 0);
        const n = Math.min(420, Math.round((iw * ih) / 3800));
        dust = Array.from({ length: n }, () => ({
            x: Math.random() * iw, y: Math.random() * ih,
            vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .2,
            r: Math.random() * 1.6 + .3, a: Math.random() * .7 + .2, p: Math.random() * 6.28,
            gold: Math.random() < .55
        }));
    }
    function introFrame(t) {
        const cx = iw / 2, cy = ih / 2;
        ictx.clearRect(0, 0, iw, ih);
        for (const d of dust) {
            if (mode === 'converge') {
                const dx = cx - d.x, dy = cy - d.y, dist = Math.hypot(dx, dy) || 1;
                // spiral inward
                d.vx += (dx / dist) * 0.045 + (-dy / dist) * 0.03;
                d.vy += (dy / dist) * 0.045 + (dx / dist) * 0.03;
                d.vx *= 0.985; d.vy *= 0.985;
                if (dist < 26) { const a = Math.random() * 6.28, r = Math.max(iw, ih) * (.5 + Math.random() * .3); d.x = cx + Math.cos(a) * r; d.y = cy + Math.sin(a) * r; d.vx = d.vy = 0; }
            } else if (mode === 'explode') {
                d.vx *= 1.04; d.vy *= 1.04;
            }
            d.x += d.vx; d.y += d.vy;
            if (mode === 'idle') {
                if (d.x < 0) d.x = iw; if (d.x > iw) d.x = 0; if (d.y < 0) d.y = ih; if (d.y > ih) d.y = 0;
            }
            const tw = .5 + .5 * Math.sin(t / 600 + d.p);
            ictx.globalAlpha = d.a * (mode === 'idle' ? tw : 1);
            ictx.fillStyle = d.gold ? '#ffe4a0' : '#ffffff';
            const sp = Math.hypot(d.vx, d.vy);
            if (sp > 2.2) {
                ictx.strokeStyle = ictx.fillStyle; ictx.lineWidth = d.r;
                ictx.beginPath(); ictx.moveTo(d.x, d.y); ictx.lineTo(d.x - d.vx * 3, d.y - d.vy * 3); ictx.stroke();
            } else {
                ictx.beginPath(); ictx.arc(d.x, d.y, d.r, 0, 6.283); ictx.fill();
            }
        }
        ictx.globalAlpha = 1;
        if (!finished) rafIntro = requestAnimationFrame(introFrame);
    }
    function explodeDust() {
        const cx = iw / 2, cy = ih / 2;
        dust.forEach(d => {
            const a = Math.random() * 6.28, sp = Math.random() * 9 + 3;
            d.x = cx + (Math.random() - .5) * 40; d.y = cy + (Math.random() - .5) * 40;
            d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp; d.a = 1;
        });
        mode = 'explode';
    }

    // =================================================================
    //  SEQUENCE
    // =================================================================
    function showPhrase(text) {
        textBox.classList.remove('out');
        textBox.textContent = text;
        splitChars(textBox, 0);
        return sleep(1050).then(() => {
            if (skipped) return;
            textBox.classList.add('out');
            return sleep(380);
        });
    }

    async function start() {
        if (started) return;
        started = true;
        J.store.sset('jct_intro_seen', '1');
        audio.volume = 0.9;
        audio.play().then(updateSoundIcon).catch(updateSoundIcon);
        gate.classList.add('gone');
        mode = 'converge';
        setTimeout(() => { if (!skipped) { core.classList.add('grow'); ref.classList.add('show'); skipBtn.classList.add('show'); } }, 400);
        await sleep(700);
        for (const p of PHRASES) { if (skipped) break; await showPhrase(p); }
        if (skipped) return;
        textBox.textContent = '';
        cracks.classList.add('active');
        intro.classList.add('shake');
        setTimeout(() => intro.classList.remove('shake'), 520);
        await sleep(1100);
        intro.classList.add('shake');
        await sleep(1100);
        intro.classList.remove('shake');
        if (skipped) return;
        climax(false);
    }

    function climax(fast) {
        if (finished) return;
        finished = true;
        ref.classList.remove('show');
        skipBtn.classList.remove('show');
        textBox.textContent = '';
        if (!fast) {
            bolt.classList.add('strike');
            explodeDust();
            rafIntro = requestAnimationFrame(introFrame);
            setTimeout(() => { core.classList.add('blast'); shatter(); }, 120);
        }
        clouds.classList.add('on');
        flash.classList.add('on');
        setTimeout(() => {
            showPortal(false);
            intro.classList.add('done');
            cracks.style.display = 'none';
            setTimeout(() => clouds.classList.add('part'), fast ? 100 : 350);
            setTimeout(() => { clouds.remove(); intro.remove(); cancelAnimationFrame(rafIntro); }, 4200);
        }, fast ? 250 : 420);
    }

    function shatter() {
        const n = innerWidth < 600 ? 34 : 60;
        for (let i = 0; i < n; i++) {
            const s = document.createElement('div');
            s.className = 'shard';
            const size = Math.random() * 22 + 8;
            s.style.width = size + 'vmax'; s.style.height = size + 'vmax';
            const r = () => (Math.random() * 100).toFixed(1) + '%';
            s.style.clipPath = `polygon(${r()} ${r()}, ${r()} ${r()}, ${r()} ${r()})`;
            shardsBox.appendChild(s);
            void s.offsetWidth;
            const a = Math.random() * Math.PI * 2, dist = Math.random() * 90 + 90;
            s.style.transform = `translate(${Math.cos(a) * dist}vw, ${Math.sin(a) * dist}vh) rotate(${Math.random() * 1080 - 540}deg) scale(${.6 + Math.random()})`;
            setTimeout(() => { s.style.opacity = '0'; }, 250);
        }
    }

    function skip() {
        if (finished) return;
        skipped = true;
        wakeAll();
        if (!started) { started = true; J.store.sset('jct_intro_seen', '1'); }
        climax(true);
    }

    // ---------------- Portal ----------------
    let portalShown = false;
    function showPortal(instant) {
        if (portalShown) return;
        portalShown = true;
        portal.classList.add('ready');
        portal.removeAttribute('aria-hidden');
        document.body.classList.add('portal-ready');
        video.play().catch(() => { });
        startPortalCanvas();
        if (instant) {
            intro.remove(); clouds.remove();
            finished = true;
        }
        updateSoundIcon();
        setTimeout(() => { const u = $('username'); if (u && !$('auth-forms').hidden && matchMedia('(pointer:fine)').matches) u.focus({ preventScroll: true }); }, 2200);
    }

    function startPortalCanvas() {
        if (reduceMotion) return;
        const c = $('portal-canvas'), ctx = c.getContext('2d');
        let w, h, motes;
        function size() {
            const dpr = Math.min(devicePixelRatio || 1, 1.5);
            w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            motes = Array.from({ length: Math.min(90, Math.round(w * h / 16000)) }, () => mk(true));
        }
        function mk(any) { return { x: Math.random() * w, y: any ? Math.random() * h : h + 10, r: Math.random() * 2.2 + .5, vy: -(Math.random() * .5 + .15), p: Math.random() * 6.28, a: Math.random() * .6 + .25 }; }
        size();
        addEventListener('resize', size);
        let t = 0;
        (function loop() {
            t += .016;
            ctx.clearRect(0, 0, w, h);
            for (const m of motes) {
                m.y += m.vy; m.x += Math.sin(t + m.p) * .25;
                if (m.y < -10) Object.assign(m, mk(false));
                const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
                g.addColorStop(0, `rgba(255,232,170,${m.a})`); g.addColorStop(1, 'rgba(255,232,170,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 4, 0, 6.283); ctx.fill();
            }
            requestAnimationFrame(loop);
        })();
    }

    // ---------------- Sound toggle ----------------
    function updateSoundIcon() {
        const playing = !audio.paused && !audio.ended;
        soundBtn.innerHTML = `<i class="fas ${playing ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
    }
    soundBtn.addEventListener('click', () => {
        if (audio.paused || audio.ended) { if (audio.ended) audio.currentTime = 0; audio.play().catch(() => { }); }
        else audio.pause();
        setTimeout(updateSoundIcon, 50);
    });
    audio.addEventListener('ended', updateSoundIcon);
    audio.addEventListener('pause', updateSoundIcon);
    audio.addEventListener('play', updateSoundIcon);

    // ---------------- Boot ----------------
    const skipIntro = params.has('skip') || J.store.sget('jct_intro_seen') === '1' || reduceMotion;
    sizeIntro();
    addEventListener('resize', sizeIntro);
    if (skipIntro) {
        showPortal(true);
    } else {
        rafIntro = requestAnimationFrame(introFrame);
        intro.addEventListener('click', e => {
            if (e.target.closest('#intro-skip')) return;
            if (!started) start(); else skip();
        });
        skipBtn.addEventListener('click', e => { e.stopPropagation(); skip(); });
        document.addEventListener('keydown', e => {
            if (finished) return;
            if (e.key === 'Escape') skip();
            else if ((e.key === 'Enter' || e.key === ' ') && !started) { e.preventDefault(); start(); }
        });
    }

    // =================================================================
    //  AUTH
    // =================================================================
    const form = $('auth-form'), msg = $('auth-msg'), submitBtn = $('submit-btn');
    const userIn = $('username'), passIn = $('password'), rules = $('rules');
    const tabs = document.querySelector('.auth-tabs');
    let registerMode = false;

    function setMsg(text, type) { msg.textContent = text || ''; msg.className = 'form-msg ' + (type || ''); }
    function setMode(reg) {
        registerMode = reg;
        tabs.classList.toggle('register', reg);
        $('tab-login').classList.toggle('active', !reg);
        $('tab-register').classList.toggle('active', reg);
        $('tab-login').setAttribute('aria-selected', !reg);
        $('tab-register').setAttribute('aria-selected', reg);
        $('auth-heading').textContent = reg ? 'Begin your journey' : 'Enter the gates';
        $('auth-sub').textContent = reg ? 'Create an account to earn Holy Power, ranks and quests.' : 'Log in to continue your spiritual journey.';
        submitBtn.querySelector('span').textContent = reg ? 'Create Account' : 'Login';
        submitBtn.querySelector('i').className = reg ? 'fas fa-dove' : 'fas fa-key';
        passIn.autocomplete = reg ? 'new-password' : 'current-password';
        rules.hidden = !reg;
        setMsg('');
        checkRules();
    }
    $('tab-login').onclick = () => setMode(false);
    $('tab-register').onclick = () => setMode(true);

    function checkRules() {
        if (!registerMode) return;
        const u = userIn.value.trim(), p = passIn.value;
        const set = (k, ok) => rules.querySelector(`[data-rule=${k}]`).classList.toggle('ok', ok);
        set('ulen', !J.validateUsername(u));
        set('plen', p.length >= 8 && p.length <= 30);
        set('pcase', /[A-Z]/.test(p) && /[a-z]/.test(p));
        set('pnum', /\d/.test(p));
        set('pspec', /[^A-Za-z0-9]/.test(p));
    }
    userIn.addEventListener('input', checkRules);
    passIn.addEventListener('input', checkRules);
    $('pw-toggle').onclick = () => {
        const show = passIn.type === 'password';
        passIn.type = show ? 'text' : 'password';
        $('pw-toggle').innerHTML = `<i class="fas ${show ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    };

    async function getCountry() {
        try {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 2500);
            const r = await fetch('https://ipapi.co/json/', { signal: ctl.signal });
            clearTimeout(t);
            const d = await r.json();
            return d.country_name || 'Unknown';
        } catch (e) { return 'Unknown'; }
    }

    function enterSite() {
        const target = J.store.sget('jct_after_login') || 'main.html';
        try { sessionStorage.removeItem('jct_after_login'); } catch (e) { /* ignore */ }
        const veil = document.createElement('div');
        veil.className = 'page-veil';
        veil.style.opacity = '0';
        document.body.appendChild(veil);
        requestAnimationFrame(() => { veil.style.transition = 'opacity .7s ease'; veil.style.opacity = '1'; });
        setTimeout(() => { location.href = /^[\w./?=&-]+$/.test(target) ? target.replace(/^\//, '') : 'main.html'; }, 700);
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const username = userIn.value.trim();
        const password = passIn.value.trim();
        if (!username || !password) return setMsg('Please enter your username and password.', 'error');
        if (registerMode) {
            const err = J.validateUsername(username) || J.validatePassword(password);
            if (err) return setMsg(err, 'error');
        }
        J.setLoading(submitBtn, true);
        setMsg(registerMode ? 'Preparing your place in the Kingdom…' : 'Opening the gates…', 'info');
        try {
            const data = registerMode
                ? await J.rpc('jct_register', { p_username: username, p_password: password, p_country: await getCountry() })
                : await J.rpc('jct_login', { p_username: username, p_password: password });
            J.setSession(data);
            setMsg(registerMode ? 'Welcome to the family! Entering…' : `Welcome back, ${data.username}!`, 'success');
            if (window.JCTFX) window.JCTFX.burst(innerWidth / 2, innerHeight / 2, 80);
            enterSite();
        } catch (err) {
            setMsg(err.message, 'error');
            J.setLoading(submitBtn, false);
            $('auth-card').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(0)' }], { duration: 420 });
        }
    });

    $('btn-guest').addEventListener('click', async () => {
        const btn = $('btn-guest');
        J.setLoading(btn, true);
        setMsg('Entering as a guest…', 'info');
        try {
            const data = await J.rpc('jct_guest_login', { p_country: await getCountry() });
            J.setSession(data);
            setMsg(`Welcome, ${data.username}!`, 'success');
            enterSite();
        } catch (err) {
            setMsg(err.message, 'error');
            J.setLoading(btn, false);
        }
    });

    // Returning visitor?
    async function checkExisting() {
        const s = J.getSession();
        if (!s) return;
        try {
            const me = await J.rpc('jct_whoami', { p_token: s.token });
            if (!me) { J.clearSession(); return; }
            J.updateSessionUser({ username: me.username, is_guest: me.is_guest, is_admin: me.is_admin });
            if (me.is_guest && params.has('register')) return; // guest wants to register
            $('wb-name').textContent = me.username;
            $('wb-sub').textContent = me.is_guest ? 'You are browsing as a guest.' : 'Your journey continues where you left it.';
            if (!me.is_guest) {
                J.rpc('jct_user_profile', { p_username: me.username })
                    .then(u => { $('wb-avatar').innerHTML = J.avatarHTML(u, 'lg'); }).catch(() => { });
            } else {
                $('wb-avatar').innerHTML = `<div class="avatar-frame lg shape-circle color-silver"><img src="${J.DEFAULT_AVATAR}" alt=""></div>`;
            }
            $('auth-forms').hidden = true;
            $('welcome-back').hidden = false;
        } catch (e) { /* offline or not configured: just show forms */ }
    }
    $('wb-continue').onclick = enterSite;
    $('wb-switch').onclick = async () => {
        const s = J.getSession();
        if (s) { try { await J.rpc('jct_logout', { p_token: s.token }); } catch (e) { /* ignore */ } }
        J.clearSession();
        $('welcome-back').hidden = true;
        $('auth-forms').hidden = false;
        userIn.focus();
    };

    if (params.has('register')) setMode(true); else setMode(false);
    if (params.has('expired')) setMsg('Your session expired. Please log in again.', 'info');
    if (!J.configured) setMsg('Site not connected to Supabase yet — add your keys to static/js/config.js.', 'error');
    checkExisting();
})();
