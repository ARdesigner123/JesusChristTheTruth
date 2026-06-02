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
    if (window.currentChatSession === null) return; 

    window.currentChatSession = null;
    document.getElementById("current-chat-title").innerText = "New Conversation";
    document.getElementById("chat-box").innerHTML = "";
    document.getElementById("starter-btns").style.display = "flex";
    window.showGreeting();
    
    window.loadChatHistory(false); 
}

window.openChat = async function(id, title) {
    window.currentChatSession = id;
    document.getElementById("current-chat-title").innerText = title;
    document.getElementById("starter-btns").style.display = "none";
    document.getElementById("chat-box").innerHTML = `<p style="text-align:center; color:#a67c52;">Loading messages...</p>`;
    
    window.loadChatHistory(false); 

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
        window.loadChatHistory(true); 
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

// ==========================================
// GUIDE BOT "BRAIN" (KEYWORD LOGIC)
// ==========================================
window.generateBotResponse = function(userInput) {
    const text = userInput.toLowerCase();
    let response = "";

    // 1. PROFANITY FILTER
    if (window.containsProfanity(text)) {
        response = "I am designed to engage in respectful and uplifting spiritual conversations. Let's keep our language honorable. How can I help you with your faith today?";
    
    // 2. THE TRINITY
    } else if (text.includes("trinity") || text.includes("father son and holy spirit") || text.includes("three in one")) {
        response = `The <strong>Trinity</strong> is the biblical concept that there is only one God, but He exists eternally in three distinct persons: The Father, The Son (Jesus), and the Holy Spirit.<br><br>
        While the specific word "Trinity" isn't in the Bible, the concept is everywhere. For example, at Jesus' baptism (Matthew 3:16-17), the Father speaks from heaven, the Son is in the water, and the Spirit descends like a dove.<br><br>
        <em>Analogy:</em> Think of a musical chord. If you play a C-Major chord, you press three distinct notes (C, E, and G) at the exact same time. They are different notes, but you only hear <strong>one</strong> chord. God is one "What" and three "Whos."`;

    // 3. ISLAM / MUSLIMS
    } else if (text.includes("islam") || text.includes("muslim") || text.includes("quran") || text.includes("allah")) {
        response = `Christianity and Islam share historical roots going back to Abraham, but they have a fundamental difference regarding <strong>Jesus Christ</strong>.<br><br>
        In Islam, Jesus (known as Isa) is highly respected as a great prophet, but Muslims do not believe He died on the cross or that He is the Son of God. <br><br>
        In Christianity, the entire faith rests on the fact that Jesus is God in the flesh, who willingly died for our sins and rose from the dead. Jesus Himself said in John 14:6, <em>"I am the way and the truth and the life. No one comes to the Father except through me."</em> We are called to love our Muslim neighbors deeply while sharing this truth with them.`;

    // 4. JUDAISM / JEWS
    } else if (text.includes("judaism") || text.includes("jew") || text.includes("torah") || text.includes("hebrew")) {
        response = `Christianity and Judaism are deeply connected. In fact, Christianity is the fulfillment of Judaism! We share the exact same foundational scriptures (the Old Testament).<br><br>
        The core difference is the identity of the <strong>Messiah</strong>. Traditional Judaism is still waiting for the Messiah to arrive. Christians believe that Jesus of Nazareth <em>is</em> that promised Messiah, fulfilling dozens of Old Testament prophecies, such as Isaiah 53, which describes a Savior who would be "pierced for our transgressions."<br><br>
        The Apostle Paul, a devout Jew who found Jesus, wrote: <em>"For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes: first to the Jew, then to the Gentile." (Romans 1:16)</em>`;

    // 5. OTHER RELIGIONS (General)
    } else if (text.includes("other religions") || text.includes("buddhism") || text.includes("hinduism") || text.includes("all religions")) {
        response = `Many people wonder, "Don't all religions lead to God?" <br><br>
        If you look closely, other world religions (like Buddhism, Hinduism, or Islam) are fundamentally based on human effort—what <em>you</em> must do to reach God or enlightenment (meditation, good karma, five pillars).<br><br>
        Christianity is entirely unique. It is not about what we do to reach God; it is about what God did to reach us. Jesus stepped down into our brokenness because we could never climb our way up to Him. Ephesians 2:8-9 reminds us that salvation is a <em>free gift</em> of grace, not a reward for our efforts.`;

    // 6. SUFFERING / THE PROBLEM OF EVIL
    } else if (text.includes("suffering") || text.includes("why does god allow") || text.includes("evil in the world") || text.includes("bad things happen")) {
        response = `The question of why God allows suffering is one of the hardest we face. <br><br>
        When God created humanity, He didn't want us to be programmed robots; He wanted a genuine relationship with us. But genuine love requires <strong>free will</strong>—the ability to choose. Unfortunately, humanity used that free will to rebel against God (Genesis 3), bringing sin, death, and brokenness into the world.<br><br>
        God does not cause evil, but He does use it for ultimate good (Romans 8:28). Most importantly, God didn't stay distant from our suffering. He entered into it. Jesus suffered betrayal, torture, and death so that one day, suffering can be defeated forever. Revelation 21:4 promises a day when <em>"He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain."</em>`;

    // 7. DID JESUS REALLY RISE? / RESURRECTION
    } else if (text.includes("resurrection") || text.includes("rise from the dead") || text.includes("is jesus alive") || text.includes("empty tomb")) {
        response = `The resurrection of Jesus is the absolute foundation of the Christian faith. As Paul wrote in 1 Corinthians 15:14, <em>"And if Christ has not been raised, our preaching is useless and so is your faith."</em><br><br>
        Historically, the evidence is overwhelming:<br>
        1. <strong>The Empty Tomb:</strong> Even Jesus' enemies couldn't produce His body to shut down the early church.<br>
        2. <strong>Eyewitnesses:</strong> Jesus appeared to over 500 people at once after His death (1 Cor 15:6).<br>
        3. <strong>The Disciples' Transformation:</strong> The apostles went from terrified cowards hiding in a room to bold preachers willing to be executed for their faith. People will die for what they <em>believe</em> is true, but they will not die for a lie they invented themselves.`;

    // 8. IS JESUS GOD?
    } else if (text.includes("who is jesus") || text.includes("is jesus god") || text.includes("jesus real")) {
        response = `Yes, Jesus is God in human flesh. He claimed this very clearly during His life.<br><br>
        In John 8:58, Jesus said, <em>"Very truly I tell you, before Abraham was born, I am!"</em> He used the sacred name of God (Yahweh / I AM) for Himself. In John 10:30, He stated, <em>"I and the Father are one."</em><br><br>
        C.S. Lewis famously said that because Jesus claimed to be God, He cannot just be a "good moral teacher." He must either be a liar, a lunatic, or exactly who He says He is: Lord.`;

    // 9. EXHAUSTION, DEPRESSION, NUMBNESS
    } else if (text.includes("depress") || text.includes("tired") || text.includes("numb") || text.includes("exhaust") || text.includes("burnout") || text.includes("give up") || text.includes("heavy") || text.includes("hopeless") || text.includes("sad")) {
        response = `I am so sorry you are feeling this way. Please know that God sees your pain and He is close to the brokenhearted (Psalm 34:18). <br><br>
        When you feel totally numb or exhausted, Jesus offers a gentle invitation in Matthew 11:28: <em>"Come to me, all you who are weary and burdened, and I will give you rest."</em><br><br>
        You do not need to muster up energy to impress God right now. It is completely okay to just sit in His presence and say, "Lord, I am tired. Help me." He meets you right where you are.`;

    // 10. ANXIETY & FEAR
    } else if (text.includes("anxious") || text.includes("anxiety") || text.includes("fear") || text.includes("worry") || text.includes("overthink") || text.includes("panic")) {
        response = `It is completely normal to feel anxious, but God does not want you to carry that heavy burden alone. <br><br>Philippians 4:6-7 encourages us: <em>"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."</em> <br><br>Take a deep breath right now, and imagine physically handing your worries over to Him.`;

    // 11. WEBSITE & BASIC INFO
    } else if (text.includes("what is this website about") || text.includes("about this site")) {
        response = `<strong>Jesus Christ The Truth</strong> is a digital sanctuary dedicated to helping people discover the unconditional love of Jesus. <br><br>Here, you can read about biblical truths, explore the origins of the Bible, engage in deep theological discussions in our Forums, and read real-life testimonies.`;
    
    // 12. STARTING THE JOURNEY / SALVATION
    } else if (text.includes("start my spiritual journey") || text.includes("steps to salvation") || text.includes("how to be saved")) {
        response = `Salvation is a beautiful gift received by grace through faith. It is not earned by good works.<br><br>
        <strong>1. Acknowledge:</strong> "For all have sinned and fall short of the glory of God." (Romans 3:23)<br>
        <strong>2. Believe:</strong> Believe that Jesus died on the cross to pay the penalty for your sins. (Romans 5:8)<br>
        <strong>3. Surrender:</strong> "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised him from the dead, you will be saved." (Romans 10:9)`;

    // 13. CLOSER TO GOD / ROUTINE
    } else if (text.includes("closer to god") || text.includes("daily routine") || text.includes("healthy follower")) {
        response = `Drawing closer to God is about cultivating a daily relationship. James 4:8 says, <em>"Come near to God and he will come near to you."</em><br><br>
        A healthy daily routine might look like this:<br>
        • <strong>Morning:</strong> Start with 10-15 minutes reading the Word. The Gospel of John is a great place to begin.<br>
        • <strong>Throughout the Day:</strong> Talk to God while driving, cooking, or working. Include Him in your normal day.<br>
        • <strong>Weekly:</strong> Gather with a local, Bible-believing church community.`;

    // 14. OVERCOMING SIN
    } else if (text.includes("overcome sin") || text.includes("stop sinning") || text.includes("struggling with sin")) {
        response = `Struggling with sin is a reality for every believer. Romans 7 shows even the Apostle Paul wrestled with this!<br><br>
        1. <strong>Confess quickly:</strong> 1 John 1:9 promises that if we confess, He is faithful to forgive us.<br>
        2. <strong>Flee temptation:</strong> Cut off access to things that cause you to stumble.<br>
        3. <strong>Walk in the Spirit:</strong> Galatians 5:16 says, <em>"Walk by the Spirit, and you will not gratify the desires of the flesh."</em> Fill your mind with scripture and worship.`;

    // 15. GREETINGS
    } else if (text.includes("hello") || text.includes("hi ") || text === "hi" || text.includes("hey")) {
        response = `Hello there! Peace be with you. How can I assist you with your spiritual questions or biblical studies today?`;
        
    // 16. FUNCTIONAL FALLBACK (If the bot doesn't know the answer)
    } else {
        response = `That is a very deep and meaningful question. <br><br>
        In times of uncertainty or when seeking answers, Proverbs 3:5-6 reminds us: <em>"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."</em><br><br>
        While my programming is currently focused on core biblical topics (like Salvation, the Trinity, World Religions, and spiritual support), our community would love to help you with this specific thought. I highly encourage you to post this in our <strong><a href="topic.html" style="color:#ffd700;">Topics & Discussions</a></strong> forum so our members can offer a detailed answer!`;
    }

    window.appendMessage(response, "bot");

    if (window.currentChatSession) {
        fetch(`${window.chatApiEndpoint}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ session_id: window.currentChatSession, sender: 'bot', content: response })
        });
    }
}