// =====================================================================
//  GUIDEBOT chat UI (answers come from guidebot-brain.js)
// =====================================================================
(function () {
    'use strict';
    const J = window.JCT;
    const $ = id => document.getElementById(id);
    const session = J.getSession();
    let current = null; // { id, title }
    let busy = false;

    const GREETING = 'Grace and peace to you! I am <strong>GuideBot</strong>. I am here to help you navigate your spiritual journey using the truth of God’s Word. How can I help you today?';

    // ---------------- sidebar (mobile drawer) ----------------
    const side = $('bot-side');
    const setSide = open => { side.classList.toggle('open', open); $('side-scrim').classList.toggle('show', open); };
    $('side-open').onclick = () => setSide(true);
    $('side-close').onclick = () => setSide(false);
    $('side-scrim').onclick = () => setSide(false);

    // ---------------- messages ----------------
    function append(html, who, animateTyping) {
        const row = document.createElement('div');
        row.className = `msg ${who}`;
        row.innerHTML = who === 'bot'
            ? `<img class="msg-av" src="static/image/botLogo.png" alt=""><div class="msg-bubble"></div>`
            : `<div class="msg-bubble">${J.esc(html)}</div>`;
        $('bot-body').appendChild(row);
        if (who === 'bot') {
            const bubble = row.querySelector('.msg-bubble');
            const clean = J.sanitize(html);
            if (animateTyping && !matchMedia('(prefers-reduced-motion: reduce)').matches) typeOut(bubble, clean);
            else bubble.innerHTML = clean;
        }
        scrollDown();
        return row;
    }
    // Reveal the answer word by word, keeping its HTML structure.
    function typeOut(el, html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const words = [];
        (function collect(node) {
            node.childNodes.forEach(n => {
                if (n.nodeType === 3) {
                    const parts = n.textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    parts.forEach(p => { const s = document.createElement('span'); s.textContent = p; s.className = 'w'; frag.appendChild(s); if (p.trim()) words.push(s); });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1) collect(n);
            });
        })(tmp);
        el.innerHTML = '';
        while (tmp.firstChild) el.appendChild(tmp.firstChild);
        let i = 0;
        const step = () => {
            for (let k = 0; k < 3 && i < words.length; k++, i++) words[i].classList.add('on');
            scrollDown();
            if (i < words.length) setTimeout(step, 18);
            else el.querySelectorAll('.w').forEach(w => w.classList.add('on'));
        };
        step();
    }
    function scrollDown() { const b = $('bot-body'); b.scrollTop = b.scrollHeight; }
    function typing() {
        const row = document.createElement('div');
        row.className = 'msg bot typing';
        row.innerHTML = `<img class="msg-av" src="static/image/botLogo.png" alt=""><div class="msg-bubble"><span class="dots"><i></i><i></i><i></i></span> <em>reflecting on Scripture…</em></div>`;
        $('bot-body').appendChild(row);
        scrollDown();
        return row;
    }
    function greet() {
        $('bot-body').innerHTML = '';
        append(GREETING, 'bot', false);
        $('starters').hidden = false;
    }

    // ---------------- conversations ----------------
    async function loadList(autoOpen) {
        if (!session) {
            $('side-list').innerHTML = `<div class="empty-state" style="padding:18px"><i class="fas fa-lock"></i><a href="index.html?skip=1">Log in</a> or continue as a guest to save your conversations.</div>`;
            return;
        }
        try {
            const chats = await J.call('jct_bot_sessions');
            $('side-list').innerHTML = chats.length ? chats.map(c => `
                <div class="side-item ${current && current.id === c.id ? 'active' : ''}" data-id="${J.esc(c.id)}" data-title="${J.esc(c.title)}" tabindex="0">
                    <i class="fas ${c.is_favorite ? 'fa-star fav' : 'fa-message'}"></i>
                    <span class="t">${J.esc(c.title)}</span>
                    <span class="acts">
                        <button class="icon-btn sm" data-fav="${c.is_favorite ? 0 : 1}" title="${c.is_favorite ? 'Unfavorite' : 'Favorite'}" aria-label="Favorite"><i class="${c.is_favorite ? 'fas' : 'far'} fa-star"></i></button>
                        <button class="icon-btn sm" data-rename title="Rename" aria-label="Rename"><i class="fas fa-pen"></i></button>
                        <button class="icon-btn sm danger" data-delete title="Delete" aria-label="Delete"><i class="fas fa-trash"></i></button>
                    </span>
                </div>`).join('') : `<div class="empty-state" style="padding:18px"><i class="fas fa-feather"></i>No saved conversations yet.</div>`;
            if (autoOpen && !current && chats.length) openChat(chats[0].id, chats[0].title);
        } catch (e) { $('side-list').innerHTML = `<div class="empty-state">${J.esc(e.message)}</div>`; }
    }
    async function openChat(id, title) {
        current = { id, title };
        $('chat-title').textContent = title;
        $('starters').hidden = true;
        $('bot-body').innerHTML = '<div class="skeleton" style="height:60px;width:70%"></div>';
        setSide(false);
        loadList(false);
        try {
            const msgs = await J.call('jct_bot_messages', { p_id: String(id) });
            $('bot-body').innerHTML = '';
            if (!msgs.length) greet();
            msgs.forEach(m => append(m.content, m.sender === 'bot' ? 'bot' : 'user', false));
        } catch (e) { $('bot-body').innerHTML = `<div class="empty-state">${J.esc(e.message)}</div>`; }
    }
    $('side-list').addEventListener('click', async e => {
        const item = e.target.closest('.side-item');
        if (!item) return;
        const id = item.dataset.id, title = item.dataset.title;
        if (e.target.closest('[data-fav]')) {
            await J.call('jct_bot_update_session', { p_id: id, p_is_favorite: e.target.closest('[data-fav]').dataset.fav === '1' }).catch(err => J.toast(err.message, 'error'));
            return loadList(false);
        }
        if (e.target.closest('[data-rename]')) {
            const t = await J.promptDialog('Rename conversation', title, { maxlength: 80 });
            if (t && t.trim()) {
                await J.call('jct_bot_update_session', { p_id: id, p_title: t.trim() }).catch(err => J.toast(err.message, 'error'));
                if (current && current.id === id) $('chat-title').textContent = t.trim();
                loadList(false);
            }
            return;
        }
        if (e.target.closest('[data-delete]')) {
            if (!await J.confirmDialog('Delete this conversation?', '', { danger: true, ok: 'Delete' })) return;
            await J.call('jct_bot_delete_session', { p_id: id }).catch(err => J.toast(err.message, 'error'));
            if (current && current.id === id) { current = null; $('chat-title').textContent = 'New Conversation'; greet(); }
            return loadList(false);
        }
        openChat(id, title);
    });
    $('side-list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('side-item')) e.target.click(); });
    $('new-chat').onclick = () => { current = null; $('chat-title').textContent = 'New Conversation'; greet(); setSide(false); loadList(false); $('bot-text').focus(); };

    // ---------------- sending ----------------
    async function send(text) {
        text = text.trim();
        if (!text || busy) return;
        busy = true;
        $('starters').hidden = true;
        append(text, 'user');
        $('bot-text').value = '';
        if (session && !current) {
            try {
                const s = await J.call('jct_bot_create_session', { p_title: text.length > 40 ? text.slice(0, 40) + '…' : text });
                current = { id: s.id, title: s.title };
                $('chat-title').textContent = s.title;
                loadList(false);
            } catch (e) { /* chat still works unsaved */ }
        }
        if (current) J.call('jct_bot_add_message', { p_id: String(current.id), p_sender: 'user', p_content: text }).catch(() => { });
        const t = typing();
        await new Promise(r => setTimeout(r, 900 + Math.random() * 700));
        t.remove();
        const answer = window.GuideBotBrain(text);
        append(answer, 'bot', true);
        if (current) J.call('jct_bot_add_message', { p_id: String(current.id), p_sender: 'bot', p_content: answer }).catch(() => { });
        busy = false;
    }
    $('bot-form').addEventListener('submit', e => { e.preventDefault(); send($('bot-text').value); });
    $('starters').addEventListener('click', e => { const b = e.target.closest('.starter'); if (b) send(b.textContent); });

    greet();
    loadList(true);
})();
