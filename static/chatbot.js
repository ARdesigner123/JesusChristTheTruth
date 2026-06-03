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
    
    // 2. THE 12 DISCIPLES & JUDAS
    } else if (text.includes("12 disciple") || text.includes("twelve disciple") || text.includes("disciples") || text.includes("apostle") || text.includes("judas")) {
        response = `Jesus called twelve ordinary, flawed men to be His closest followers and build His church: Simon Peter, Andrew, James, John, Philip, Bartholomew, Matthew (the tax collector), Thomas, James son of Alphaeus, Thaddaeus, Simon the Zealot, and Judas Iscariot.<br><br>
        These men weren't religious elites; they were fishermen and outcasts. Yet, through the Holy Spirit, they changed the world. Almost all of them (except John) were ultimately martyred for their faith.<br><br>
        <strong>What about Judas?</strong><br>
        Judas Iscariot is a tragic figure. He walked with Jesus, saw the miracles, and yet his heart remained hard. For 30 pieces of silver, he betrayed Jesus to the religious leaders (Matthew 26:15). Judas shows us a terrifying reality: You can be physically close to Jesus, go to church, and know the theology, but if you never truly surrender your heart, you are not saved.`;

    // 3. TRUE BELIEVER / REAL CHRISTIAN
    } else if (text.includes("true believer") || text.includes("real christian") || text.includes("fake christian")) {
        response = `Going to a church doesn't make you a Christian any more than standing in a garage makes you a car. A true believer is someone who has recognized their sin, surrendered entirely to Jesus Christ, and is indwelt by the Holy Spirit.<br><br>
        <strong>How do you recognize a true believer? By their fruit.</strong><br>
        Jesus said in Matthew 7:20, <em>"Thus, by their fruit you will recognize them."</em> A real Christian isn't perfect—they will still stumble—but their life's direction changes. They will display the "Fruit of the Spirit": love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control (Galatians 5:22-23).<br><br>
        A true believer obeys Jesus not out of fear of Hell, but out of immense love and gratitude. Jesus said, <em>"If you love me, keep my commands." (John 14:15)</em>.`;

    // 4. ONCE SAVED ALWAYS SAVED / LOSING SALVATION
    } else if (text.includes("once saved always saved") || text.includes("lose my salvation") || text.includes("can i lose salvation") || text.includes("falling away")) {
        response = `The doctrine of "Once Saved, Always Saved" (OSAS) is heavily debated, but many scriptures warn against the danger of falling away from the faith.<br><br>
        While God's grip on us is completely secure (John 10:28), the Bible indicates we still have free will and must actively remain in Him. Hebrews 6:4-6 and Hebrews 10:26 warn about those who have "shared in the Holy Spirit" and then deliberately turn away. Jesus Himself warned in John 15:6, <em>"If you do not remain in me, you are like a branch that is thrown away and withers; such branches are picked up, thrown into the fire and burned."</em><br><br>
        Salvation is an ongoing relationship. If a person willfully, continuously, and completely walks away from Christ, rejecting Him entirely, scripture suggests they can forfeit their salvation. However, if you are genuinely struggling with sin but have a repentant heart, do not fear—God is merciful and patient! <em>"If we confess our sins, he is faithful and just and will forgive us." (1 John 1:9)</em>`;

    // 5. SEVEN DEADLY SINS
    } else if (text.includes("seven deadly sin") || text.includes("7 deadly sin") || text.includes("capital vices")) {
        response = `The "Seven Deadly Sins" are not listed as a specific group of seven in one single Bible verse. They were categorized by early church leaders to help Christians identify the root causes of all other sins. Here they are with biblical warnings:<br><br>
        1. <strong>Pride:</strong> An excessive belief in one's own abilities. <em>"Pride goes before destruction." (Proverbs 16:18)</em><br>
        2. <strong>Envy:</strong> Desiring what others have. <em>"A heart at peace gives life to the body, but envy rots the bones." (Proverbs 14:30)</em><br>
        3. <strong>Wrath (Anger):</strong> Uncontrolled hatred or rage. <em>"Human anger does not produce the righteousness that God desires." (James 1:20)</em><br>
        4. <strong>Gluttony:</strong> Overindulgence, usually with food. <em>"For drunkards and gluttons become poor." (Proverbs 23:21)</em><br>
        5. <strong>Lust:</strong> Impure, uncontrolled sexual desire. <em>"Anyone who looks at a woman lustfully has already committed adultery with her in his heart." (Matthew 5:28)</em><br>
        6. <strong>Greed:</strong> The pursuit of material wealth above all else. <em>"The love of money is a root of all kinds of evil." (1 Timothy 6:10)</em><br>
        7. <strong>Sloth:</strong> Spiritual or physical laziness. <em>"Diligent hands will rule, but laziness ends in forced labor." (Proverbs 12:24)</em><br><br>
        While these sins are dangerous, Jesus Christ died to forgive us of <em>all</em> sin. Through the Holy Spirit, we can overcome them!`;

    // 6. BIBLE TRANSLATIONS
    } else if (text.includes("translation") || text.includes("esv") || text.includes("niv") || text.includes("nkjv") || text.includes("kjv")) {
        response = `There are many English Bible translations, and they generally fall into three categories:<br><br>
        1. <strong>Word-for-Word (Formal Equivalence):</strong> Very accurate to the original Hebrew/Greek grammar. Great for deep study. <em>Examples: ESV (English Standard Version), NASB, NKJV.</em><br>
        2. <strong>Thought-for-Thought (Dynamic Equivalence):</strong> Balances accuracy with modern readability. Great for everyday reading. <em>Examples: NIV (New International Version), NLT.</em><br>
        3. <strong>Paraphrase:</strong> Very loose translation designed to capture the emotion of the text. <em>Example: The Message.</em><br><br>
        The <strong>NKJV</strong> updates the beautiful poetic language of the classic 1611 King James Version into modern English. The best translation is the one you will actually read daily!`;

    // 7. BIBLE CANONS (Protestant, Catholic, Orthodox)
    } else if (text.includes("protestant bible") || text.includes("catholic bible") || text.includes("orthodox bible") || text.includes("apocrypha")) {
        response = `All three branches of Christianity share the exact same 27 books of the New Testament. The difference is in the Old Testament!<br><br>
        • <strong>Protestant Bible (66 Books):</strong> Uses the 39 books of the Old Testament based on the Hebrew canon recognized by ancient Jews.<br>
        • <strong>Catholic Bible (73 Books):</strong> Includes 7 extra books (like Maccabees and Tobit) known as the Deuterocanonicals or Apocrypha. These were written between the Old and New Testaments.<br>
        • <strong>Orthodox Bible (81 Books):</strong> Includes the Catholic books plus a few more historical and poetic texts (like 3 Maccabees and Psalm 151).<br><br>
        Protestants view the extra books as helpful historical reading, but not divinely inspired "God-breathed" Scripture, because Jesus and the Apostles never explicitly quoted them as Scripture.`;

    // 8. DENOMINATIONAL TEACHINGS (Protestant, Catholic, Orthodox)
    } else if (text.includes("what do protestant") || text.includes("what do catholic") || text.includes("what do orthodox") || text.includes("catholicism")) {
        response = `Here is a high-level overview of the three major branches of Christianity:<br><br>
        • <strong>Protestantism:</strong> Teaches that Scripture alone (Sola Scriptura) is the ultimate authority, and salvation is by Grace alone through Faith alone (Sola Fide) in Christ. There is no Pope; every believer has direct access to God.<br>
        • <strong>Catholicism:</strong> Teaches that authority comes from both Scripture and Sacred Church Tradition, led by the Pope. They believe in 7 Sacraments, the intercession of Saints and Mary, and Purgatory.<br>
        • <strong>Eastern Orthodoxy:</strong> Very similar to Catholicism in tradition, but they do not follow the Pope. They focus heavily on the mystery of God, ancient liturgies, and the use of Icons in worship.<br><br>
        While we differ on these points, orthodox believers in all three branches agree on the core Gospel: Jesus is the Son of God who died and rose again.`;

    // 9. FALSE GOSPELS (Prosperity, Modalism)
    } else if (text.includes("false gospel") || text.includes("false prophet") || text.includes("prosperity") || text.includes("modalism") || text.includes("cult")) {
        response = `Jesus warned us: <em>"Watch out for false prophets. They come to you in sheep’s clothing, but inwardly they are ferocious wolves." (Matthew 7:15)</em><br><br>
        Here are two dangerous false teachings today:<br>
        • <strong>The Prosperity Gospel:</strong> Teaches that God promises you health, wealth, and earthly success if you just have enough faith (and give enough money). This contradicts Jesus, who said we would face trials and must carry our cross daily (John 16:33).<br>
        • <strong>Modalism:</strong> A heresy denying the Trinity. It teaches that God is just one person who "switches masks" (sometimes acting as Father, sometimes as Jesus, sometimes as Spirit). The Bible clearly shows all three interacting simultaneously, like at Jesus' baptism.<br><br>
        We must test everything against Scripture (Acts 17:11) to spot the counterfeits!`;

    // 10. FAMOUS INFLUENCERS & PASTORS
    } else if (text.includes("influencer") || text.includes("famous pastor") || text.includes("who are the real christian") || text.includes("apologet") || text.includes("preacher")) {
        response = `There are many wonderful Christian apologists, pastors, and influencers today who defend the faith brilliantly. <br><br>
        People like <strong>Cliffe Knechtle</strong> boldly answer college students' questions, <strong>Mike Winger</strong> does deep, uncompromised biblical theology, and <strong>Frank Turek</strong> shows how science and logic point directly to God.<br><br>
        Historically, preachers like <strong>Charles Spurgeon</strong> or <strong>Billy Graham</strong> reached millions. <br><br>
        However, the Bible reminds us not to put our ultimate faith in human leaders. <em>"It is better to take refuge in the Lord than to trust in humans." (Psalm 118:8)</em>. Always compare what a pastor or influencer says against the Bible. If it aligns with God's Word, listen to it!`;

    // 11. COMPARING RELIGIONS (Why Christianity stands out)
    } else if (text.includes("compare religion") || text.includes("other religions") || text.includes("buddhism") || text.includes("hinduism") || text.includes("which one stands out") || text.includes("all religions")) {
        response = `That is an excellent question. When you look closely at world religions (like Buddhism, Hinduism, or Islam), you will find that almost all of them are spelled with two letters: <strong>D-O</strong>. They are based on what you must <em>do</em> (human effort, karma, five pillars, meditation) to earn your way to God or enlightenment.<br><br>
        Christianity is entirely unique. It is spelled with four letters: <strong>D-O-N-E</strong>. It is not about our flawed human effort reaching up to God; it is about God reaching down to us.<br><br>
        Jesus stepped into our brokenness because we could never climb our way up to Him. Ephesians 2:8-9 reminds us that salvation is a <em>free gift</em> of grace. Jesus said in John 14:6, <em>"I am the way and the truth and the life. No one comes to the Father except through me."</em>`;

    // 12. UNFORGIVABLE SIN / BIGGEST SIN
    } else if (text.includes("unforgivable sin") || text.includes("biggest sin") || text.includes("blasphemy against the holy spirit") || text.includes("can god forgive me")) {
        response = `Many believers worry they have committed the "unforgivable sin" (Blasphemy against the Holy Spirit). Let me give you profound comfort: <strong>If you are worried that you have committed it, you haven't.</strong><br><br>
        The unforgivable sin is not a single bad word, a fleeting angry thought, or a terrible mistake. It is a continuous, hardened, lifelong rejection of the Holy Spirit's conviction. It is looking at the obvious saving work of Jesus Christ and calling it evil until the day you die.<br><br>
        1 John 1:9 says, <em>"If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness."</em> There is no sin you have committed that is greater than the blood Jesus shed on the cross.`;

    // 13. BORN AGAIN
    } else if (text.includes("born again") || text.includes("what does born again mean") || text.includes("nicodemus")) {
        response = `In John 3, Jesus tells a religious leader named Nicodemus, <em>"Very truly I tell you, no one can see the kingdom of God unless they are born again."</em><br><br>
        Being "born again" isn't about physical birth; it is a spiritual resurrection. Before Christ, our spirits are dead in sin. When we surrender to Jesus, the Holy Spirit comes to live inside us, bringing our dead spirits to life!<br><br>
        <em>Real-Life Example:</em> Think of a caterpillar entering a chrysalis and becoming a butterfly. The butterfly isn't just a "better version" of a caterpillar—it is a completely new creation. 2 Corinthians 5:17 says, <em>"Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!"</em>`;

    // 14. HEAVEN & ANIMALS
    } else if (text.includes("heaven") && (text.includes("animal") || text.includes("pet") || text.includes("dog") || text.includes("cat"))) {
        response = `Will our pets be in Heaven? The Bible doesn't explicitly mention our personal pets, but it gives us beautiful clues!<br><br>
        In Isaiah 11:6-9, the Bible describes the future restored Earth: <em>"The wolf will live with the lamb, the leopard will lie down with the goat..."</em> Animals are a beautiful part of God's original, perfect creation, and they will be part of the restored heaven and earth.<br><br>
        C.S. Lewis famously suggested that just as humans are made alive through Christ, perhaps beloved pets are resurrected through their relationship with their human masters. Above all, we know Heaven is a place of perfect joy (Revelation 21:4), and God knows exactly what it takes to fulfill that joy!`;

    // 15. HEAVEN (General)
    } else if (text.includes("heaven") || text.includes("what does heaven look like")) {
        response = `Heaven is not just floating on clouds playing harps—it is a physical, restored reality! <br><br>
        Revelation 21 paints a breathtaking picture of the "New Heavens and New Earth." It describes a city of gold and precious stones, where God Himself dwells among us. The most beautiful promise is in verse 4: <em>"He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away."</em><br><br>
        It will be a place of perfect relationships, meaningful work without exhaustion, exploring the universe, and worshiping our Creator face to face.`;

    // 16. HELL & PUNISHMENT
    } else if (text.includes("hell") || text.includes("punishment") || text.includes("lake of fire")) {
        response = `Hell is a sobering reality. The Bible describes it as a place of outer darkness, a lake of fire, and ultimate separation from God (2 Thessalonians 1:9).<br><br>
        A common question is: <em>"Why would a loving God send someone to Hell?"</em><br><br>
        The truth is, God doesn't "send" people to Hell out of malice. Hell is the ultimate respecting of human free will. If a person spends their entire life pushing God away and saying, "I don't want You in my life," God will eventually say, "Thy will be done." God is the source of all light, love, and joy. To be completely separated from Him is to be left with absolute darkness. This is exactly why Jesus came—to save us from this fate!`;

    // 17. MORMONISM / LATTER-DAY SAINTS (LDS)
    } else if (text.includes("mormon") || text.includes("latter day saint") || text.includes("lds") || text.includes("book of mormon")) {
        response = `Mormonism (The Church of Jesus Christ of Latter-day Saints) uses Christian terminology but holds fundamentally different beliefs from historic Christianity.<br><br>
        <strong>Key Differences:</strong><br>
        • <strong>Nature of God:</strong> Christianity teaches God has always been God. Mormonism teaches God the Father was once a mortal man who progressed to become a god.<br>
        • <strong>Additional Scriptures:</strong> They add the <em>Book of Mormon</em>, believing the Bible is incomplete.<br>
        • <strong>Salvation:</strong> They teach salvation requires faith <em>plus</em> works and obedience to LDS ordinances.<br><br>
        Galatians 1:8 warns: <em>"But even if we or an angel from heaven should preach a gospel other than the one we preached to you, let them be under God’s curse."</em>`;

    // 18. JEHOVAH'S WITNESSES
    } else if (text.includes("jehovah witness") || text.includes("jw") || text.includes("watchtower")) {
        response = `Jehovah's Witnesses have core doctrines separating them from biblical Christianity, primarily regarding Jesus.<br><br>
        <strong>Key Differences:</strong><br>
        • <strong>Who is Jesus?</strong> They deny the Trinity and believe Jesus is the Archangel Michael, a created being.<br>
        • <strong>Altered Bible:</strong> They use their own translation (the New World Translation) which alters verses pointing to Jesus' divinity.<br><br>
        Colossians 1:16 says of Jesus: <em>"For in him all things were created... all things have been created through him and for him."</em> A created being cannot be the creator of all things.`;

    // 19. COMMUNITY & FRIENDS
    } else if (text.includes("friends") || text.includes("lonely") || text.includes("community") || text.includes("church family")) {
        response = `We were never meant to walk this spiritual journey alone! Hebrews 10:24-25 urges us: <em>"And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together..."</em><br><br>
        <em>Analogy:</em> If you take a red-hot, burning piece of coal out of a fire and set it by itself, it will quickly grow cold and turn to ash. But if you put it back in the pile with the other coals, it stays ablaze.<br><br>
        Finding a solid, Bible-believing church community gives you a place to serve, find mentors, and be encouraged when you are feeling spiritually cold. Surround yourself with friends who push you closer to Jesus (Proverbs 13:20).`;

    // 20. THE TRINITY
    } else if (text.includes("trinity") || text.includes("father son and holy spirit") || text.includes("three in one")) {
        response = `The <strong>Trinity</strong> is the biblical concept that there is only one God, but He exists eternally in three distinct persons: The Father, The Son (Jesus), and the Holy Spirit.<br><br>
        While the specific word "Trinity" isn't in the Bible, the concept is everywhere. For example, at Jesus' baptism (Matthew 3:16-17), the Father speaks from heaven, the Son is in the water, and the Spirit descends like a dove.<br><br>
        <em>Analogy:</em> Think of a musical chord. If you play a C-Major chord, you press three distinct notes (C, E, and G) at the exact same time. They are different notes, but you only hear <strong>one</strong> chord. God is one "What" and three "Whos."`;

    // 21. ISLAM / MUSLIMS
    } else if (text.includes("islam") || text.includes("muslim") || text.includes("quran") || text.includes("allah")) {
        response = `Christianity and Islam share historical roots going back to Abraham, but they have a fundamental difference regarding <strong>Jesus Christ</strong>.<br><br>
        In Islam, Jesus (known as Isa) is highly respected as a great prophet, but Muslims do not believe He died on the cross or that He is the Son of God. <br><br>
        In Christianity, the entire faith rests on the fact that Jesus is God in the flesh, who willingly died for our sins and rose from the dead. Jesus Himself said in John 14:6, <em>"I am the way and the truth and the life. No one comes to the Father except through me."</em> We are called to love our Muslim neighbors deeply while sharing this truth with them.`;

    // 22. JUDAISM / JEWS
    } else if (text.includes("judaism") || text.includes("jew") || text.includes("torah") || text.includes("hebrew")) {
        response = `Christianity and Judaism are deeply connected. In fact, Christianity is the fulfillment of Judaism! We share the exact same foundational scriptures (the Old Testament).<br><br>
        The core difference is the identity of the <strong>Messiah</strong>. Traditional Judaism is still waiting for the Messiah to arrive. Christians believe that Jesus of Nazareth <em>is</em> that promised Messiah, fulfilling dozens of Old Testament prophecies, such as Isaiah 53, which describes a Savior who would be "pierced for our transgressions."<br><br>
        The Apostle Paul, a devout Jew who found Jesus, wrote: <em>"For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes: first to the Jew, then to the Gentile." (Romans 1:16)</em>`;

    // 23. SUFFERING / THE PROBLEM OF EVIL
    } else if (text.includes("suffering") || text.includes("why does god allow") || text.includes("evil in the world") || text.includes("bad things happen")) {
        response = `The question of why God allows suffering is one of the hardest we face. <br><br>
        When God created humanity, He didn't want us to be programmed robots; He wanted a genuine relationship with us. But genuine love requires <strong>free will</strong>—the ability to choose. Unfortunately, humanity used that free will to rebel against God (Genesis 3), bringing sin, death, and brokenness into the world.<br><br>
        God does not cause evil, but He does use it for ultimate good (Romans 8:28). Most importantly, God didn't stay distant from our suffering. He entered into it. Jesus suffered betrayal, torture, and death so that one day, suffering can be defeated forever. Revelation 21:4 promises a day when <em>"He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain."</em>`;

    // 24. DID JESUS REALLY RISE? / RESURRECTION
    } else if (text.includes("resurrection") || text.includes("rise from the dead") || text.includes("is jesus alive") || text.includes("empty tomb")) {
        response = `The resurrection of Jesus is the absolute foundation of the Christian faith. As Paul wrote in 1 Corinthians 15:14, <em>"And if Christ has not been raised, our preaching is useless and so is your faith."</em><br><br>
        Historically, the evidence is overwhelming:<br>
        1. <strong>The Empty Tomb:</strong> Even Jesus' enemies couldn't produce His body to shut down the early church.<br>
        2. <strong>Eyewitnesses:</strong> Jesus appeared to over 500 people at once after His death (1 Corinthians 15:6), many of whom were still alive to be questioned when Paul wrote that letter.<br>
        3. <strong>The Disciples' Transformation:</strong> The apostles went from terrified cowards hiding in a room to bold preachers willing to be executed for their faith. People will die for what they <em>believe</em> is true, but they will not die for a lie they invented themselves.`;

    // 25. IS JESUS GOD?
    } else if (text.includes("who is jesus") || text.includes("is jesus god") || text.includes("jesus real")) {
        response = `Jesus is God in human flesh. He claimed this very clearly during His life.<br><br>
        In John 8:58, Jesus said, <em>"Very truly I tell you, before Abraham was born, I am!"</em> He used the sacred name of God (Yahweh / I AM) for Himself. In John 10:30, He stated, <em>"I and the Father are one."</em><br><br>
        C.S. Lewis famously said that because Jesus claimed to be God, He cannot just be a "good moral teacher." He must either be a liar, a lunatic, or exactly who He says He is: Lord.`;

    // 26. EXHAUSTION, DEPRESSION, NUMBNESS
    } else if (text.includes("depress") || text.includes("tired") || text.includes("numb") || text.includes("exhaust") || text.includes("burnout") || text.includes("give up") || text.includes("heavy") || text.includes("hopeless") || text.includes("sad")) {
        response = `I am so sorry you are feeling this way. Please know that God sees your pain and He is close to the brokenhearted (Psalm 34:18). <br><br>
        When you feel totally numb or exhausted, Jesus offers a gentle invitation in Matthew 11:28: <em>"Come to me, all you who are weary and burdened, and I will give you rest."</em><br><br>
        You do not need to muster up energy to impress God right now. It is completely okay to just sit in His presence and say, "Lord, I am tired. Help me." He meets you right where you are.`;

    // 27. ANXIETY & FEAR
    } else if (text.includes("anxious") || text.includes("anxiety") || text.includes("fear") || text.includes("worry") || text.includes("overthink") || text.includes("panic")) {
        response = `It is completely normal to feel anxious, but God does not want you to carry that heavy burden alone. <br><br>Philippians 4:6-7 encourages us: <em>"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."</em> <br><br>Take a deep breath right now, and imagine physically handing your worries over to Him.`;

    // 28. WEBSITE & BASIC INFO
    } else if (text.includes("what is this website about") || text.includes("about this site")) {
        response = `<strong>Jesus Christ The Truth</strong> is a digital sanctuary dedicated to helping people discover the unconditional love of Jesus. <br><br>Here, you can read about biblical truths, explore the origins of the Bible, engage in deep theological discussions in our Forums, and read real-life testimonies.`;
    
    // 29. STARTING THE JOURNEY / SALVATION
    } else if (text.includes("start my spiritual journey") || text.includes("steps to salvation") || text.includes("how to be saved")) {
        response = `Salvation is a beautiful gift received by grace through faith. It is not earned by good works.<br><br>
        <strong>1. Acknowledge:</strong> "For all have sinned and fall short of the glory of God." (Romans 3:23)<br>
        <strong>2. Believe:</strong> Believe that Jesus died on the cross to pay the penalty for your sins. (Romans 5:8)<br>
        <strong>3. Surrender:</strong> "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised him from the dead, you will be saved." (Romans 10:9)`;

    // 30. CLOSER TO GOD / ROUTINE
    } else if (text.includes("closer to god") || text.includes("daily routine") || text.includes("healthy follower")) {
        response = `Drawing closer to God is about cultivating a daily relationship. James 4:8 says, <em>"Come near to God and he will come near to you."</em><br><br>
        A healthy daily routine might look like this:<br>
        • <strong>Morning:</strong> Start with 10-15 minutes reading the Word. The Gospel of John is a great place to begin.<br>
        • <strong>Throughout the Day:</strong> Talk to God while driving, cooking, or working. Include Him in your normal day.<br>
        • <strong>Weekly:</strong> Gather with a local, Bible-believing church community for growth and accountability.`;

    // 31. OVERCOMING SIN
    } else if (text.includes("overcome sin") || text.includes("stop sinning") || text.includes("struggling with sin")) {
        response = `Struggling with sin is a reality for every believer. Romans 7 shows even the Apostle Paul wrestled with this!<br><br>
        1. <strong>Confess quickly:</strong> 1 John 1:9 promises that if we confess, He is faithful to forgive us.<br>
        2. <strong>Flee temptation:</strong> Cut off access to things that cause you to stumble.<br>
        3. <strong>Walk in the Spirit:</strong> Galatians 5:16 says, <em>"Walk by the Spirit, and you will not gratify the desires of the flesh."</em> Fill your mind with scripture and worship.`;

    // 32. GREETINGS
    } else if (text.includes("hello") || text.includes("hi ") || text === "hi" || text.includes("hey")) {
        response = `Hello there! Peace be with you. How can I assist you with your spiritual questions or biblical studies today?`;
        
    // 33. FUNCTIONAL FALLBACK
    } else {
        response = `That is a very deep and meaningful question. <br><br>
        In times of uncertainty or when seeking answers, Proverbs 3:5-6 reminds us: <em>"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."</em><br><br>
        While my programming is currently focused on core biblical topics (like Salvation, the Trinity, World Religions, Church History, and spiritual support), our community would love to help you with this specific thought. I highly encourage you to post this in our <strong><a href="topic.html" style="color:#ffd700;">Topics & Discussions</a></strong> forum so our members can offer a detailed answer!`;
    }

    window.appendMessage(response, "bot");

    if (window.currentChatSession) {
        fetch(`${window.chatApiEndpoint}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ session_id: window.currentChatSession, sender: 'bot', content: response })
        });
    }
}