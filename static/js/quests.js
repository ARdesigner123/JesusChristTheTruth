// =====================================================================
//  QUESTS + ACHIEVEMENTS
// =====================================================================
(function () {
    'use strict';
    const J = window.JCT;
    const $ = id => document.getElementById(id);
    if (!J.getSession()) return;

    const ICONS = {
        dq_devotion: 'fa-sun', dq_pilgrim: 'fa-person-walking', dq_identity: 'fa-signature', dq_visage: 'fa-wand-magic-sparkles',
        dq_step: 'fa-seedling', dq_scholar: 'fa-book-open', dq_fellowship: 'fa-handshake', dq_guidebot: 'fa-robot',
        dq_chat_friend: 'fa-comments', dq_like_post: 'fa-heart', dq_add_topic: 'fa-bullhorn', dq_add_testimony: 'fa-hands-praying',
        wq_scholar: 'fa-graduation-cap', wq_sabbath: 'fa-mug-hot', wq_social: 'fa-user-group', wq_knowledge: 'fa-tree',
        wq_consecration: 'fa-coins', wq_messenger: 'fa-envelope', wq_steadfast: 'fa-fire', wq_daily_quiz_4: 'fa-calendar-check',
        wq_trial_fire: 'fa-mountain', wq_extreme_faith: 'fa-bolt', wq_daily_quests_12: 'fa-crown',
        mq_devotion: 'fa-scroll', mq_true_believer: 'fa-fire-flame-curved', mq_theologian: 'fa-landmark', mq_guide: 'fa-people-group',
        mq_pilgrimage: 'fa-route', mq_generosity: 'fa-palette', mq_exalted: 'fa-hands-praying', mq_saintly: 'fa-trophy'
    };
    const UNIT = { dq_pilgrim: 'min', wq_sabbath: 'min', mq_pilgrimage: 'h' };

    let period = 'daily', resetAt = 0, timer;

    document.querySelectorAll('#main-tabs .tab').forEach(t => t.addEventListener('click', () => {
        document.querySelectorAll('#main-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
        $('sec-quests').hidden = t.dataset.main !== 'quests';
        $('sec-achievements').hidden = t.dataset.main !== 'achievements';
        if (t.dataset.main === 'achievements') loadAchievements();
    }));
    document.querySelectorAll('#period-tabs .tab').forEach(t => t.addEventListener('click', () => {
        period = t.dataset.period;
        document.querySelectorAll('#period-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
        load();
    }));

    function card(q, prog, i) {
        const max = Number(q.max), val = Math.min(max, Number(prog) || 0);
        const done = val >= max;
        const pct = Math.round(val / max * 100);
        const shown = UNIT[q.id] === 'h' ? val.toFixed(1) : Math.floor(val);
        return `<article class="quest ${done ? 'done' : ''}" style="--d:${i * 70}ms">
            <div class="q-icon"><i class="fas ${done ? 'fa-check' : (ICONS[q.id] || 'fa-star')}"></i></div>
            <div class="q-body">
                <h3>${J.esc(q.title)}</h3>
                <p>${J.esc(q.desc)}</p>
                <div class="progress ${done ? '' : 'sky'}"><span data-w="${pct}"></span></div>
                <div class="q-foot"><span>${shown} / ${max}${UNIT[q.id] ? ' ' + UNIT[q.id] : ''}</span><span>${pct}%</span></div>
            </div>
            <div class="q-rewards">
                <span class="chip"><i class="fas fa-coins"></i> +${J.fmtNum(q.rewardHP)}</span>
                <span class="chip sky">+${J.fmtNum(q.rewardXP)} XP</span>
            </div>
        </article>`;
    }

    async function load() {
        $('active-list').innerHTML = '<div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px"></div>';
        $('done-list').innerHTML = '';
        try {
            const d = await J.call('jct_get_quests', { p_period: period });
            resetAt = Number(d.reset_at);
            const quests = d.assigned_quests || [], prog = d.progress || {};
            const active = quests.filter(q => (Number(prog[q.id]) || 0) < Number(q.max));
            const done = quests.filter(q => (Number(prog[q.id]) || 0) >= Number(q.max));
            $('active-list').innerHTML = active.length ? active.map((q, i) => card(q, prog[q.id], i)).join('')
                : `<div class="empty-state"><i class="fas fa-dove"></i>All ${period} quests completed. Rest well, faithful servant.</div>`;
            $('done-list').innerHTML = done.length ? done.map((q, i) => card(q, prog[q.id], i)).join('')
                : `<div class="empty-state" style="padding:20px"><i class="fas fa-hourglass-start"></i>Nothing completed yet this ${period.replace('ly', '').replace('dai', 'day')}.</div>`;
            const earned = done.reduce((s, q) => s + Number(q.rewardHP), 0);
            $('quest-summary').innerHTML = `<b>${done.length}</b> / ${quests.length} complete · <span class="text-gold">${J.fmtNum(earned)} HP earned</span>`;
            requestAnimationFrame(() => setTimeout(() => document.querySelectorAll('.quest .progress span').forEach(s => { s.style.width = s.dataset.w + '%'; }), 60));
            tick();
        } catch (e) {
            $('active-list').innerHTML = `<div class="empty-state"><i class="fas fa-cloud"></i>${J.esc(e.message)}</div>`;
        }
    }
    function tick() {
        clearInterval(timer);
        const f = () => {
            const left = resetAt - Date.now();
            $('quest-countdown').textContent = left > 0 ? J.fmtCountdown(left) : 'Refreshing…';
            if (left <= 0) { clearInterval(timer); setTimeout(load, 2500); }
        };
        f(); timer = setInterval(f, 1000);
    }

    // ---------------- achievements (derived from your stats) ----------------
    const ACH = [
        ['First Light', 'Spend your first 10 minutes on the site.', 'fa-sun', s => s.total_time >= 600],
        ['Pilgrim', 'Spend 10 hours in total.', 'fa-person-walking', s => s.total_time >= 36000],
        ['Devoted', 'Spend 100 hours in total.', 'fa-place-of-worship', s => s.total_time >= 360000],
        ['Kindled', 'Reach a 3-day streak.', 'fa-fire', s => s.daily_streak >= 3],
        ['Unwavering', 'Reach a 30-day streak.', 'fa-fire-flame-curved', s => s.daily_streak >= 30],
        ['Student of the Word', 'Pass your first quiz.', 'fa-book-open', s => s.quizzes_passed >= 1],
        ['Scholar', 'Pass 25 quizzes.', 'fa-graduation-cap', s => s.quizzes_passed >= 25],
        ['Questing Soul', 'Complete 10 quests.', 'fa-map', s => s.quests_done >= 10],
        ['Quest Champion', 'Complete 100 quests.', 'fa-crown', s => s.quests_done >= 100],
        ['Fellowship', 'Make your first friend.', 'fa-handshake', s => s.friends_count >= 1],
        ['Body of Christ', 'Have 10 friends.', 'fa-people-group', s => s.friends_count >= 10],
        ['Treasure in Heaven', 'Hold 10,000 Holy Power.', 'fa-coins', s => s.holypower >= 10000],
        ['Disciple', 'Reach the Disciple rank.', 'fa-book-bible', s => s.xp >= 10000],
        ['Apostle', 'Reach the highest rank.', 'fa-cross', s => s.xp >= 50000]
    ];
    let achLoaded = false;
    async function loadAchievements() {
        if (achLoaded) return;
        try {
            const s = await J.call('jct_sync_time', { p_seconds: 0 });
            achLoaded = true;
            const got = ACH.filter(a => a[3](s)).length;
            $('ach-grid').innerHTML = `<div class="ach-summary card">Unlocked <b class="text-gold">${got}</b> of ${ACH.length}<div class="progress"><span style="width:${got / ACH.length * 100}%"></span></div></div>`
                + ACH.map((a, i) => {
                    const ok = a[3](s);
                    return `<div class="ach ${ok ? 'ok' : ''}" style="--d:${i * 50}ms"><div class="ach-medal"><i class="fas ${ok ? a[2] : 'fa-lock'}"></i></div><h3>${a[0]}</h3><p>${a[1]}</p></div>`;
                }).join('');
        } catch (e) { $('ach-grid').innerHTML = `<div class="empty-state">${J.esc(e.message)}</div>`; }
    }

    load();
})();
