const BACKEND_URL = "https://jesusbackend.onrender.com";
const activeUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user");

let currentSessionId = null;

document.addEventListener("DOMContentLoaded", () => {
    if (activeUser) {
        loadChatHistory();
    } else {
        document.getElementById("chat-history-list").innerHTML = "<p style='color:#ff4d4d; text-align:center;'>Please log in to save chats.</p>";
        showGreeting();
    }
});

// --- SIDEBAR LOGIC ---
async function loadChatHistory() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/chats/${activeUser}`);
        const chats = await res.json();
        
        const list = document.getElementById("chat-history-list");
        if (chats.length === 0) {
            list.innerHTML = "<p style='color:#a67c52; text-align:center;'>No saved chats yet.</p>";
            showGreeting();
            return;
        }

        list.innerHTML = chats.map(chat => `
            <div class="history-item ${chat.id === currentSessionId ? 'active' : ''}" onclick="openChat('${chat.id}', '${chat.title}')">
                <div class="history-title">${chat.title}</div>
                <div class="history-actions">
                    <i class="fas fa-star ${chat.is_favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${chat.id}', ${!chat.is_favorite})"></i>
                    <i class="fas fa-edit" onclick="event.stopPropagation(); renameChat('${chat.id}', '${chat.title}')"></i>
                    <i class="fas fa-trash" onclick="event.stopPropagation(); deleteChat('${chat.id}')"></i>
                </div>
            </div>
        `).join('');

        // Automatically open the most recent chat on load
        if (!currentSessionId && chats.length > 0) {
            openChat(chats[0].id, chats[0].title);
        }
    } catch (err) { console.error(err); }
}

function createNewChat() {
    currentSessionId = null;
    document.getElementById("current-chat-title").innerText = "New Conversation";
    document.getElementById("chat-box").innerHTML = "";
    document.getElementById("starter-btns").style.display = "flex";
    showGreeting();
    loadChatHistory(); // Removes active highlight
}

async function openChat(id, title) {
    currentSessionId = id;
    document.getElementById("current-chat-title").innerText = title;
    document.getElementById("starter-btns").style.display = "none";
    document.getElementById("chat-box").innerHTML = `<p style="text-align:center; color:#a67c52;">Loading messages...</p>`;
    loadChatHistory(); // Update active highlight

    try {
        const res = await fetch(`${BACKEND_URL}/api/messages/${id}`);
        const messages = await res.json();
        
        document.getElementById("chat-box").innerHTML = "";
        messages.forEach(msg => appendMessage(msg.content, msg.sender));
    } catch (err) { console.error(err); }
}

async function toggleFavorite(id, isFav) {
    await fetch(`${BACKEND_URL}/api/chats/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_favorite: isFav })
    });
    loadChatHistory();
}

async function renameChat(id, oldTitle) {
    const newTitle = prompt("Enter new chat name:", oldTitle);
    if (!newTitle || newTitle.trim() === "") return;
    
    await fetch(`${BACKEND_URL}/api/chats/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: newTitle.trim() })
    });
    if (currentSessionId === id) document.getElementById("current-chat-title").innerText = newTitle.trim();
    loadChatHistory();
}

async function deleteChat(id) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`${BACKEND_URL}/api/chats/${id}`, { method: 'DELETE' });
    if (currentSessionId === id) createNewChat();
    else loadChatHistory();
}

// --- BOT LOGIC ---
const badWords = ["fuck", "shit", "bitch", "ass", "cunt", "damn", "dick", "pussy", "bastard", "slut", "whore"];

function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    for (let word of badWords) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(lowerText)) return true;
    }
    return false;
}

function handleEnter(e) {
    if (e.key === "Enter") sendMessage();
}

function sendStarter(text) {
    document.getElementById("chat-input").value = text;
    sendMessage();
}

function showGreeting() {
    document.getElementById("chat-box").innerHTML = "";
    appendMessage("Greetings! I am GuideBot. I am here to help you navigate your spiritual journey using the truth of God's Word. How can I assist you today?", "bot");
}

async function sendMessage() {
    const inputField = document.getElementById("chat-input");
    const text = inputField.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    inputField.value = "";
    document.getElementById("starter-btns").style.display = "none";

    // 1. Create a session if none exists
    if (!currentSessionId && activeUser) {
        try {
            const res = await fetch(`${BACKEND_URL}/api/chats`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: activeUser, title: text.substring(0, 25) + "..." })
            });
            const session = await res.json();
            currentSessionId = session.id;
            document.getElementById("current-chat-title").innerText = session.title;
            loadChatHistory();
        } catch (err) { console.error("Failed to create session"); }
    }

    // 2. Save User Message
    if (currentSessionId) {
        fetch(`${BACKEND_URL}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ session_id: currentSessionId, sender: 'user', content: text })
        });
    }

    // Show typing
    const chatBox = document.getElementById("chat-box");
    const typingId = "typing-" + Date.now();
    chatBox.innerHTML += `
        <div class="message bot-message" id="${typingId}">
            <img src="static/image/botLogo.png" class="msg-bot-icon">
            <div class="msg-bubble" style="font-style: italic; color: #a67c52;">GuideBot is typing...</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    setTimeout(() => {
        document.getElementById(typingId).remove();
        generateBotResponse(text);
    }, 1200);
}

function appendMessage(text, sender) {
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${sender}-message`;

    if (sender === "bot") {
        msgDiv.innerHTML = `<img src="static/image/botLogo.png" class="msg-bot-icon"> <div class="msg-bubble">${text}</div>`;
    } else {
        msgDiv.innerHTML = `<div class="msg-bubble">${text}</div>`;
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function generateBotResponse(userInput) {
    const text = userInput.toLowerCase();
    let response = "";

    if (containsProfanity(text)) {
        response = "I am designed to engage in respectful and uplifting spiritual conversations. Let's keep our language honorable. How can I help you with your faith today?";
    } else if (text.includes("what is this website about")) {
        response = `<strong>Jesus Christ The Truth</strong> is a digital sanctuary dedicated to helping people discover the unconditional love of Jesus. <br><br>Here, you can read about biblical truths, explore the origins of the Orthodox, Catholic, and Protestant Bibles, engage in deep theological discussions in our Forums, and read real-life testimonies.`;
    } else if (text.includes("start my spiritual journey")) {
        response = `Starting your spiritual journey is like planting a seed!<br><br>
        <strong>1. Talk to Him:</strong> <em>"Ask and it will be given to you..." (Matthew 7:7)</em><br>
        <strong>2. Read the Word:</strong> Start in the <strong>Book of John</strong>.<br>
        <strong>3. Surrender:</strong> <em>"If you declare with your mouth, 'Jesus is Lord'... you will be saved." (Romans 10:9)</em>`;
    } else if (text.includes("closer to god")) {
        response = `James 4:8 says, <em>"Come near to God and he will come near to you."</em><br><br>
        • <strong>Create a Daily Habit:</strong> Read a Psalm every morning.<br>
        • <strong>Pray Without Ceasing:</strong> Talk to God while driving or walking.<br>
        • <strong>Find Community:</strong> Find a local Bible-believing church!`;
    } else if (text.includes("anxious") || text.includes("anxiety") || text.includes("fear")) {
        response = `God does not want you to carry that burden alone. <br><br>Philippians 4:6-7 encourages us: <em>"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."</em>`;
    } else if (text.includes("sin") || text.includes("forgive") || text.includes("guilt")) {
        response = `1 John 1:9 promises: <em>"If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness."</em> When God forgives, He wipes the slate clean!`;
    } else if (text.includes("hello") || text.includes("hi ") || text === "hi" || text.includes("hey")) {
        response = `Hello there! Peace be with you. How can I assist you with your spiritual questions today?`;
    } else {
        response = `That is a profound thought. While my programmed responses are limited, I encourage you to post this exact question in our <strong><a href="topic.html" style="color:#ffd700;">Topics & Discussions</a></strong> forum! Our community would love to engage with you.`;
    }

    appendMessage(response, "bot");

    // Save Bot Message to DB
    if (currentSessionId) {
        fetch(`${BACKEND_URL}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ session_id: currentSessionId, sender: 'bot', content: response })
        });
    }
}