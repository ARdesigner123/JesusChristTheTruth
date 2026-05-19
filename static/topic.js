document.addEventListener("DOMContentLoaded", () => {
    console.log("Topic JS loaded. Fetching data...");
    loadForumData();
});

const BACKEND_URL = "https://jesusbackend.onrender.com";

// Determine user identity
const normalUser = localStorage.getItem("jct_logged_in_user");
const guestUser = localStorage.getItem("jct_guest_user");
const rawUser = normalUser || guestUser;

// SET ADMIN LOGIC
let currentUser = rawUser;
let currentAuthorType = normalUser ? 'user' : 'guest';

if (rawUser === 'AaronNg123') {
    currentUser = 'Admin / Owner';
    currentAuthorType = 'admin';
}

// Helper: Time Ago Formatter
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

// Helper: Toggle reply textareas
window.toggleInput = function(id) {
    const box = document.getElementById(id);
    if(box) {
        box.style.display = (box.style.display === "block") ? "none" : "block";
    }
}

// 1. Fetch & Render All Data
async function loadForumData() {
    const topicsContainer = document.getElementById('topics-container');
    const testimoniesContainer = document.getElementById('testimonies-container');

    // Notify user if Render is taking a while to wake up
    const wakeUpTimeout = setTimeout(() => {
        if(topicsContainer.innerHTML.includes('Loading')) {
            topicsContainer.innerHTML = '<p style="text-align: center; color: #ffd700; font-family: \'Cinzel\', serif; font-size: 1.2rem;"><i class="fas fa-spinner fa-spin"></i> Waking up the server... (this can take up to 50 seconds)</p>';
        }
    }, 3000);

    try {
        const res = await fetch(`${BACKEND_URL}/api/forum`);
        clearTimeout(wakeUpTimeout); 

        const data = await res.json();

        // Safety check: Did the backend return an error?
        if (!res.ok || data.error) {
            throw new Error(data.error || `Server returned HTTP ${res.status}`);
        }

        const topicsArray = data.topics || [];
        const testimoniesArray = data.testimonies || [];

        // RENDER TOPICS & NESTED RESPONSES
        const topicsHtml = topicsArray.map(topic => {
            const responsesList = topic.responses || [];
            
            const responsesHtml = responsesList.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(response => {
                const isOwner = response.author_type === 'admin';
                const commentsList = response.comments || [];
                
                const commentsHtml = commentsList.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(comment => `
                    <div class="replies-container">
                        <div class="post ${comment.author_type === 'admin' ? 'owner-post' : 'user-reply'}">
                            <div class="post-user-info">
                                <div class="avatar ${comment.author_type === 'admin' ? 'owner-avatar' : ''}"><i class="fas ${comment.author_type === 'admin' ? 'fa-crown' : 'fa-user'}"></i></div>
                                <div class="user-details">
                                    <span class="username">${comment.author_name}</span>
                                    <span class="post-time">${timeAgo(comment.created_at)}</span>
                                </div>
                            </div>
                            <div class="post-content"><p>${comment.content}</p></div>
                            <div class="post-actions">
                                <button class="action-btn" onclick="interact('comments', '${comment.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${comment.likes_count || 0}</span></button>
                                <button class="action-btn" onclick="interact('comments', '${comment.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${comment.favorites_count || 0}</span></button>
                            </div>
                        </div>
                    </div>
                `).join('');

                return `
                    <div class="post ${isOwner ? 'owner-post' : 'user-reply'}">
                        <div class="post-user-info">
                            <div class="avatar ${isOwner ? 'owner-avatar' : ''}"><i class="fas ${isOwner ? 'fa-crown' : 'fa-user'}"></i></div>
                            <div class="user-details">
                                <span class="username">${response.author_name}</span>
                                <span class="post-time">${timeAgo(response.created_at)}</span>
                            </div>
                        </div>
                        <div class="post-content"><p>${response.content}</p></div>
                        <div class="post-actions">
                            <button class="action-btn" onclick="interact('responses', '${response.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${response.likes_count || 0}</span></button>
                            <button class="action-btn" onclick="interact('responses', '${response.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${response.favorites_count || 0}</span></button>
                            <button class="action-btn reply-trigger-btn" onclick="toggleInput('reply-box-${response.id}')"><i class="fas fa-comment-alt"></i> <span class="count">${commentsList.length}</span></button>
                        </div>
                        
                        <div id="reply-box-${response.id}" style="display:none; margin-top: 15px;">
                            <textarea id="text-${response.id}" placeholder="Write a comment..." style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid #8b5a2b; color: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-family:'Cardo', serif; min-height:60px; outline:none;"></textarea>
                            <button onclick="submitComment('${response.id}')" class="submit-testimony-btn" style="float:none;">Reply</button>
                        </div>
                        
                        ${commentsHtml}
                    </div>
                `;
            }).join('');

            return `
                <div class="topic-container">
                    <div class="topic-header" style="flex-direction: column; align-items: flex-start;">
                        <span class="post-time" style="color: #a67c52; margin-bottom: 5px;">Posted by <strong style="color:${topic.author_type === 'admin' ? '#ffd700' : '#e6e6e6'}">${topic.author_name || 'Admin / Owner'}</strong> • ${timeAgo(topic.created_at)}</span>
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                            <h2><i class="fas fa-book-open"></i> ${topic.title}</h2>
                            <button class="add-reply-btn main-reply-btn" onclick="toggleInput('response-box-${topic.id}')"><i class="fas fa-plus"></i> Add Response</button>
                        </div>
                    </div>

                    <div id="response-box-${topic.id}" style="display:none; margin-bottom: 20px;">
                        <textarea id="res-text-${topic.id}" placeholder="Write your biblical response..." style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid #8b5a2b; color: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-family:'Cardo', serif; min-height:80px; outline:none;"></textarea>
                        <button onclick="submitResponse('${topic.id}')" class="submit-testimony-btn" style="float:none;">Post Response</button>
                    </div>

                    <div class="comment-thread">
                        ${responsesHtml || '<p style="color:#a67c52; font-style:italic;">No responses yet. Be the first to answer!</p>'}
                    </div>
                </div>
            `;
        }).join('');
        
        topicsContainer.innerHTML = topicsHtml || '<p style="text-align: center; color: #a67c52;">No topics yet.</p>';

        // RENDER TESTIMONIES
        const testimoniesHtml = testimoniesArray.map(testimony => {
            const isOwner = testimony.author_type === 'admin';
            return `
            <div class="post testimony-post ${isOwner ? 'owner-post' : ''}">
                <div class="post-user-info">
                    <div class="avatar ${isOwner ? 'owner-avatar' : ''}"><i class="fas ${isOwner ? 'fa-crown' : 'fa-user'}"></i></div>
                    <div class="user-details">
                        <span class="username">${testimony.author_name}</span>
                        <span class="post-time">${timeAgo(testimony.created_at)}</span>
                    </div>
                </div>
                <div class="post-content"><p>${testimony.content}</p></div>
                <div class="post-actions">
                    <button class="action-btn" onclick="interact('testimonies', '${testimony.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${testimony.likes_count || 0}</span></button>
                    <button class="action-btn" onclick="interact('testimonies', '${testimony.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${testimony.favorites_count || 0}</span></button>
                </div>
            </div>
            `;
        }).join('');
        
        testimoniesContainer.innerHTML = testimoniesHtml || '<p style="color:#a67c52; text-align:center;">Be the first to share a testimony!</p>';

    } catch (err) {
        clearTimeout(wakeUpTimeout);
        console.error("Error loading forum data:", err);
        // Display the EXACT error on the screen so we can fix it!
        topicsContainer.innerHTML = `
            <div style="background: rgba(255,0,0,0.1); border: 1px solid red; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #ff4d4d; margin-bottom: 10px;">Connection Error</h3>
                <p style="color: white; font-family: 'Cardo', serif;">${err.message}</p>
            </div>`;
    }
}

// 2. Submit Handlers
window.submitTopic = async function() {
    if (!rawUser) return alert("Please login or continue as a guest to post.");
    const title = document.getElementById("new-topic-title").value.trim();
    if (!title) return alert("Topic title cannot be empty.");

    const btn = document.querySelector("#new-topic-title").nextElementSibling;
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Posting...";

    try {
        const res = await fetch(`${BACKEND_URL}/api/add-topic`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author_name: currentUser, author_type: currentAuthorType })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        document.getElementById("new-topic-title").value = "";
        loadForumData();
    } catch (err) {
        alert("Error posting topic: " + err.message);
    } finally {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Topic';
    }
}

window.submitResponse = async function(topicId) {
    if (!rawUser) return alert("Please login or continue as a guest to post.");
    const content = document.getElementById(`res-text-${topicId}`).value.trim();
    if (!content) return alert("Response cannot be empty.");

    try {
        const res = await fetch(`${BACKEND_URL}/api/add-response`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic_id: topicId, author_name: currentUser, author_type: currentAuthorType, content })
        });
        if (!res.ok) throw new Error("Failed to post");
        loadForumData(); 
    } catch (err) {
        alert("Error posting response: " + err.message);
    }
}

window.submitComment = async function(responseId) {
    if (!rawUser) return alert("Please login to comment.");
    const content = document.getElementById(`text-${responseId}`).value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/add-comment`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response_id: responseId, author_name: currentUser, author_type: currentAuthorType, content })
        });
        if (!res.ok) throw new Error("Failed to post comment");
        loadForumData();
    } catch (err) {
        alert("Error posting comment: " + err.message);
    }
}

window.submitTestimony = async function() {
    if (!rawUser) return alert("Please login to share your testimony.");
    const content = document.getElementById("testimony-text").value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/add-testimony`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author_name: currentUser, author_type: currentAuthorType, content })
        });
        if (!res.ok) throw new Error("Failed to post testimony");
        document.getElementById("testimony-text").value = "";
        loadForumData();
    } catch (err) {
        alert("Error posting testimony: " + err.message);
    }
}

// 3. Interactions (Likes/Favs)
window.interact = async function(table, id, column, btnElement) {
    const isActive = btnElement.classList.toggle('active');
    const span = btnElement.querySelector('.count');
    span.textContent = parseInt(span.textContent) + (isActive ? 1 : -1);
    
    const icon = btnElement.querySelector('i');
    icon.style.transform = "scale(1.4)";
    setTimeout(() => icon.style.transform = "", 200);

    fetch(`${BACKEND_URL}/api/interact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, column, increment: isActive })
    });
}