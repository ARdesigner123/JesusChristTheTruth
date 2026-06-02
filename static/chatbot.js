// We attach variables to 'window' to guarantee they NEVER crash with script.js!
window.chatApiEndpoint = "https://jesusbackend.onrender.com";
window.activeChatUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user");
window.currentChatSession = null;

document.addEventListener("DOMContentLoaded", () => {
    console.log("GuideBot Initialized safely.");
    if (window.activeChatUser) {
        // Pass 'true' to auto-open the latest chat only when the page first loads
        window.loadChatHistory(true);
    } else {
        document.getElementById("chat-history-list").innerHTML = "<p style='color:#ff4d4d; text-align:center;'>Please log in to save chats.</p>";
        window.showGreeting();
    }
});

// --- SIDEBAR LOGIC ---
// Added 'autoOpen' parameter to prevent "New Chat" from bouncing back to the old chat
window.loadChatHistory = async function(autoOpen = false) {
    const list = document.getElementById("chat-history-list");
    
    const wakeUpTimeout = setTimeout(() => {
        if (list.innerHTML.includes("Loading")) {
            list.innerHTML = `<p style="color:#ffd700; text-align:center; font-size:0.9rem;"><i class="fas fa-spinner fa-spin"></i> Waking up server (~50s)...</p>`;
        }
    }, 3000);

    try {
        const res = await fetch(`${window.chatApiEndpoint}/api/chats/${window.activeChatUser}`);
        clearTimeout(wakeUpTimeout);
        
        if (!res.ok) throw new Error("Server error");
        
        const chats = await res.json();
        
        if (chats.length === 0) {
            list.innerHTML = "<p style='color:#a67c52; text-align:center;'>No saved chats yet.</p>";
            if (document.getElementById("chat-box").innerHTML.trim() === "") {
                window.showGreeting();
            }
            return;
        }

        list.innerHTML = chats.map(chat => `
            <div class="history-item ${chat.id === window.currentChatSession ? 'active' : ''}" onclick="window.openChat('${chat.id}', '${chat.title.replace(/'/g, "\\'")}')">
                <div class="history-title">${chat.title}</div>
                <div class="history-actions">
                    <i class="fas fa-star ${chat.is_favorite ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleFavorite('${chat.id}', ${!chat.is_favorite})"></i>
                    <i class="fas fa-edit" onclick="event.stopPropagation(); window.renameChat('${chat.id}', '${chat.title.replace(/'/g, "\\'")}')"></i>
                    <i class="fas fa-trash" onclick="event.stopPropagation(); window.deleteChat('${chat.id}')"></i>
                </div>
            </div>
        `).join('');

        // Only auto-open if autoOpen is true (e.g. on page load or after a deletion)
        if (autoOpen && !window.currentChatSession && chats.length > 0) {
            window.openChat(chats[0].id, chats[0].title);
        }
    } catch (err) { 
        clearTimeout(wakeUpTimeout);
        console.error("Chat History Error:", err); 
        list.innerHTML = `<p style="color:#ff4d4d; text-align:center; font-size:0.9rem;">Server connection failed. Please refresh.</p>`;
        window.showGreeting();
    }
}

window.createNewChat = function() {
    // Prevent doing anything if we are already in an empty new chat
    if (window.currentChatSession === null) return; 

    window.currentChatSession = null;
    document.getElementById("current-chat-title").innerText = "New Conversation";
    document.getElementById("chat-box").innerHTML = "";
    document.getElementById("starter-btns").style.display = "flex";
    window.showGreeting();
    
    // Pass false so it doesn't auto-open the old chat!
    window.loadChatHistory(false); 
}

window.openChat = async function(id, title) {
    window.currentChatSession = id;
    document.getElementById("current-chat-title").innerText = title;
    document.getElementById("starter-btns").style.display = "none";
    document.getElementById("chat-box").innerHTML = `<p style="text-align:center; color:#a67c52;">Loading messages...</p>`;
    
    window.loadChatHistory(false); // Update active highlight without auto-opening

    try {
        const res = await fetch(`${window.chatApiEndpoint}/api/messages/${id}`);
        const messages = await res.json();
        
        document.getElementById("chat-box").innerHTML = "";
        messages.forEach(msg => window.appendMessage(msg.content, msg.sender));
    } catch (err) { 
        console.error(err); 
        document.getElementById("chat-box").innerHTML = `<p style="text-align:center; color:#ff4d4d;">Failed to load messages.</p>`;
    }
}

window.toggleFavorite = async function(id, isFav) {
    await fetch(`${window.chatApiEndpoint}/api/chats/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_favorite: isFav })
    });
    window.loadChatHistory(false);
}

window.renameChat = async function(id, oldTitle) {
    const newTitle = prompt("Enter new chat name:", oldTitle);
    if (!newTitle || newTitle.trim() === "") return;
    
    await fetch(`${window.chatApiEndpoint}/api/chats/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: newTitle.trim() })
    });
    if (window.currentChatSession === id) document.getElementById("current-chat-title").innerText = newTitle.trim();
    window.loadChatHistory(false);
}

window.deleteChat = async function(id) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`${window.chatApiEndpoint}/api/chats/${id}`, { method: 'DELETE' });
    
    if (window.currentChatSession === id) {
        window.currentChatSession = null;
        window.loadChatHistory(true); // If we delete the current chat, auto-open the next one
    } else {
        window.loadChatHistory(false);
    }
}

// --- BOT LOGIC ---
window.containsProfanity = function(text) {
    const badWordsList = ["fuck", "shit", "bitch", "ass", "cunt", "damn", "dick", "pussy", "bastard", "slut", "whore"];
    const lowerText = text.toLowerCase();
    for (let word of badWordsList) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(lowerText)) return true;
    }
    return false;
}

window.handleEnter = function(e) {
    if (e.key === "Enter") window.sendMessage();
}

window.sendStarter = function(text) {
    document.getElementById("chat-input").value = text;
    document.getElementById("starter-btns").style.display = "none";
    window.sendMessage();
}

window.showGreeting = function() {
    document.getElementById("chat-box").innerHTML = "";
    window.appendMessage("Greetings! I am GuideBot. I am here to help you navigate your spiritual journey using the truth of God's Word. How can I assist you today?", "bot");
}

window.sendMessage = async function() {
    const inputField = document.getElementById("chat-input");
    const text = inputField.value.trim();
    if (!text) return;

    window.appendMessage(text, "user");
    inputField.value = "";
    document.getElementById("starter-btns").style.display = "none";

    // 1. Create a session if none exists
    if (!window.currentChatSession && window.activeChatUser) {
        try {
            const res = await fetch(`${window.chatApiEndpoint}/api/chats`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: window.activeChatUser, title: text.substring(0, 25) + "..." })
            });
            const session = await res.json();
            window.currentChatSession = session.id;
            document.getElementById("current-chat-title").innerText = session.title;
            window.loadChatHistory(false);
        } catch (err) { console.error("Failed to create session"); }
    }

    // 2. Save User Message
    if (window.currentChatSession) {
        fetch(`${window.chatApiEndpoint}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ session_id: window.currentChatSession, sender: 'user', content: text })
        });
    }

    // Show typing
    const chatBox = document.getElementById("chat-box");
    const typingId = "typing-" + Date.now();
    chatBox.innerHTML += `
        <div class="message bot-message" id="${typingId}">
            <img src="static/image/botLogo.png" class="msg-bot-icon">
            <div class="msg-bubble" style="font-style: italic; color: #a67c52;">GuideBot is reflecting on scripture...</div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    setTimeout(() => {
        const typingIndicator = document.getElementById(typingId);
        if(typingIndicator) typingIndicator.remove();
        window.generateBotResponse(text);
    }, 1500);
}

window.appendMessage = function(text, sender) {
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${sender}-message`;

    if (sender === "bot") {
        msgDiv.innerHTML = `<img src="static/image/botLogo.png" class="msg-bot-icon" alt="Bot"> <div class="msg-bubble">${text}</div>`;
    } else {
        msgDiv.innerHTML = `<div class="msg-bubble">${text}</div>`;
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.generateBotResponse = function(userInput) {
    const text = userInput.toLowerCase();
    let response = "";

    // 1. PROFANITY FILTER
    if (window.containsProfanity(text)) {
        response = "I am designed to engage in respectful and uplifting spiritual conversations. Let's keep our language honorable. How can I help you with your faith today?";
    
    // 2. EXHAUSTION, DEPRESSION, NUMBNESS
    } else if (text.includes("depress") || text.includes("tired") || text.includes("numb") || text.includes("exhaust") || text.includes("burnout") || text.includes("give up") || text.includes("heavy") || text.includes("hopeless") || text.includes("sad")) {
        response = `I am so sorry you are feeling this way. Please know that God sees your pain and He is close to the brokenhearted (Psalm 34:18). <br><br>
        When you feel totally numb or exhausted, Jesus offers a beautiful, gentle invitation in Matthew 11:28: <em>"Come to me, all you who are weary and burdened, and I will give you rest."</em><br><br>
        You do not need to muster up energy to impress God right now. It is completely okay to just sit in His presence and say, "Lord, I am tired. Help me." He meets you right where you are. 
        <br><br><em>(Note: If you are feeling deeply depressed or hopeless, please consider reaching out to a counselor or pastor who can walk alongside you. God works powerfully through medical and professional help, too!)</em>`;

    // 3. ANXIETY & FEAR
    } else if (text.includes("anxious") || text.includes("anxiety") || text.includes("fear") || text.includes("worry") || text.includes("overthink") || text.includes("panic")) {
        response = `It is completely normal to feel anxious in this fast-paced world, but God does not want you to carry that heavy burden alone. <br><br>Philippians 4:6-7 encourages us: <em>"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."</em> <br><br>Take a deep breath right now, and imagine physically handing your worries over to Him.`;

    // 4. WEBSITE & BASIC INFO
    } else if (text.includes("what is this website about") || text.includes("about this site")) {
        response = `<strong>Jesus Christ The Truth</strong> is a digital sanctuary dedicated to helping people discover the unconditional love of Jesus. <br><br>Here, you can read about biblical truths, explore the origins of the Orthodox, Catholic, and Protestant Bibles, engage in deep theological discussions in our Forums, and read real-life testimonies.`;
    
    // 5. STARTING THE JOURNEY / SALVATION
    } else if (text.includes("start my spiritual journey") || text.includes("steps to salvation") || text.includes("how to be saved")) {
        response = `Salvation is a beautiful gift received by grace through faith (Ephesians 2:8-9). It is not earned by good works. Here is the biblical path:<br><br>
        <strong>1. Acknowledge:</strong> "For all have sinned and fall short of the glory of God." (Romans 3:23)<br>
        <strong>2. Believe:</strong> Believe that Jesus died on the cross to pay the penalty for your sins. (Romans 5:8)<br>
        <strong>3. Surrender:</strong> "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised him from the dead, you will be saved." (Romans 10:9)<br><br>
        <em>Analogy:</em> Imagine drowning in the ocean. You can't swim to safety. A rescue helicopter lowers a rope (Jesus). You don't 'earn' the rescue by swimming harder; you just have to grab the rope and trust the rescuer!`;

    // 6. CLOSER TO GOD / ROUTINE
    } else if (text.includes("closer to god") || text.includes("daily routine") || text.includes("healthy follower")) {
        response = `Drawing closer to God is about cultivating a daily relationship, not just following a checklist. James 4:8 says, <em>"Come near to God and he will come near to you."</em><br><br>
        A healthy daily routine might look like this:<br>
        • <strong>Morning:</strong> Start with 10-15 minutes reading the Word. The Gospel of John or the Psalms are great places to begin.<br>
        • <strong>Throughout the Day:</strong> Practice "praying without ceasing" (1 Thess 5:17). Talk to God while driving, cooking, or working. Include Him in your normal day.<br>
        • <strong>Evening:</strong> End the day with a moment of gratitude, thanking Him for specific blessings.<br>
        • <strong>Weekly:</strong> Gather with a local, Bible-believing church community for worship and accountability.`;

    // 7. OVERCOMING SIN
    } else if (text.includes("overcome sin") || text.includes("stop sinning") || text.includes("struggling with sin")) {
        response = `Struggling with sin is a reality for every believer. Romans 7 shows even the Apostle Paul wrestled with this! But victory is possible through Christ.<br><br>
        1. <strong>Confess quickly:</strong> 1 John 1:9 promises that if we confess, He is faithful to forgive and cleanse us.<br>
        2. <strong>Flee temptation:</strong> Don't try to "fight" temptations that you can simply run away from. Cut off access to things that cause you to stumble.<br>
        3. <strong>Walk in the Spirit:</strong> Galatians 5:16 says, <em>"Walk by the Spirit, and you will not gratify the desires of the flesh."</em> Fill your mind with scripture and worship so there is no room for the flesh.`;

    // 8. GREETINGS
    } else if (text.includes("hello") || text.includes("hi ") || text === "hi" || text.includes("hey")) {
        response = `Hello there! Peace be with you. How can I assist you with your spiritual questions or biblical studies today?`;
        
    // 9. FUNCTIONAL FALLBACK (Answers anything else nicely)
    } else {
        response = `That is a very deep and meaningful question. <br><br>
        In times of uncertainty or when seeking answers, Proverbs 3:5-6 reminds us: <em>"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."</em><br><br>
        While my programming is currently focused on core biblical topics and emotional support, our church community and pastors would love to help you with this specific thought. I highly encourage you to post this in our <strong><a href="topic.html" style="color:#ffd700;">Topics & Discussions</a></strong> forum so our members can offer a detailed, scriptural answer!`;
    }

    window.appendMessage(response, "bot");

    // Save Bot Message to DB
    if (window.currentChatSession) {
        fetch(`${window.chatApiEndpoint}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ session_id: window.currentChatSession, sender: 'bot', content: response })
        });
    }
}