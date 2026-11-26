// =====================================================================
//  FORUM: topics → responses → comments, and testimonies
// =====================================================================
(function () {
    'use strict';
    const J = window.JCT;
    const $ = id => document.getElementById(id);
    const esc = J.esc;

    let data = { topics: [], testimonies: [], my_reactions: [], me: null };
    let tab = 'topics';
    const open = new Set(); // expanded topic ids
    const reacted = new Set();

    const session = J.getSession();
    const myName = () => (data.me && data.me.name) || null;
    const isAdmin = () => !!(data.me && data.me.is_admin);

    // ---------------- editor toolbar ----------------
    document.addEventListener('mousedown', e => {
        const b = e.target.closest('.editor-toolbar button[data-cmd]');
        if (!b) return;
        e.preventDefault();
        const target = b.closest('.editor').querySelector('.rich-input');
        target.focus();
        document.execCommand(b.dataset.cmd, false, null);
    });
    function editorHTML(id, placeholder, value) {
        return `<div class="editor"><div class="editor-toolbar">
            <button type="button" data-cmd="bold" title="Bold"><i class="fas fa-bold"></i></button>
            <button type="button" data-cmd="italic" title="Italic"><i class="fas fa-italic"></i></button>
            <button type="button" data-cmd="insertUnorderedList" title="Bullet list"><i class="fas fa-list-ul"></i></button>
        </div><div class="rich-input" id="${id}" contenteditable="true" data-placeholder="${esc(placeholder)}">${value || ''}</div></div>`;
    }
    const contentOf = el => J.sanitize(el.innerHTML).trim();
    const isEmpty = html => !J.textOf(html).trim();

    // ---------------- tabs / composer ----------------
    function setTab(t) {
        tab = t;
        document.querySelectorAll('#forum-tabs .tab').forEach(x => x.classList.toggle('active', x.dataset.tab === t));
        $('topics-feed').hidden = t !== 'topics';
        $('testimonies-feed').hidden = t !== 'testimonies';
        $('composer-title').textContent = t === 'topics' ? 'Start a new topic' : 'Share your testimony';
        $('composer-sub').textContent = t === 'topics' ? 'What biblical question is on your heart?' : 'Tell what the Lord has done in your life.';
        $('composer-input').dataset.placeholder = t === 'topics' ? 'Type your question or topic…' : 'Share your testimony…';
        $('composer-post').querySelector('span').textContent = t === 'topics' ? 'Post Topic' : 'Share Testimony';
        $('search').placeholder = t === 'topics' ? 'Search topics or authors…' : 'Search testimonies…';
        render();
    }
    document.querySelectorAll('#forum-tabs .tab').forEach(x => x.addEventListener('click', () => setTab(x.dataset.tab)));
    $('search').addEventListener('input', render);
    $('sort').addEventListener('change', render);

    if (!session) {
        $('composer-note').innerHTML = '<a href="index.html?skip=1">Log in or continue as a guest</a> to post.';
        $('composer-input').setAttribute('contenteditable', 'false');
        $('composer-post').disabled = true;
    } else {
        $('me-badge').innerHTML = session.is_admin ? '<i class="fas fa-crown"></i>' : esc(session.username.charAt(0).toUpperCase());
        $('composer-note').textContent = `Posting as ${session.is_admin ? 'Admin / Owner' : session.username}${session.is_guest ? ' (guest)' : ''}`;
    }

    $('composer-post').addEventListener('click', async () => {
        const html = contentOf($('composer-input'));
        if (isEmpty(html)) return J.toast('Please write something first.', 'error');
        const btn = $('composer-post');
        J.setLoading(btn, true);
        try {
            await J.call('jct_add_post', { p_table: tab, p_content: html, p_parent_id: null });
            $('composer-input').innerHTML = '';
            J.toast(tab === 'topics' ? 'Your topic has been proclaimed!' : 'Thank you for bearing witness!', 'success');
            const r = btn.getBoundingClientRect();
            window.JCTFX && window.JCTFX.burst(r.left + r.width / 2, r.top, 40);
            await load();
        } catch (e) { J.toast(e.message, 'error'); }
        J.setLoading(btn, false);
    });

    // ---------------- data ----------------
    async function load() {
        try {
            data = await J.call('jct_forum');
            reacted.clear();
            (data.my_reactions || []).forEach(r => reacted.add(`${r.post_table}:${r.post_id}:${r.kind}`));
            render();
        } catch (e) {
            $('topics-feed').innerHTML = $('testimonies-feed').innerHTML = `<div class="empty-state"><i class="fas fa-cloud"></i>${esc(e.message)}</div>`;
        }
    }

    function sortList(list, textKey) {
        const q = $('search').value.trim().toLowerCase();
        const mine = myName();
        let out = list.filter(x => !q || J.textOf(x[textKey]).toLowerCase().includes(q) || String(x.author_name || '').toLowerCase().includes(q));
        const mode = $('sort').value;
        const t = x => J.parseDate(x.created_at).getTime();
        out.sort((a, b) => {
            if (mode === 'favorites') return (b.favorites_count || 0) - (a.favorites_count || 0) || t(b) - t(a);
            if (mode === 'oldest') return t(a) - t(b);
            if (mode === 'active') return ((b.responses || []).length + (b.likes_count || 0)) - ((a.responses || []).length + (a.likes_count || 0)) || t(b) - t(a);
            if (mode === 'az') return J.textOf(a[textKey]).localeCompare(J.textOf(b[textKey]));
            return t(b) - t(a);
        });
        // your own posts float to the top when not searching
        if (!q && mine) out = out.filter(x => x.author_name === mine).concat(out.filter(x => x.author_name !== mine));
        return out;
    }

    // ---------------- render helpers ----------------
    function author(p) {
        const admin = p.author_type === 'admin';
        const guest = p.author_type === 'guest';
        return `<div class="author">
            <span class="a-badge ${admin ? 'admin' : guest ? 'guest' : ''}">${admin ? '<i class="fas fa-crown"></i>' : esc(String(p.author_name || '?').charAt(0).toUpperCase())}</span>
            <span class="a-name">${esc(p.author_name || 'Anonymous')}</span>
            ${admin ? '<span class="chip">Owner</span>' : guest ? '<span class="chip dim">Guest</span>' : ''}
            <span class="a-time" title="${esc(J.parseDate(p.created_at).toLocaleString())}">${J.timeAgo(p.created_at)}</span>
        </div>`;
    }
    function reactBtn(table, p, kind) {
        const on = reacted.has(`${table}:${p.id}:${kind}`);
        const count = kind === 'like' ? p.likes_count : p.favorites_count;
        return `<button class="react ${kind} ${on ? 'on' : ''}" data-react="${kind}" data-table="${table}" data-id="${esc(p.id)}" aria-pressed="${on}" title="${kind === 'like' ? 'Like' : 'Favorite'}">
            <i class="${on ? 'fas' : 'far'} ${kind === 'like' ? 'fa-heart' : 'fa-star'}"></i><span>${count || 0}</span></button>`;
    }
    function ownerTools(table, p) {
        const mine = session && p.author_name === myName();
        return `${mine ? `<button class="icon-btn sm" data-edit data-table="${table}" data-id="${esc(p.id)}" title="Edit" aria-label="Edit"><i class="fas fa-pen"></i></button>` : ''}
                ${mine || isAdmin() ? `<button class="icon-btn sm danger" data-del data-table="${table}" data-id="${esc(p.id)}" title="Delete" aria-label="Delete"><i class="fas fa-trash"></i></button>` : ''}`;
    }
    const body = html => `<div class="post-body">${J.sanitize(html)}</div>`;

    function renderTopics() {
        const list = sortList(data.topics || [], 'title');
        $('topics-feed').innerHTML = list.length ? list.map((t, i) => {
            const responses = t.responses || [];
            const expanded = open.has(String(t.id));
            return `<article class="topic card" data-topic="${esc(t.id)}" style="--d:${Math.min(i, 8) * 50}ms">
                <header class="topic-head">${author(t)}<div class="tools">${ownerTools('topics', t)}${reactBtn('topics', t, 'favorite')}</div></header>
                <h2 class="topic-title" data-content="topics:${esc(t.id)}">${J.sanitize(t.title)}</h2>
                <div class="topic-foot">
                    <button class="btn btn-ghost btn-sm" data-toggle="${esc(t.id)}"><i class="fas fa-comments"></i> ${responses.length} ${responses.length === 1 ? 'response' : 'responses'} <i class="fas fa-chevron-down chev ${expanded ? 'up' : ''}"></i></button>
                    ${session ? `<button class="btn btn-sm" data-respond="${esc(t.id)}"><i class="fas fa-reply"></i> Respond</button>` : ''}
                </div>
                <div class="thread ${expanded ? 'open' : ''}">
                    <div class="respond-box" id="respond-${esc(t.id)}" hidden>
                        ${editorHTML('res-input-' + t.id, 'Write your biblical response…')}
                        <div class="row-end"><button class="btn btn-sm" data-send-response="${esc(t.id)}"><i class="fas fa-paper-plane"></i> Post Response</button></div>
                    </div>
                    ${responses.length ? responses.map(r => `
                        <div class="response ${r.author_type === 'admin' ? 'owner' : ''}" data-response="${esc(r.id)}">
                            <div class="resp-head">${author(r)}<div class="tools">${ownerTools('responses', r)}</div></div>
                            <div data-content="responses:${esc(r.id)}">${body(r.content)}</div>
                            <div class="resp-actions">
                                ${reactBtn('responses', r, 'like')}${reactBtn('responses', r, 'favorite')}
                                ${session ? `<button class="react" data-comment="${esc(r.id)}"><i class="far fa-comment"></i><span>${(r.comments || []).length}</span></button>` : `<span class="react"><i class="far fa-comment"></i><span>${(r.comments || []).length}</span></span>`}
                            </div>
                            <div class="comments">
                                ${(r.comments || []).map(c => `
                                    <div class="comment ${c.author_type === 'admin' ? 'owner' : ''}">
                                        <div class="resp-head">${author(c)}<div class="tools">${ownerTools('comments', c)}</div></div>
                                        <div data-content="comments:${esc(c.id)}">${body(c.content)}</div>
                                        <div class="resp-actions">${reactBtn('comments', c, 'like')}${reactBtn('comments', c, 'favorite')}</div>
                                    </div>`).join('')}
                                <div class="comment-box" id="comment-${esc(r.id)}" hidden>
                                    ${editorHTML('com-input-' + r.id, 'Write a comment…')}
                                    <div class="row-end"><button class="btn btn-sm" data-send-comment="${esc(r.id)}">Reply</button></div>
                                </div>
                            </div>
                        </div>`).join('') : `<p class="no-resp">No responses yet. Be the first to answer!</p>`}
                </div>
            </article>`;
        }).join('') : `<div class="empty-state"><i class="fas fa-feather"></i>No topics found. Start the first discussion!</div>`;
    }

    function renderTestimonies() {
        const list = sortList(data.testimonies || [], 'content');
        $('testimonies-feed').innerHTML = list.length ? list.map((t, i) => `
            <article class="testimony card" style="--d:${Math.min(i, 8) * 50}ms">
                <i class="fas fa-quote-left t-quote"></i>
                <div data-content="testimonies:${esc(t.id)}">${body(t.content)}</div>
                <footer>${author(t)}<div class="tools">${ownerTools('testimonies', t)}${reactBtn('testimonies', t, 'like')}${reactBtn('testimonies', t, 'favorite')}</div></footer>
            </article>`).join('') : `<div class="empty-state"><i class="fas fa-dove"></i>No testimonies yet. Share what God has done!</div>`;
    }

    function render() { if (tab === 'topics') renderTopics(); else renderTestimonies(); }

    // ---------------- interactions ----------------
    document.addEventListener('click', async e => {
        const t = e.target;
        const toggle = t.closest('[data-toggle]');
        if (toggle) {
            const id = toggle.dataset.toggle;
            open.has(id) ? open.delete(id) : open.add(id);
            const art = toggle.closest('.topic');
            art.querySelector('.thread').classList.toggle('open', open.has(id));
            toggle.querySelector('.chev').classList.toggle('up', open.has(id));
            return;
        }
        const respond = t.closest('[data-respond]');
        if (respond) {
            const id = respond.dataset.respond;
            open.add(id);
            const art = respond.closest('.topic');
            art.querySelector('.thread').classList.add('open');
            const box = $('respond-' + id);
            box.hidden = !box.hidden;
            if (!box.hidden) box.querySelector('.rich-input').focus();
            return;
        }
        const comment = t.closest('[data-comment]');
        if (comment) {
            const box = $('comment-' + comment.dataset.comment);
            box.hidden = !box.hidden;
            if (!box.hidden) box.querySelector('.rich-input').focus();
            return;
        }
        const sendR = t.closest('[data-send-response]');
        const sendC = t.closest('[data-send-comment]');
        if (sendR || sendC) {
            const id = (sendR || sendC).dataset[sendR ? 'sendResponse' : 'sendComment'];
            const input = $((sendR ? 'res-input-' : 'com-input-') + id);
            const html = contentOf(input);
            if (isEmpty(html)) return J.toast('Please write something first.', 'error');
            J.setLoading(sendR || sendC, true);
            try {
                await J.call('jct_add_post', { p_table: sendR ? 'responses' : 'comments', p_content: html, p_parent_id: String(id) });
                await load();
            } catch (err) { J.toast(err.message, 'error'); J.setLoading(sendR || sendC, false); }
            return;
        }
        const react = t.closest('[data-react]');
        if (react) {
            if (!session) return J.toast('Log in or continue as a guest to react.');
            const { table, id } = react.dataset, kind = react.dataset.react;
            const key = `${table}:${id}:${kind}`;
            const was = reacted.has(key);
            // optimistic
            react.classList.toggle('on', !was);
            const num = react.querySelector('span');
            num.textContent = Math.max(0, (+num.textContent || 0) + (was ? -1 : 1));
            react.querySelector('i').className = `${was ? 'far' : 'fas'} ${kind === 'like' ? 'fa-heart' : 'fa-star'}`;
            if (!was) { const r = react.getBoundingClientRect(); window.JCTFX && window.JCTFX.burst(r.left + 12, r.top + 10, 14); }
            try {
                const res = await J.call('jct_react', { p_table: table, p_id: String(id), p_kind: kind });
                res.active ? reacted.add(key) : reacted.delete(key);
                num.textContent = res.count;
                const list = table === 'topics' ? data.topics : table === 'testimonies' ? data.testimonies : null;
                const item = list ? list.find(x => String(x.id) === String(id)) : null;
                if (item) item[kind === 'like' ? 'likes_count' : 'favorites_count'] = res.count;
            } catch (err) { J.toast(err.message, 'error'); load(); }
            return;
        }
        const del = t.closest('[data-del]');
        if (del) {
            if (!await J.confirmDialog('Delete this post?', 'This cannot be undone.', { danger: true, ok: 'Delete' })) return;
            try { await J.call('jct_delete_post', { p_table: del.dataset.table, p_id: String(del.dataset.id) }); J.toast('Deleted.'); load(); }
            catch (err) { J.toast(err.message, 'error'); }
            return;
        }
        const edit = t.closest('[data-edit]');
        if (edit) {
            const { table, id } = edit.dataset;
            const holder = document.querySelector(`[data-content="${table}:${CSS.escape(id)}"]`);
            if (!holder || holder.dataset.editing) return;
            const list = table === 'topics' ? data.topics : table === 'testimonies' ? data.testimonies : null;
            let raw = holder.innerHTML;
            if (list) { const it = list.find(x => String(x.id) === String(id)); if (it) raw = J.sanitize(table === 'topics' ? it.title : it.content); }
            else { const inner = holder.querySelector('.post-body'); if (inner) raw = inner.innerHTML; }
            holder.dataset.editing = '1';
            holder.innerHTML = editorHTML('edit-' + table + '-' + id, 'Edit…', raw) +
                `<div class="row-end"><button class="btn btn-ghost btn-sm" data-cancel-edit>Cancel</button><button class="btn btn-sm" data-save-edit data-table="${table}" data-id="${esc(id)}">Save</button></div>`;
            holder.querySelector('.rich-input').focus();
            return;
        }
        if (t.closest('[data-cancel-edit]')) { render(); return; }
        const save = t.closest('[data-save-edit]');
        if (save) {
            const { table, id } = save.dataset;
            const html = contentOf($('edit-' + table + '-' + id));
            if (isEmpty(html)) return J.toast('Content cannot be empty.', 'error');
            try { await J.call('jct_edit_post', { p_table: table, p_id: String(id), p_content: html }); J.toast('Saved.', 'success'); load(); }
            catch (err) { J.toast(err.message, 'error'); }
        }
    });

    // paste as plain text inside editors (keeps posts clean)
    document.addEventListener('paste', e => {
        if (!e.target.closest || !e.target.closest('.rich-input')) return;
        e.preventDefault();
        document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });

    $('topics-feed').innerHTML = '<div class="skeleton" style="height:140px;margin-bottom:16px"></div><div class="skeleton" style="height:140px"></div>';
    if (location.hash === '#testimonies') setTab('testimonies');
    load();
    setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('[data-editing], .respond-box:not([hidden]), .comment-box:not([hidden])') && !document.activeElement.closest('.rich-input')) load(); }, 45000);
})();
