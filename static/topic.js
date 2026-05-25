document.addEventListener("DOMContentLoaded", () => {
    loadForumData();
});

const forumApiUrl = "https://jesusbackend.onrender.com";
const loggedInAcc = localStorage.getItem("jct_logged_in_user");
const guestAcc = localStorage.getItem("jct_guest_user");
const activeAcc = loggedInAcc || guestAcc;

let forumUser = activeAcc;
let forumAuthorType = loggedInAcc ? 'user' : 'guest';
let isAdmin = false;

if (activeAcc === 'AaronNg123') {
    forumUser = 'Admin / Owner';
    forumAuthorType = 'admin';
    isAdmin = true; 
}

// Global data stores for fast searching & sorting
let globalTopics = [];
let globalTestimonies = [];

window.formatDoc = function(cmd, value = null) {
    document.execCommand(cmd, false, value);
    const activeEditor = document.activeElement;
    if (activeEditor && activeEditor.classList.contains('rich-input')) activeEditor.focus();
}

function timeAgo(dateString) {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

window.toggleInput = function(id) {
    const box = document.getElementById(id);
    if(box) box.style.display = (box.style.display === "block") ? "none" : "block";
}

// 1. Fetch Data
async function loadForumData() {
    try {
        const res = await fetch(`${forumApiUrl}/api/forum`);
        const data = await res.json();

        if (!res.ok || data.error) throw new Error(data.error);

        globalTopics = data.topics || [];
        globalTestimonies = data.testimonies || [];

        applyTopicFilters();
        applyTestimonyFilters();

    } catch (err) {
        console.error("Error loading forum data:", err);
        document.getElementById('topics-container').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        document.getElementById('testimonies-container').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
}

// 2. Filters & Rendering for TOPICS
window.applyTopicFilters = function() {
    const searchTerm = document.getElementById("topic-search").value.toLowerCase();
    const sortType = document.getElementById("topic-sort").value;

    // Filter by search
    let filtered = globalTopics.filter(t => 
        (t.title && t.title.toLowerCase().includes(searchTerm)) || 
        (t.author_name && t.author_name.toLowerCase().includes(searchTerm))
    );

    // Sort
    filtered.sort((a, b) => {
        // 1. ALWAYS Put my own topics at the front!
        const aMine = a.author_name === forumUser;
        const bMine = b.author_name === forumUser;
        if (aMine && !bMine) return -1;
        if (!aMine && bMine) return 1;

        // 2. Apply chosen sort
        if (sortType === 'favorites') {
            const favA = a.favorites_count || 0;
            const favB = b.favorites_count || 0;
            if (favB !== favA) return favB - favA;
            return new Date(b.created_at) - new Date(a.created_at);
        }
        if (sortType === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortType === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortType === 'az') return a.title.localeCompare(b.title);
        if (sortType === 'za') return b.title.localeCompare(a.title);
    });

    renderTopics(filtered);
}

function renderTopics(topicsArray) {
    const container = document.getElementById('topics-container');
    if (topicsArray.length === 0) {
        container.innerHTML = '<p style="color:#a67c52; width:100%; text-align:center;">No topics found.</p>';
        return;
    }

    const html = topicsArray.map(topic => {
        const canEditTopic = topic.author_name === forumUser;
        const canDeleteTopic = topic.author_name === forumUser || isAdmin;

        const responsesHtml = (topic.responses || []).sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(response => {
            const isResOwner = response.author_name === forumUser;
            const canDeleteRes = isResOwner || isAdmin;
            
            const commentsHtml = (response.comments || []).sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(comment => {
                const isComOwner = comment.author_name === forumUser;
                const canDeleteCom = isComOwner || isAdmin;
                return `
                <div class="replies-container" id="container-comments-${comment.id}">
                    <div class="post ${comment.author_type === 'admin' ? 'owner-post' : 'user-reply'}">
                        <div class="post-user-info">
                            <div class="avatar ${comment.author_type === 'admin' ? 'owner-avatar' : ''}"><i class="fas ${comment.author_type === 'admin' ? 'fa-crown' : 'fa-user'}"></i></div>
                            <div class="user-details">
                                <span class="username">${comment.author_name}</span>
                                <span class="post-time">${timeAgo(comment.created_at)}</span>
                            </div>
                        </div>
                        <div class="post-content" id="content-comments-${comment.id}" data-raw="${encodeURIComponent(comment.content)}"><div>${comment.content}</div></div>
                        <div class="post-actions">
                            ${isComOwner ? `<button class="action-btn edit-btn" onclick="openEdit('comments', '${comment.id}')"><i class="fas fa-edit"></i></button>` : ''}
                            ${canDeleteCom ? `<button class="action-btn delete-btn" onclick="deletePost('comments', '${comment.id}')"><i class="fas fa-trash"></i></button>` : ''}
                            <button class="action-btn" onclick="interact('comments', '${comment.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${comment.likes_count || 0}</span></button>
                            <button class="action-btn" onclick="interact('comments', '${comment.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${comment.favorites_count || 0}</span></button>
                        </div>
                    </div>
                </div>`;
            }).join('');

            return `
                <div class="post ${response.author_type === 'admin' ? 'owner-post' : 'user-reply'}" id="container-responses-${response.id}">
                    <div class="post-user-info">
                        <div class="avatar ${response.author_type === 'admin' ? 'owner-avatar' : ''}"><i class="fas ${response.author_type === 'admin' ? 'fa-crown' : 'fa-user'}"></i></div>
                        <div class="user-details">
                            <span class="username">${response.author_name}</span>
                            <span class="post-time">${timeAgo(response.created_at)}</span>
                        </div>
                    </div>
                    <div class="post-content" id="content-responses-${response.id}" data-raw="${encodeURIComponent(response.content)}"><div>${response.content}</div></div>
                    <div class="post-actions">
                        ${isResOwner ? `<button class="action-btn edit-btn" onclick="openEdit('responses', '${response.id}')"><i class="fas fa-edit"></i></button>` : ''}
                        ${canDeleteRes ? `<button class="action-btn delete-btn" onclick="deletePost('responses', '${response.id}')"><i class="fas fa-trash"></i></button>` : ''}
                        <button class="action-btn" onclick="interact('responses', '${response.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${response.likes_count || 0}</span></button>
                        <button class="action-btn" onclick="interact('responses', '${response.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${response.favorites_count || 0}</span></button>
                        <button class="action-btn reply-trigger-btn" onclick="toggleInput('reply-box-${response.id}')"><i class="fas fa-comment-alt"></i> <span class="count">${(response.comments || []).length}</span></button>
                    </div>
                    
                    <div id="reply-box-${response.id}" style="display:none; margin-top: 15px;">
                        <div id="text-${response.id}" class="rich-input" contenteditable="true" data-placeholder="Write a comment..." style="min-height:60px;"></div>
                        <button onclick="submitComment('${response.id}')" class="submit-testimony-btn" style="float:none;">Reply</button>
                    </div>
                    ${commentsHtml}
                </div>
            `;
        }).join('');

        return `
            <div class="horizontal-card" id="container-topics-${topic.id}">
                <div class="topic-header" style="flex-direction: column; align-items: flex-start;">
                    <div style="display: flex; justify-content: space-between; width: 100%;">
                        <span class="post-time" style="color: #a67c52; margin-bottom: 5px;">Posted by <strong style="color:${topic.author_type === 'admin' ? '#ffd700' : '#e6e6e6'}">${topic.author_name || 'Admin / Owner'}</strong> • ${timeAgo(topic.created_at)}</span>
                        <div>
                            ${canEditTopic ? `<button class="action-btn edit-btn" style="display:inline-block;" onclick="openEdit('topics', '${topic.id}', true)"><i class="fas fa-edit"></i></button>` : ''}
                            ${canDeleteTopic ? `<button class="action-btn delete-btn" style="display:inline-block; margin-left:10px;" onclick="deletePost('topics', '${topic.id}')"><i class="fas fa-trash"></i></button>` : ''}
                            <button class="action-btn fav-btn" style="display:inline-block; margin-left:10px;" onclick="interact('topics', '${topic.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${topic.favorites_count || 0}</span></button>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-top: 10px;">
                        <h2 id="content-topics-${topic.id}" data-raw="${encodeURIComponent(topic.title)}"><i class="fas fa-book-open"></i> <span>${topic.title}</span></h2>
                        <button class="add-reply-btn main-reply-btn" onclick="toggleInput('response-box-${topic.id}')"><i class="fas fa-plus"></i> Add Response</button>
                    </div>
                </div>

                <div id="response-box-${topic.id}" style="display:none; margin-bottom: 20px;">
                    <div id="res-text-${topic.id}" class="rich-input" contenteditable="true" data-placeholder="Write your biblical response..." style="min-height:80px;"></div>
                    <button onclick="submitResponse('${topic.id}')" class="submit-testimony-btn" style="float:none;">Post Response</button>
                </div>

                <div class="comment-thread">
                    ${responsesHtml || '<p style="color:#a67c52; font-style:italic;">No responses yet. Be the first to answer!</p>'}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// 3. Filters & Rendering for TESTIMONIES
window.applyTestimonyFilters = function() {
    const searchTerm = document.getElementById("testimony-search").value.toLowerCase();
    const sortType = document.getElementById("testimony-sort").value;

    let filtered = globalTestimonies.filter(t => 
        (t.content && t.content.toLowerCase().includes(searchTerm)) || 
        (t.author_name && t.author_name.toLowerCase().includes(searchTerm))
    );

    filtered.sort((a, b) => {
        const aMine = a.author_name === forumUser;
        const bMine = b.author_name === forumUser;
        if (aMine && !bMine) return -1;
        if (!aMine && bMine) return 1;

        if (sortType === 'favorites') {
            const favA = a.favorites_count || 0;
            const favB = b.favorites_count || 0;
            if (favB !== favA) return favB - favA;
            return new Date(b.created_at) - new Date(a.created_at);
        }
        if (sortType === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortType === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortType === 'az') return (a.content || "").localeCompare(b.content || "");
        if (sortType === 'za') return (b.content || "").localeCompare(a.content || "");
    });

    renderTestimonies(filtered);
}

function renderTestimonies(testArray) {
    const container = document.getElementById('testimonies-container');
    if (testArray.length === 0) {
        container.innerHTML = '<p style="color:#a67c52; width:100%; text-align:center;">No testimonies found.</p>';
        return;
    }

    const html = testArray.map(testimony => {
        const canEditTest = testimony.author_name === forumUser;
        const canDeleteTest = testimony.author_name === forumUser || isAdmin;

        return `
        <div class="horizontal-card" id="container-testimonies-${testimony.id}">
            <div class="post testimony-post ${testimony.author_type === 'admin' ? 'owner-post' : ''}" style="margin:0; border:none; background:transparent; padding:0;">
                <div class="post-user-info">
                    <div class="avatar ${testimony.author_type === 'admin' ? 'owner-avatar' : ''}"><i class="fas ${testimony.author_type === 'admin' ? 'fa-crown' : 'fa-user'}"></i></div>
                    <div class="user-details">
                        <span class="username">${testimony.author_name}</span>
                        <span class="post-time">${timeAgo(testimony.created_at)}</span>
                    </div>
                </div>
                <div class="post-content" id="content-testimonies-${testimony.id}" data-raw="${encodeURIComponent(testimony.content)}"><div>${testimony.content}</div></div>
                <div class="post-actions" style="margin-top:auto;">
                    ${canEditTest ? `<button class="action-btn edit-btn" onclick="openEdit('testimonies', '${testimony.id}')"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteTest ? `<button class="action-btn delete-btn" onclick="deletePost('testimonies', '${testimony.id}')"><i class="fas fa-trash"></i></button>` : ''}
                    <button class="action-btn" onclick="interact('testimonies', '${testimony.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${testimony.likes_count || 0}</span></button>
                    <button class="action-btn" onclick="interact('testimonies', '${testimony.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${testimony.favorites_count || 0}</span></button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// 4. Submission Handlers
window.submitTopic = async function() {
    if (!activeAcc) return alert("Please login to post.");
    const inputDiv = document.getElementById("new-topic-title");
    const title = inputDiv.innerHTML.trim();
    if (!title || title === "<br>") return alert("Topic title cannot be empty.");

    try {
        await fetch(`${forumApiUrl}/api/add-topic`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author_name: forumUser, author_type: forumAuthorType })
        });
        inputDiv.innerHTML = "";
        loadForumData();
    } catch (err) { alert(err.message); } 
}

window.submitResponse = async function(topicId) {
    if (!activeAcc) return alert("Please login to post.");
    const inputDiv = document.getElementById(`res-text-${topicId}`);
    const content = inputDiv.innerHTML.trim();
    if (!content || content === "<br>") return alert("Response cannot be empty.");

    await fetch(`${forumApiUrl}/api/add-response`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, author_name: forumUser, author_type: forumAuthorType, content })
    });
    loadForumData(); 
}

window.submitComment = async function(responseId) {
    if (!activeAcc) return alert("Please login to comment.");
    const inputDiv = document.getElementById(`text-${responseId}`);
    const content = inputDiv.innerHTML.trim();
    if (!content || content === "<br>") return;

    await fetch(`${forumApiUrl}/api/add-comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_id: responseId, author_name: forumUser, author_type: forumAuthorType, content })
    });
    loadForumData();
}

window.submitTestimony = async function() {
    if (!activeAcc) return alert("Please login to share your testimony.");
    const inputDiv = document.getElementById("testimony-text");
    const content = inputDiv.innerHTML.trim();
    if (!content || content === "<br>") return;

    await fetch(`${forumApiUrl}/api/add-testimony`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_name: forumUser, author_type: forumAuthorType, content })
    });
    inputDiv.innerHTML = "";
    loadForumData();
}

// 5. Edit, Delete & Interact
window.deletePost = async function(table, id) {
    if (!confirm("Are you sure you want to delete this? This action cannot be undone.")) return;
    try {
        await fetch(`${forumApiUrl}/api/delete-post`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table, id })
        });
        document.getElementById(`container-${table}-${id}`).style.display = 'none'; 
    } catch(err) { alert(err.message); }
}

window.openEdit = function(table, id, isTopic = false) {
    const contentDiv = document.getElementById(`content-${table}-${id}`);
    const rawContent = decodeURIComponent(contentDiv.getAttribute("data-raw"));
    
    const toolbarHtml = `
        <div class="editor-toolbar" style="padding:5px;">
            <button type="button" onclick="formatDoc('bold')" title="Bold"><i class="fas fa-bold"></i></button>
            <button type="button" onclick="formatDoc('italic')" title="Italic"><i class="fas fa-italic"></i></button>
            <button type="button" onclick="formatDoc('insertUnorderedList')" title="Bullet List"><i class="fas fa-list-ul"></i></button>
            <button type="button" onclick="formatDoc('insertOrderedList')" title="Numbered List"><i class="fas fa-list-ol"></i></button>
        </div>
    `;

    if (isTopic) {
        contentDiv.innerHTML = `
            ${toolbarHtml}
            <div id="edit-input-${id}" class="rich-input" contenteditable="true" style="min-height:40px; font-size: 1.5rem; font-family:'Cinzel', serif;">${rawContent}</div>
            <button class="save-edit-btn" onclick="saveEdit('${table}', '${id}', true)">Save</button>
            <button class="cancel-edit-btn" onclick="loadForumData()">Cancel</button>
        `;
    } else {
        contentDiv.innerHTML = `
            ${toolbarHtml}
            <div id="edit-input-${id}" class="rich-input" contenteditable="true">${rawContent}</div>
            <button class="save-edit-btn" onclick="saveEdit('${table}', '${id}', false)">Save</button>
            <button class="cancel-edit-btn" onclick="loadForumData()">Cancel</button>
        `;
    }
}

window.saveEdit = async function(table, id, isTopic) {
    const newContent = document.getElementById(`edit-input-${id}`).innerHTML.trim();
    if (!newContent || newContent === "<br>") return alert("Content cannot be empty.");

    await fetch(`${forumApiUrl}/api/edit-post`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, new_content: newContent })
    });
    loadForumData(); 
}

window.interact = async function(table, id, column, btnElement) {
    const isActive = btnElement.classList.toggle('active');
    const span = btnElement.querySelector('.count');
    span.textContent = parseInt(span.textContent) + (isActive ? 1 : -1);
    
    const icon = btnElement.querySelector('i');
    icon.style.transform = "scale(1.4)";
    setTimeout(() => icon.style.transform = "", 200);

    await fetch(`${forumApiUrl}/api/interact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, column, increment: isActive })
    });

    if (column === 'favorites_count') {
        setTimeout(loadForumData, 1000); 
    }
}