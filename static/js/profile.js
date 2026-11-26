// =====================================================================
//  PROFILE: stats, appearance, friends + chat, leaderboard, quiz arena
// =====================================================================
(function () {
    'use strict';
    const J = window.JCT;
    const $ = id => document.getElementById(id);
    const esc = J.esc;
    const session = J.getSession();
    if (!session) return;

    let me = null; // latest stats payload

    // generic [data-close] buttons inside modals
    document.querySelectorAll('.modal [data-close]').forEach(b => b.addEventListener('click', () => J.closeModal(b.closest('.modal'))));

    // =================================================================
    //  VIEWS
    // =================================================================
    const views = { profile: $('view-profile'), friends: $('view-friends'), leaderboard: $('view-leaderboard') };
    function showView(name) {
        Object.entries(views).forEach(([k, el]) => el.classList.toggle('active', k === name));
        document.querySelectorAll('.profile-switch .tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
        if (name === 'leaderboard') loadLeaderboard();
        if (name === 'friends') loadFriends();
        window.JCTReveal && window.JCTReveal(views[name]);
        history.replaceState(null, '', name === 'profile' ? location.pathname : '#' + name);
    }
    document.querySelectorAll('.profile-switch .tab').forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));

    // =================================================================
    //  STATS
    // =================================================================
    function renderStats(d) {
        if (!d || d.is_guest) return;
        me = d;
        $('my-name').textContent = d.username;
        $('my-avatar').innerHTML = J.avatarHTML(d, 'xl');
        const rank = J.rankFor(d.xp);
        $('rank-badge').innerHTML = `<i class="fas ${rank.icon}"></i> <span>${rank.name}</span>`;
        $('rank-xp').textContent = `${J.fmtNum(d.xp)} XP`;
        $('rank-bar').style.width = rank.pct + '%';
        $('rank-next').textContent = rank.maxed ? 'You have reached the highest rank — Apostle.' : `${J.fmtNum(rank.next - d.xp)} XP until ${rank.nextName}`;
        const since = d.created_at ? J.parseDate(d.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
        $('my-meta').innerHTML = [since && `<i class="fas fa-calendar"></i> Joined ${esc(since)}`, d.country && d.country !== 'Unknown' && `<i class="fas fa-location-dot"></i> ${esc(d.country)}`,
            `<i class="fas fa-user-group"></i> ${J.fmtNum(d.friends_count)} friends`].filter(Boolean).join('<span class="dot">·</span>');

        $('st-time').textContent = J.fmtDuration(d.total_time);
        $('st-hp').textContent = J.fmtNum(d.holypower);
        $('st-xp').textContent = J.fmtNum(d.xp);
        $('st-streak').textContent = J.fmtNum(d.daily_streak);
        $('st-quiz').textContent = J.fmtNum(d.quizzes_passed);
        $('st-quests').textContent = J.fmtNum(d.quests_done);

        $('ms-current').textContent = 'Now: ' + J.fmtDuration(d.total_time);
        $('ms-target').textContent = 'Next: ' + J.fmtDuration(d.next_milestone);
        const range = Math.max(1, d.next_milestone - d.prev_milestone);
        $('ms-bar').style.width = Math.min(100, Math.max(0, (d.total_time - d.prev_milestone) / range * 100)) + '%';
        $('ms-hp').textContent = '+' + J.fmtNum(d.next_reward);
        $('ms-xp').textContent = '+' + J.fmtNum(d.next_xp);
        renderDailyTile();
    }
    async function loadStats() {
        try { renderStats(await J.call('jct_sync_time', { p_seconds: 0 })); }
        catch (e) { J.toast(e.message, 'error'); }
    }
    window.addEventListener('jct:stats', e => renderStats(e.detail));

    // =================================================================
    //  USERNAME
    // =================================================================
    $('btn-edit-name').addEventListener('click', async () => {
        const name = await J.promptDialog('Change Username', me ? me.username : session.username,
            { message: '8–20 characters with an uppercase letter, a lowercase letter and a number.', maxlength: 20 });
        if (name == null) return;
        const v = name.trim();
        const err = J.validateUsername(v);
        if (err) return J.toast(err, 'error');
        try {
            const r = await J.call('jct_change_username', { p_new_username: v });
            J.updateSessionUser({ username: r.username });
            J.toast('Your name has been renewed!', 'success');
            loadStats();
        } catch (e) { J.toast(e.message, 'error'); }
    });

    // =================================================================
    //  APPEARANCE
    // =================================================================
    let draft = {}, apTab = 'avatar';
    function renderPreview() { $('ap-preview').innerHTML = J.avatarHTML(draft, 'xl'); }
    function renderApGrid() {
        const grid = $('ap-grid');
        let items = '';
        if (apTab === 'avatar') {
            const custom = draft.avatar_url && draft.avatar_url.startsWith('data:') ? [draft.avatar_url] : [];
            items = [...custom, ...J.AVATARS].map(src => `<button class="ap-opt ${src === draft.avatar_url ? 'selected' : ''}" data-k="avatar_url" data-v="${esc(src)}"><img src="${esc(src)}" alt=""></button>`).join('')
                + `<button class="ap-opt upload" id="ap-up-btn"><i class="fas fa-upload"></i><span>Upload</span></button>`;
        } else if (apTab === 'frame') {
            items = J.FRAMES.map(f => `<button class="ap-opt ${f.id === draft.avatar_frame ? 'selected' : ''}" data-k="avatar_frame" data-v="${f.id}">
                <span class="mini-shape ${f.id}"></span><span>${f.name}</span></button>`).join('');
        } else if (apTab === 'color') {
            items = J.COLORS.map(c => `<button class="ap-opt ${c.id === draft.avatar_color ? 'selected' : ''}" data-k="avatar_color" data-v="${c.id}">
                <span class="swatch" style="background:${c.hex};box-shadow:0 0 16px ${c.hex}"></span><span>${c.name}</span></button>`).join('');
        } else {
            items = J.EFFECTS.map(f => `<button class="ap-opt ${f.id === draft.avatar_effect ? 'selected' : ''}" data-k="avatar_effect" data-v="${f.id}">
                <span class="avatar-frame sm shape-circle color-gold ${f.id}" style="--size:46px"><img src="${esc(J.safeImg(draft.avatar_url))}" alt=""></span><span>${f.name}</span></button>`).join('');
        }
        grid.innerHTML = items;
        const up = $('ap-up-btn');
        if (up) up.onclick = () => $('ap-upload').click();
    }
    $('ap-grid').addEventListener('click', e => {
        const b = e.target.closest('.ap-opt[data-k]');
        if (!b) return;
        draft[b.dataset.k] = b.dataset.v;
        renderPreview(); renderApGrid();
    });
    document.querySelectorAll('[data-ap]').forEach(t => t.addEventListener('click', () => {
        apTab = t.dataset.ap;
        document.querySelectorAll('[data-ap]').forEach(x => x.classList.toggle('active', x === t));
        renderApGrid();
    }));
    $('ap-upload').addEventListener('change', async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try {
            draft.avatar_url = await J.compressImage(f, 360, 0.82);
            renderPreview(); renderApGrid();
        } catch (err) { J.toast(err.message, 'error'); }
    });
    $('btn-appearance').addEventListener('click', () => {
        draft = {
            avatar_url: me ? me.avatar_url : J.DEFAULT_AVATAR, avatar_frame: me ? me.avatar_frame : 'shape-arch',
            avatar_color: me ? me.avatar_color : 'color-gold', avatar_effect: me ? me.avatar_effect : 'effect-none'
        };
        renderPreview(); renderApGrid();
        J.openModal('appearance-modal');
    });
    $('ap-save').addEventListener('click', async () => {
        const btn = $('ap-save');
        J.setLoading(btn, true);
        try {
            await J.call('jct_save_avatar', { p_avatar_url: draft.avatar_url, p_frame: draft.avatar_frame, p_color: draft.avatar_color, p_effect: draft.avatar_effect });
            J.closeModal('appearance-modal');
            J.toast('Your appearance shines anew!', 'success');
            const navImg = document.querySelector('#nav-avatar img');
            if (navImg) navImg.src = J.safeImg(draft.avatar_url);
            loadStats();
        } catch (e) { J.toast(e.message, 'error'); }
        J.setLoading(btn, false);
    });

    // =================================================================
    //  FRIENDS
    // =================================================================
    let friends = [];
    async function loadFriends() {
        try {
            const [list, reqs] = await Promise.all([J.call('jct_friends'), J.call('jct_friend_requests')]);
            friends = list || [];
            renderFriends();
            renderRequests(reqs || []);
        } catch (e) { $('friend-list').innerHTML = `<div class="empty-state"><i class="fas fa-cloud"></i>${esc(e.message)}</div>`; }
    }
    function renderFriends() {
        const unread = friends.reduce((n, f) => n + Number(f.unread || 0), 0);
        const badge = $('friends-badge');
        badge.hidden = !unread; badge.textContent = unread;
        $('friend-list').innerHTML = friends.length ? friends.map(f => `
            <div class="user-row" data-user="${esc(f.username)}">
                ${J.avatarHTML(f, 'sm')}
                <div style="flex:1;min-width:0">
                    <div class="name">${esc(f.username)}</div>
                    <div class="meta"><span class="status-dot ${f.online ? 'on' : ''}" style="display:inline-block;width:8px;height:8px"></span> ${f.online ? 'Online' : 'Offline'} · ${J.rankFor(f.xp).name}</div>
                </div>
                ${Number(f.unread) ? `<span class="unread-badge">${f.unread}</span>` : ''}
                <div class="actions">
                    <button class="icon-btn" data-act="chat" title="Chat" aria-label="Chat"><i class="fas fa-comment-dots"></i></button>
                    <button class="icon-btn" data-act="view" title="View profile" aria-label="View profile"><i class="fas fa-id-badge"></i></button>
                    <button class="icon-btn danger" data-act="remove" title="Unfriend" aria-label="Unfriend"><i class="fas fa-user-minus"></i></button>
                </div>
            </div>`).join('')
            : `<div class="empty-state"><i class="fas fa-dove"></i>No friends yet. Find believers to walk with!</div>`;
    }
    function renderRequests(reqs) {
        $('request-list').innerHTML = reqs.length ? reqs.map(r => `
            <div class="user-row" data-user="${esc(r.sender_username)}">
                ${J.avatarHTML(r, 'sm')}
                <span class="name">${esc(r.sender_username)}</span>
                <div class="actions">
                    <button class="icon-btn" data-act="accept" title="Accept" aria-label="Accept" style="color:var(--ok)"><i class="fas fa-check"></i></button>
                    <button class="icon-btn danger" data-act="decline" title="Decline" aria-label="Decline"><i class="fas fa-xmark"></i></button>
                </div>
            </div>`).join('') : `<div class="empty-state" style="padding:20px"><i class="fas fa-envelope"></i>No pending requests.</div>`;
    }
    document.addEventListener('click', async e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const row = btn.closest('[data-user]');
        const user = row && row.dataset.user;
        const act = btn.dataset.act;
        if (!user) return;
        if (act === 'chat') openChat(user);
        else if (act === 'view') openFriendProfile(user);
        else if (act === 'remove') {
            if (!await J.confirmDialog(`Unfriend ${user}?`, 'You will no longer be able to chat with each other.', { danger: true, ok: 'Unfriend' })) return;
            try { await J.call('jct_remove_friend', { p_friend: user }); J.toast(`${user} removed.`); loadFriends(); } catch (err) { J.toast(err.message, 'error'); }
        } else if (act === 'accept' || act === 'decline') {
            try {
                await J.call('jct_respond_friend_request', { p_sender: user, p_action: act });
                J.toast(act === 'accept' ? `You and ${user} are now friends!` : 'Request declined.', act === 'accept' ? 'success' : 'info');
                loadFriends(); loadStats();
            } catch (err) { J.toast(err.message, 'error'); }
        } else if (act === 'add') {
            J.setLoading(btn, true);
            try { await J.call('jct_send_friend_request', { p_receiver: user }); J.toast(`Friend request sent to ${user}!`, 'success'); btn.outerHTML = '<span class="chip">Sent</span>'; }
            catch (err) { J.toast(err.message, 'error'); J.setLoading(btn, false); }
        }
    });

    // search
    let searchT;
    async function doSearch() {
        const box = $('search-results');
        try {
            const users = await J.call('jct_search_users', { p_query: $('search-input').value.trim() });
            box.innerHTML = users.length ? users.map(u => `
                <div class="user-row" data-user="${esc(u.username)}">
                    ${J.avatarHTML(u, 'sm')}
                    <div style="flex:1;min-width:0"><div class="name">${esc(u.username)}</div><div class="meta">${J.rankFor(u.xp).name}</div></div>
                    ${u.is_friend ? '<span class="chip ok">Friend</span>' : `<button class="btn btn-sm" data-act="add"><i class="fas fa-user-plus"></i> Add</button>`}
                </div>`).join('') : `<div class="empty-state"><i class="fas fa-wind"></i>No believers found.</div>`;
        } catch (e) { box.innerHTML = `<div class="empty-state">${esc(e.message)}</div>`; }
    }
    $('btn-add-friend').addEventListener('click', () => { $('search-input').value = ''; J.openModal('search-modal'); doSearch(); setTimeout(() => $('search-input').focus(), 100); });
    $('search-input').addEventListener('input', () => { clearTimeout(searchT); searchT = setTimeout(doSearch, 250); });

    async function openFriendProfile(user) {
        $('fp-name').textContent = user;
        $('fp-avatar').innerHTML = '';
        $('fp-rank').textContent = '…';
        $('fp-stats').innerHTML = '<div class="skeleton" style="height:120px;grid-column:1/-1"></div>';
        J.openModal('fp-modal');
        try {
            const d = await J.rpc('jct_user_profile', { p_username: user });
            const r = J.rankFor(d.xp);
            $('fp-avatar').innerHTML = J.avatarHTML(d, 'lg');
            $('fp-rank').innerHTML = `<i class="fas ${r.icon}"></i> ${r.name}`;
            $('fp-stats').innerHTML = [
                ['fa-hourglass-half', J.fmtDuration(d.total_time), 'Active'], ['fa-coins', J.fmtNum(d.holypower), 'Holy Power'],
                ['fa-star', J.fmtNum(d.xp), 'XP'], ['fa-fire', J.fmtNum(d.daily_streak), 'Streak'],
                ['fa-scroll', J.fmtNum(d.quizzes_passed), 'Quizzes'], ['fa-shield-halved', J.fmtNum(d.quests_done), 'Quests']
            ].map(s => `<div><i class="fas ${s[0]}"></i><b>${s[1]}</b><span>${s[2]}</span></div>`).join('');
        } catch (e) { $('fp-stats').innerHTML = `<div class="empty-state">${esc(e.message)}</div>`; }
    }

    // =================================================================
    //  CHAT
    // =================================================================
    let chatWith = null, chatTimer = null, lastChatSig = '';
    const EMOJI = ['🙏', '✝️', '🕊️', '📖', '🙌', '❤️', '😇', '✨', '🔥', '😀', '😂', '🥰', '💪', '👑', '🌅', '🎉'];
    $('emoji-bar').innerHTML = EMOJI.map(e => `<button type="button">${e}</button>`).join('');
    $('emoji-bar').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { $('chat-text').value += b.textContent; $('chat-text').focus(); } });
    $('chat-emoji').onclick = () => { $('emoji-bar').hidden = !$('emoji-bar').hidden; };

    function openChat(user) {
        chatWith = user;
        lastChatSig = '';
        const f = friends.find(x => x.username === user) || {};
        $('chat-name').textContent = user;
        $('chat-avatar').innerHTML = J.avatarHTML(f, 'sm');
        $('chat-body').innerHTML = '<div class="skeleton" style="height:40px;width:60%"></div>';
        $('emoji-bar').hidden = true;
        J.openModal('chat-modal');
        pollChat();
        clearInterval(chatTimer);
        chatTimer = setInterval(() => { if (document.visibilityState === 'visible') pollChat(); }, 3000);
        setTimeout(() => $('chat-text').focus(), 200);
    }
    $('chat-modal').addEventListener('modal:closed', () => { clearInterval(chatTimer); chatWith = null; loadFriends(); });

    async function pollChat() {
        if (!chatWith) return;
        const who = chatWith;
        try {
            const d = await J.call('jct_chat_history', { p_friend: who });
            if (who !== chatWith) return;
            $('chat-status').textContent = d.online ? 'Online' : 'Offline';
            $('chat-status').className = d.online ? 'on' : '';
            const sig = JSON.stringify(d.messages.map(m => [m.id, m.read_status]));
            if (sig === lastChatSig) return;
            lastChatSig = sig;
            renderMessages(d.messages, d.online);
        } catch (e) { /* keep trying */ }
    }
    function renderMessages(msgs, online) {
        const body = $('chat-body');
        const nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
        let lastDay = '';
        body.innerHTML = msgs.length ? msgs.map(m => {
            const d = J.parseDate(m.created_at);
            const day = dayLabel(d);
            const mine = m.sender !== chatWith;
            const ticks = mine ? (m.read_status === 'read' ? '<i class="fas fa-check-double read"></i>' : online ? '<i class="fas fa-check-double"></i>' : '<i class="fas fa-check"></i>') : '';
            const content = m.file_url && String(m.file_url).startsWith('data:image/')
                ? `<img src="${esc(m.file_url)}" alt="Shared image" loading="lazy">` : '';
            const sep = day !== lastDay ? `<div class="chat-day">${day}</div>` : '';
            lastDay = day;
            return `${sep}<div class="bubble-row ${mine ? 'me' : ''}"><div class="bubble">${content}${m.message ? `<span>${esc(m.message)}</span>` : ''}
                <small>${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${ticks}</small></div></div>`;
        }).join('') : `<div class="empty-state"><i class="fas fa-dove"></i>Say peace be with you 👋</div>`;
        if (nearBottom || !body.dataset.init) { body.scrollTop = body.scrollHeight; body.dataset.init = '1'; }
    }
    function dayLabel(d) {
        const t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
        if (d.toDateString() === t.toDateString()) return 'Today';
        if (d.toDateString() === y.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    async function sendChat(file) {
        const text = $('chat-text').value.trim();
        if (!text && !file) return;
        $('chat-text').value = '';
        $('emoji-bar').hidden = true;
        try {
            await J.call('jct_send_message', { p_receiver: chatWith, p_message: text || null, p_file_url: file || null });
            $('chat-body').dataset.init = '';
            pollChat();
        } catch (e) { J.toast(e.message, 'error'); if (text) $('chat-text').value = text; }
    }
    $('chat-send').onclick = () => sendChat();
    $('chat-text').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });
    $('chat-attach').onclick = () => $('chat-file').click();
    $('chat-file').addEventListener('change', async e => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        try { sendChat(await J.compressImage(f, 1024, 0.8)); } catch (err) { J.toast(err.message, 'error'); }
    });

    // =================================================================
    //  LEADERBOARD
    // =================================================================
    let lbCat = 'time', lbPeriod = 'daily', lbTimer = null;
    const REWARDS = { daily: [200, 100, 50], weekly: [2000, 1500, 1000], monthly: [15000, 10000, 7500] };
    const SCORE = {
        time: ['Active Time', v => J.fmtDuration(v)], holypower: ['Holy Power', v => `${J.fmtNum(v)} <i class="fas fa-coins text-gold"></i>`],
        xp: ['Experience', v => `${J.fmtNum(v)} XP`], quizzes: ['Quizzes Passed', v => J.fmtNum(v)],
        quests: ['Quests Done', v => J.fmtNum(v)], streak: ['Day Streak', v => `${J.fmtNum(v)} <i class="fas fa-fire" style="color:var(--ember)"></i>`]
    };
    document.querySelectorAll('#lb-cats .tab').forEach(t => t.addEventListener('click', () => {
        lbCat = t.dataset.cat;
        document.querySelectorAll('#lb-cats .tab').forEach(x => x.classList.toggle('active', x === t));
        loadLeaderboard();
    }));
    document.querySelectorAll('#lb-periods .tab').forEach(t => t.addEventListener('click', () => {
        lbPeriod = t.dataset.period;
        document.querySelectorAll('#lb-periods .tab').forEach(x => x.classList.toggle('active', x === t));
        loadLeaderboard();
    }));
    async function loadLeaderboard() {
        const isTime = lbCat === 'time';
        $('lb-periods').style.display = isTime ? '' : 'none';
        $('lb-timer').style.display = isTime && lbPeriod !== 'all_time' ? '' : 'none';
        $('lb-score-head').textContent = SCORE[lbCat][0];
        $('lb-body').innerHTML = `<tr><td colspan="4"><div class="skeleton" style="height:40px"></div></td></tr>`;
        $('podium').innerHTML = '';
        try {
            const d = await J.rpc('jct_leaderboard', { p_category: lbCat, p_period: lbPeriod });
            $('lb-total').textContent = J.fmtNum(d.totalUsers);
            const rewards = isTime ? (REWARDS[lbPeriod] || []) : [];
            const fmt = SCORE[lbCat][1];
            const users = d.users || [];
            const myName = (J.getSession() || {}).username;
            // podium
            const order = [1, 0, 2].filter(i => users[i]);
            $('podium').innerHTML = order.map(i => {
                const u = users[i];
                return `<div class="pod pod-${i + 1}">${J.avatarHTML(u, i === 0 ? 'lg' : 'md')}
                    <div class="pod-place">${['🏆', '🥈', '🥉'][i]}</div>
                    <strong>${esc(u.username)}</strong><span>${fmt(u[d.sortCol])}</span>
                    <div class="pod-step">${i + 1}</div></div>`;
            }).join('');
            $('lb-body').innerHTML = users.length ? users.map((u, i) => `
                <tr class="${u.username === myName ? 'is-me' : ''}">
                    <td class="lb-rank r${i + 1}">${i < 3 ? ['🏆', '🥈', '🥉'][i] : i + 1}</td>
                    <td><div class="lb-user">${J.avatarHTML(u, 'xs')}<span>${esc(u.username)}</span></div></td>
                    <td>${fmt(u[d.sortCol])}</td>
                    <td class="text-gold">${rewards[i] ? `+${J.fmtNum(rewards[i])} <i class="fas fa-coins"></i> &amp; <span class="text-sky">+${J.fmtNum(rewards[i])} XP</span>` : '<span class="text-muted">—</span>'}</td>
                </tr>`).join('') : `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-seedling"></i>No one yet — be the first!</div></td></tr>`;
            // countdown
            clearInterval(lbTimer);
            const target = d.timers && Number(d.timers[lbPeriod + '_reset']);
            if (isTime && target) {
                const tick = () => {
                    const left = target - Date.now();
                    if (left <= 0) { clearInterval(lbTimer); $('lb-countdown').textContent = 'Resetting…'; setTimeout(loadLeaderboard, 3000); }
                    else $('lb-countdown').textContent = J.fmtCountdown(left);
                };
                tick(); lbTimer = setInterval(tick, 1000);
            }
        } catch (e) { $('lb-body').innerHTML = `<tr><td colspan="4"><div class="empty-state">${esc(e.message)}</div></td></tr>`; }
    }

    // =================================================================
    //  QUIZ
    // =================================================================
    const DIFFS = [
        { id: 'easy', name: 'Easy', hp: 200, xp: 200, icon: 'fa-seedling' },
        { id: 'medium', name: 'Medium', hp: 300, xp: 500, icon: 'fa-leaf' },
        { id: 'hard', name: 'Hard', hp: 500, xp: 1000, icon: 'fa-tree' },
        { id: 'difficult', name: 'Difficult', hp: 800, xp: 2500, icon: 'fa-mountain' },
        { id: 'extreme', name: 'Extreme', hp: 1400, xp: 5000, icon: 'fa-bolt' },
        { id: 'insane', name: 'Insane', hp: 2000, xp: 8000, icon: 'fa-fire' },
        { id: 'impossible', name: 'Impossible', hp: 4000, xp: 14000, icon: 'fa-crown' }
    ];
    const ALL_REWARDS = Object.fromEntries(DIFFS.map(d => [d.id, d]).concat([['daily', { hp: 1000, xp: 500, name: 'Daily' }]]));
    $('diff-list').innerHTML = DIFFS.map(d => `
        <div class="diff-row diff-${d.id}">
            <button class="diff-play" data-diff="${d.id}"><i class="fas ${d.icon}"></i><span><strong>${d.name}</strong><small>+${J.fmtNum(d.hp)} HP · +${J.fmtNum(d.xp)} XP</small></span></button>
            <button class="icon-btn" data-qlb="${d.id}" title="${d.name} leaderboard" aria-label="${d.name} leaderboard"><i class="fas fa-trophy"></i></button>
        </div>`).join('') + `<div class="diff-row"><button class="diff-play" data-qlb-open="daily"><i class="fas fa-sun"></i><span><strong>Daily Quiz Leaderboard</strong><small>Fastest perfect scores</small></span></button></div>`;
    $('diff-list').addEventListener('click', e => {
        const play = e.target.closest('[data-diff]');
        const lb = e.target.closest('[data-qlb],[data-qlb-open]');
        if (play) { J.closeModal('arena-modal'); setTimeout(() => startQuiz(play.dataset.diff), 380); }
        else if (lb) openQuizBoard(lb.dataset.qlb || lb.dataset.qlbOpen);
    });
    $('tile-arena').addEventListener('click', () => J.openModal('arena-modal'));

    let dailyTimer;
    function dailyDone() { return me && me.last_quiz_date && me.today && String(me.last_quiz_date).slice(0, 10) === me.today; }
    function nextSgMidnight() {
        const now = Date.now(), sg = new Date(now + 8 * 3600e3);
        sg.setUTCHours(24, 0, 0, 0);
        return sg.getTime() - 8 * 3600e3;
    }
    function renderDailyTile() {
        const tile = $('tile-daily');
        clearInterval(dailyTimer);
        if (dailyDone()) {
            tile.classList.add('done');
            const tick = () => {
                const left = nextSgMidnight() - Date.now();
                $('daily-status').innerHTML = `<i class="fas fa-check"></i> Completed · next in ${J.fmtCountdown(left)}`;
                if (left <= 0) { clearInterval(dailyTimer); loadStats(); }
            };
            tick(); dailyTimer = setInterval(tick, 1000);
        } else {
            tile.classList.remove('done');
            $('daily-status').textContent = '+1,000 Holy Power · +500 XP';
        }
    }
    $('tile-daily').addEventListener('click', () => {
        if (dailyDone()) return J.toast('You have already taken today’s Daily Quiz. Come back after midnight (SGT)!');
        startQuiz('daily');
    });

    let Q = null; // quiz state
    function pick(diff, n) { return window.QUIZ_BANK.filter(q => q.diff === diff).sort(() => Math.random() - .5).slice(0, n); }
    function startQuiz(mode) {
        const questions = mode === 'daily'
            ? [...pick('easy', 2), ...pick('medium', 2), ...pick('hard', 2), ...pick('difficult', 1), ...pick('extreme', 1), ...pick('insane', 1), ...pick('impossible', 1)]
            : pick(mode, 15);
        Q = { mode, questions, i: 0, lives: 3, correct: 0, start: Date.now(), sel: -1, locked: false, timer: null };
        Q.timer = setInterval(() => {
            const s = Math.floor((Date.now() - Q.start) / 1000);
            $('qz-timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        }, 1000);
        $('qz-timer').textContent = '00:00';
        renderLives();
        loadQuestion();
        J.openModal('quiz-modal');
    }
    function renderLives() {
        $('qz-lives').innerHTML = [0, 1, 2].map(i => `<i class="fas fa-cross ${i >= Q.lives ? 'lost' : ''}"></i>`).join('');
    }
    function loadQuestion() {
        const q = Q.questions[Q.i];
        Q.sel = -1; Q.locked = false;
        $('qz-progress').textContent = `${Q.i + 1} / ${Q.questions.length}`;
        $('qz-bar').style.width = (Q.i / Q.questions.length * 100) + '%';
        $('qz-diff').textContent = q.diff;
        $('qz-diff').className = 'diff-badge d-' + q.diff;
        const qe = $('qz-question');
        qe.textContent = q.q;
        qe.classList.remove('in'); void qe.offsetWidth; qe.classList.add('in');
        $('qz-options').innerHTML = q.opts.map((o, i) => `<button class="qz-opt" data-i="${i}" style="--d:${i * 60}ms"><span class="qz-letter">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('');
        $('qz-submit').disabled = true;
        $('qz-submit').hidden = false;
    }
    $('qz-options').addEventListener('click', e => {
        const b = e.target.closest('.qz-opt');
        if (!b || Q.locked || b.classList.contains('wrong')) return;
        Q.sel = +b.dataset.i;
        document.querySelectorAll('.qz-opt').forEach(x => x.classList.toggle('selected', x === b));
        $('qz-submit').disabled = false;
    });
    $('qz-submit').addEventListener('click', () => {
        if (Q.sel < 0 || Q.locked) return;
        const q = Q.questions[Q.i];
        const btn = document.querySelector(`.qz-opt[data-i="${Q.sel}"]`);
        btn.classList.remove('selected');
        if (Q.sel === q.ans) {
            Q.locked = true; Q.correct++;
            btn.classList.add('correct');
            const r = btn.getBoundingClientRect();
            window.JCTFX && window.JCTFX.burst(r.left + r.width / 2, r.top + r.height / 2, 26);
            $('qz-submit').hidden = true;
            setTimeout(() => { Q.i++; if (Q.i >= Q.questions.length) finishQuiz('pass'); else loadQuestion(); }, 1300);
        } else {
            btn.classList.add('wrong');
            Q.lives--; Q.sel = -1;
            $('qz-submit').disabled = true;
            renderLives();
            document.querySelector('.quiz-dialog').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 });
            if (Q.lives <= 0) {
                Q.locked = true;
                document.querySelector(`.qz-opt[data-i="${q.ans}"]`).classList.add('correct');
                $('qz-submit').hidden = true;
                setTimeout(() => finishQuiz('fail'), 1800);
            }
        }
    });
    $('qz-resign').addEventListener('click', async () => {
        if (await J.confirmDialog('Resign this quiz?', 'It will count as a failed attempt.', { danger: true, ok: 'Resign' })) finishQuiz('fail');
    });

    async function finishQuiz(status) {
        if (!Q || Q.finished) return;
        Q.finished = true;
        clearInterval(Q.timer);
        const secs = Math.floor((Date.now() - Q.start) / 1000);
        const mode = Q.mode;
        J.closeModal('quiz-modal');
        let res = null, err = null;
        try {
            res = await J.call('jct_submit_quiz', { p_status: status, p_mode: mode, p_correct: Q.correct, p_time: secs });
        } catch (e) { err = e.message; }
        const pass = status === 'pass';
        const r = ALL_REWARDS[mode];
        $('res-icon').innerHTML = `<i class="fas ${pass ? 'fa-crown' : 'fa-book-bible'}"></i>`;
        $('res-icon').className = 'res-icon ' + (pass ? 'win' : 'lose');
        $('res-title').textContent = pass ? 'Glory to God!' : 'Keep Seeking';
        $('res-sub').textContent = err ? err : pass
            ? `You conquered the ${r.name} quiz.${res && res.isNewRecord ? ' New personal record!' : ''}`
            : `You answered ${Q.correct} correctly. Read the Word and try again!`;
        $('res-stats').innerHTML = [
            ['fa-check', Q.correct, 'Correct'], ['fa-stopwatch', `${Math.floor(secs / 60)}m ${secs % 60}s`, 'Time'],
            pass ? ['fa-coins', '+' + J.fmtNum(r.hp), 'Holy Power'] : ['fa-heart-crack', 0, 'Lives left'],
            pass ? ['fa-star', '+' + J.fmtNum(r.xp), 'XP'] : null
        ].filter(Boolean).map(s => `<div><i class="fas ${s[0]}"></i><b>${s[1]}</b><span>${s[2]}</span></div>`).join('');
        $('res-board').onclick = () => { J.closeModal('result-modal'); setTimeout(() => openQuizBoard(mode), 380); };
        setTimeout(() => {
            J.openModal('result-modal');
            if (pass && window.JCTFX) window.JCTFX.burst(innerWidth / 2, innerHeight / 3, 120);
        }, 380);
        loadStats();
    }

    async function openQuizBoard(mode) {
        const name = mode === 'daily' ? 'Daily Quiz' : ALL_REWARDS[mode].name + ' Quiz';
        $('qlb-title').textContent = `${name} Leaderboard`;
        $('qlb-mine').textContent = 'Loading…';
        $('qlb-body').innerHTML = `<tr><td colspan="5"><div class="skeleton" style="height:36px"></div></td></tr>`;
        J.openModal('qlb-modal');
        try {
            const d = await J.call('jct_quiz_leaderboard', { p_mode: mode });
            const t = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
            const mine = d.userRecord;
            $('qlb-mine').innerHTML = mine ? `Your best: <b class="text-gold">${mine.correct_count} correct</b> in <b class="text-sky">${t(mine.time_taken)}</b> · ${mine.status === 'pass' ? '<span class="chip ok">Passed</span>' : '<span class="chip danger">Failed</span>'}` : 'No record yet — play to claim your place!';
            const rows = d.topRecords || [];
            $('qlb-body').innerHTML = rows.length ? rows.map((r, i) => `<tr class="${mine && r.username === mine.username ? 'is-me' : ''}">
                <td>${i < 3 ? ['🏆', '🥈', '🥉'][i] : i + 1}</td><td>${esc(r.username)}</td><td class="text-gold">${r.correct_count}</td>
                <td class="text-sky">${t(r.time_taken)}</td><td>${r.status === 'pass' ? '<span class="chip ok">Pass</span>' : '<span class="chip danger">Fail</span>'}</td></tr>`).join('')
                : `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-seedling"></i>No records yet. Be the first!</div></td></tr>`;
        } catch (e) { $('qlb-body').innerHTML = `<tr><td colspan="5">${esc(e.message)}</td></tr>`; }
    }

    // =================================================================
    //  BOOT
    // =================================================================
    loadStats().then(() => {
        if (location.hash === '#quiz') J.openModal('arena-modal');
    });
    loadFriends();
    const h = location.hash.replace('#', '');
    if (h === 'friends' || h === 'leaderboard') showView(h);
    setInterval(() => { if (document.visibilityState === 'visible' && views.friends.classList.contains('active') && !chatWith) loadFriends(); }, 20000);
})();
