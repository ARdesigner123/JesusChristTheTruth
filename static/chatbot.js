// We attach variables to 'window' to guarantee they NEVER crash with script.js!
window.chatApiEndpoint = "https://jesusbackend.onrender.com";
window.activeChatUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user");
window.currentChatSession = null;

document.addEventListener("DOMContentLoaded", () => {
    console.log("GuideBot Initialized safely.");
    if (window.activeChatUser) {
        window.loadChatHistory();
    } else {
        document.getElementById("chat-history-list").innerHTML = "<p style='color:#ff4d4d; text-align:center;'>Please log in to save chats.</p>";
        window.showGreeting();
    }
});

// --- SIDEBAR LOGIC ---
window.loadChatHistory = async function() {
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

        if (!window.currentChatSession && chats.length > 0) {
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
    window.currentChatSession = null;
    document.getElementById("current-chat-title").innerText = "New Conversation";
    document.getElementById("chat-box").innerHTML = "";
    document.getElementById("starter-btns").style.display = "flex";
    window.showGreeting();
    window.loadChatHistory(); 
}

window.openChat = async function(id, title) {
    window.currentChatSession = id;
    document.getElementById("current-chat-title").innerText = title;
    document.getElementById("starter-btns").style.display = "none";
    document.getElementById("chat-box").innerHTML = `<p style="text-align:center; color:#a67c52;">Loading messages...</p>`;
    window.loadChatHistory(); 

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
    window.loadChatHistory();
}

window.renameChat = async function(id, oldTitle) {
    const newTitle = prompt("Enter new chat name:", oldTitle);
    if (!newTitle || newTitle.trim() === "") return;
    
    await fetch(`${window.chatApiEndpoint}/api/chats/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: newTitle.trim() })
    });
    if (window.currentChatSession === id) document.getElementById("current-chat-title").innerText = newTitle.trim();
    window.loadChatHistory();
}

window.deleteChat = async function(id) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`${window.chatApiEndpoint}/api/chats/${id}`, { method: 'DELETE' });
    if (window.currentChatSession === id) window.createNewChat();
    else window.loadChatHistory();
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
    // Hide ALL starter buttons immediately upon clicking one
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

    if (!window.currentChatSession && window.activeChatUser) {
        try {
            const res = await fetch(`${window.chatApiEndpoint}/api/chats`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: window.activeChatUser, title: text.substring(0, 25) + "..." })
            });
            const session = await res.json();
            window.currentChatSession = session.id;
            document.getElementById("current-chat-title").innerText = session.title;
            window.loadChatHistory();
        } catch (err) { console.error("Failed to create session"); }
    }

    if (window.currentChatSession) {
        fetch(`${window.chatApiEndpoint}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ session_id: window.currentChatSession, sender: 'user', content: text })
        });
    }

    const chatBox = document.getElementById("chat-box");
    const typingId = "typing-" + Date.now();
    chatBox.innerHTML += `
        <div class="message bot-message" id="${typingId}">
            <img src="static/image/botLogo.png" class="msg-bot-icon">
            <div class="msg-bubble" style="font-style: italic; color: #a67c52;">GuideBot is searching the scriptures...</div>
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
    
    // 2. WEBSITE & BASIC INFO
    } else if (text.includes("what is this website about") || text.includes("about this site")) {
        response = `<strong>Jesus Christ The Truth</strong> is a digital sanctuary dedicated to helping people discover the unconditional love of Jesus. <br><br>Here, you can read about biblical truths, explore the origins of the Orthodox, Catholic, and Protestant Bibles, engage in deep theological discussions in our Forums, and read real-life testimonies.`;
    
    // 3. STARTING THE JOURNEY / SALVATION
    } else if (text.includes("start my spiritual journey") || text.includes("steps to salvation") || text.includes("how to be saved")) {
        response = `Salvation is a beautiful gift received by grace through faith (Ephesians 2:8-9). It is not earned by good works. Here is the biblical path:<br><br>
        <strong>1. Acknowledge:</strong> "For all have sinned and fall short of the glory of God." (Romans 3:23)<br>
        <strong>2. Believe:</strong> Believe that Jesus died on the cross to pay the penalty for your sins. (Romans 5:8)<br>
        <strong>3. Surrender:</strong> "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised him from the dead, you will be saved." (Romans 10:9)<br><br>
        <em>Analogy:</em> Imagine drowning in the ocean. You can't swim to safety. A rescue helicopter lowers a rope (Jesus). You don't 'earn' the rescue by swimming harder; you just have to grab the rope and trust the rescuer!`;

    // 4. CLOSER TO GOD / ROUTINE
    } else if (text.includes("closer to god") || text.includes("daily routine") || text.includes("healthy follower")) {
        response = `Drawing closer to God is about cultivating a daily relationship, not just following a checklist. James 4:8 says, <em>"Come near to God and he will come near to you."</em><br><br>
        A healthy daily routine might look like this:<br>
        • <strong>Morning:</strong> Start with 10-15 minutes reading the Word. The Gospel of John or the Psalms are great places to begin.<br>
        • <strong>Throughout the Day:</strong> Practice "praying without ceasing" (1 Thess 5:17). Talk to God while driving, cooking, or working. Include Him in your normal day.<br>
        • <strong>Evening:</strong> End the day with a moment of gratitude, thanking Him for specific blessings.<br>
        • <strong>Weekly:</strong> Gather with a local, Bible-believing church community for worship and accountability.`;

    // 5. DENOMINATIONS
    } else if (text.includes("denomination") || text.includes("does denomination matter") || text.includes("which church")) {
        response = `The short answer is: <strong>Yes and No.</strong><br><br>
        It does <em>not</em> matter for your salvation. Ephesians 4:4 says there is "one body and one Spirit." If a church believes in the core Gospel—that Jesus is the Son of God, died for our sins, and resurrected—they are our brothers and sisters.<br><br>
        Denominations exist because Christians have different convictions on secondary issues (like baptism methods or worship styles). <br><br>
        <em>Think of it like the Military:</em> You have the Army, Navy, and Air Force. They wear different uniforms and train differently (denominations), but they are all fighting the same spiritual war under the exact same Commander-in-Chief: Jesus Christ!`;

    // 6. ONCE SAVED ALWAYS SAVED / ASSURANCE
    } else if (text.includes("once saved always saved") || text.includes("lose my salvation") || text.includes("how do i know if im saved")) {
        response = `This is a deeply debated topic, but the Bible offers profound assurance to true believers. Jesus said in John 10:28, <em>"I give them eternal life, and they shall never perish; no one will snatch them out of my hand."</em> Furthermore, Ephesians 1:13 says believers are "sealed" with the Holy Spirit.<br><br>
        However, this is not a license to sin willfully. 1 John 2:19 warns that those who completely abandon the faith never truly belonged to Christ to begin with.<br><br>
        <em>Analogy:</em> If you are legally adopted by a loving father, you are given his name and inheritance permanently. You might disobey and need discipline, but you cannot be 'un-adopted.' True salvation is secure in God's grip, not ours!`;

    // 7. HELPING FRIENDS
    } else if (text.includes("help my friends") || text.includes("share the gospel") || text.includes("evangelize")) {
        response = `Helping friends grow closer to God is one of the highest callings! The best way to do this is through <strong>Love, Truth, and Testimony</strong>.<br><br>
        • <strong>Love first:</strong> People don't care how much you know until they know how much you care. Show them Christ's love through your actions (1 John 3:18).<br>
        • <strong>Share your story:</strong> You don't need a theology degree. Just tell them what Jesus has done in your own life. No one can argue with your personal testimony.<br>
        • <strong>Pray for them:</strong> Only the Holy Spirit can change a heart. Pray for God to open their eyes (Ezekiel 36:26).`;

    // 8. OVERCOMING SIN
    } else if (text.includes("overcome sin") || text.includes("stop sinning") || text.includes("struggling with sin")) {
        response = `Struggling with sin is a reality for every believer. Romans 7 shows even the Apostle Paul wrestled with this! But victory is possible through Christ.<br><br>
        1. <strong>Confess quickly:</strong> 1 John 1:9 promises that if we confess, He is faithful to forgive and cleanse us.<br>
        2. <strong>Flee temptation:</strong> Don't try to "fight" temptations that you can simply run away from (like Joseph fleeing Potiphar's wife in Genesis 39). Cut off access to things that cause you to stumble.<br>
        3. <strong>Walk in the Spirit:</strong> Galatians 5:16 says, <em>"Walk by the Spirit, and you will not gratify the desires of the flesh."</em> Fill your mind with scripture and worship so there is no room for the flesh.`;

    // 9. SPIRITUAL WARFARE & DEMONS
    } else if (text.includes("spiritual warfare") || text.includes("demons") || text.includes("oppressed") || text.includes("spiritual world")) {
        response = `The Bible makes it very clear that the spiritual realm is real. Ephesians 6:12 says, <em>"For our struggle is not against flesh and blood, but against the rulers, against the authorities, against the powers of this dark world..."</em><br><br>
        <strong>What is Spiritual Warfare?</strong> It is the unseen battle between God's angels and Satan's demonic forces. Satan's primary weapon is <em>lies and deception</em> (John 8:44). He tries to oppress people with fear, crippling anxiety, and false beliefs.<br><br>
        <strong>How to fight back:</strong> We do not fight with human weapons. We put on the "Armor of God" (Ephesians 6). Our greatest weapon is the <em>Sword of the Spirit, which is the Word of God.</em> When Jesus was tempted by Satan in the desert, He didn't argue—He simply quoted Scripture.<br><br>
        If someone feels oppressed, they must submit to God, renounce any involvement in the occult or deliberate sin, and command the enemy to leave in the authority of Jesus' name. <em>"Submit yourselves, then, to God. Resist the devil, and he will flee from you." (James 4:7)</em>`;

    // 10. ANXIETY & FEAR
    } else if (text.includes("anxious") || text.includes("anxiety") || text.includes("fear") || text.includes("worry")) {
        response = `It is completely normal to feel anxious in this fast-paced world, but God does not want you to carry that burden alone. <br><br>Philippians 4:6-7 encourages us: <em>"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."</em> Take a deep breath, and give your worries to Him today.`;

    // 11. GREETINGS
    } else if (text.includes("hello") || text.includes("hi ") || text === "hi" || text.includes("hey")) {
        response = `Hello there! Peace be with you. How can I assist you with your spiritual questions or biblical studies today?`;
        
    // 12. FALLBACK
    } else {
        response = `That is a profound question. While my programmed responses are limited to certain spiritual topics, I highly encourage you to post this exact question in our <strong><a href="topic.html" style="color:#ffd700;">Topics & Discussions</a></strong> forum! Our community and Admin would love to engage with you and provide a detailed biblical answer.`;
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