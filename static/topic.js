document.addEventListener("DOMContentLoaded", () => {
    loadForumData();
});

const BACKEND_URL = "https://jesusbackend.onrender.com";

// Determine user identity
const normalUser = localStorage.getItem("jct_logged_in_user");
const guestUser = localStorage.getItem("jct_guest_user");
const rawUser = normalUser || guestUser;

// SET ADMIN LOGIC: If AaronNg123 logs in, make him the Admin!
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
        if (box.style.display === "block") {
            box.style.display = "none";
        } else {
            box.style.display = "block";
        }
    }
}

// 1. Fetch & Render All Data
async function loadForumData() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/forum`);
        const data = await res.json();

        // RENDER TOPICS & NESTED RESPONSES
        const topicsHtml = data.topics.map(topic => {
            const responsesList = topic.responses || [];
            
            // Map the responses inside this topic
            const responsesHtml = responsesList.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(response => {
                const isOwner = response.author_type === 'admin';
                const commentsList = response.comments || [];
                
                // Map the comments inside this response
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
                                <button class="action-btn" onclick="interact('comments', '${comment.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${comment.likes_count}</span></button>
                                <button class="action-btn" onclick="interact('comments', '${comment.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${comment.favorites_count}</span></button>
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
                            <button class="action-btn" onclick="interact('responses', '${response.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${response.likes_count}</span></button>
                            <button class="action-btn" onclick="interact('responses', '${response.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${response.favorites_count}</span></button>
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
                        <span class="post-time" style="color: #a67c52; margin-bottom: 5px;">Posted by <strong style="color:${topic.author_type === 'admin' ? '#ffd700' : '#e6e6e6'}">${topic.author_name}</strong> • ${timeAgo(topic.created_at)}</span>
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
        
        document.getElementById('topics-container').innerHTML = topicsHtml || '<p style="text-align: center; color: #a67c52;">No topics yet.</p>';

        // RENDER TESTIMONIES
        const testimoniesHtml = data.testimonies.map(testimony => {
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
                    <button class="action-btn" onclick="interact('testimonies', '${testimony.id}', 'likes_count', this)"><i class="fas fa-heart"></i> <span class="count">${testimony.likes_count}</span></button>
                    <button class="action-btn" onclick="interact('testimonies', '${testimony.id}', 'favorites_count', this)"><i class="fas fa-star"></i> <span class="count">${testimony.favorites_count}</span></button>
                </div>
            </div>
            `;
        }).join('');
        
        document.getElementById('testimonies-container').innerHTML = testimoniesHtml || '<p style="color:#a67c52; text-align:center;">Be the first to share a testimony!</p>';

    } catch (err) {
        console.error("Error loading forum data:", err);
    }
}

// 2. Submit Handlers
window.submitTopic = async function() {
    if (!rawUser) return alert("Please login or continue as a guest to post.");
    const title = document.getElementById("new-topic-title").value.trim();
    if (!title) return alert("Topic title cannot be empty.");

    await fetch(`${BACKEND_URL}/api/add-topic`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author_name: currentUser, author_type: currentAuthorType })
    });
    document.getElementById("new-topic-title").value = "";
    loadForumData();
}

window.submitResponse = async function(topicId) {
    if (!rawUser) return alert("Please login or continue as a guest to post.");
    const content = document.getElementById(`res-text-${topicId}`).value.trim();
    if (!content) return alert("Response cannot be empty.");

    await fetch(`${BACKEND_URL}/api/add-response`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, author_name: currentUser, author_type: currentAuthorType, content })
    });
    loadForumData(); 
}

window.submitComment = async function(responseId) {
    if (!rawUser) return alert("Please login to comment.");
    const content = document.getElementById(`text-${responseId}`).value.trim();
    if (!content) return;

    await fetch(`${BACKEND_URL}/api/add-comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_id: responseId, author_name: currentUser, author_type: currentAuthorType, content })
    });
    loadForumData();
}

window.submitTestimony = async function() {
    if (!rawUser) return alert("Please login to share your testimony.");
    const content = document.getElementById("testimony-text").value.trim();
    if (!content) return;

    await fetch(`${BACKEND_URL}/api/add-testimony`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_name: currentUser, author_type: currentAuthorType, content })
    });
    document.getElementById("testimony-text").value = "";
    loadForumData();
}

// 3. Interactions (Likes/Favs)
window.interact = async function(table, id, column, btnElement) {
    const isActive = btnElement.classList.toggle('active');
    const span = btnElement.querySelector('.count');
    span.textContent = parseInt(span.textContent) + (isActive ? 1 : -1);
    
    // Add visual pop
    const icon = btnElement.querySelector('i');
    icon.style.transform = "scale(1.4)";
    setTimeout(() => icon.style.transform = "", 200);

    // Send to DB
    await fetch(`${BACKEND_URL}/api/interact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, column, increment: isActive })
    });
}