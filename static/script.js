// ================= MOBILE MENU =================
const menuIcon = document.getElementById("menuIcon");
const dropdown = document.getElementById("dropdownMenu");

menuIcon.addEventListener("click", () => {
    // Toggle display
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
    } else {
        dropdown.style.display = "block";
    }
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !menuIcon.contains(e.target)) {
        dropdown.style.display = "none";
    }
});

// ================= NAV INDICATOR =================
const indicator = document.querySelector(".nav-indicator");
const links = document.querySelectorAll(".nav-links a");

// Set initial active position
window.addEventListener("load", () => {
    const active = document.querySelector(".nav-links a.active");
    if (active) moveIndicator(active);
});

links.forEach(link => {
    // Click event
    link.addEventListener("click", function() {
        document.querySelector(".nav-links a.active")?.classList.remove("active");
        this.classList.add("active");
        moveIndicator(this);
    });

    // Hover effect
    link.addEventListener("mouseenter", function() {
        moveIndicator(this);
        indicator.style.opacity = "1";
    });

    link.addEventListener("mouseleave", function() {
        const active = document.querySelector(".nav-links a.active");
        if (active) moveIndicator(active);
    });
});

function moveIndicator(element) {
    const rect = element.getBoundingClientRect();
    const parentRect = element.parentElement.parentElement.getBoundingClientRect();

    // Calculate position relative to the navbar
    indicator.style.width = rect.width + 20 + "px";
    indicator.style.left = rect.left - parentRect.left - 10 + "px";
    indicator.style.top = rect.top - parentRect.top - 5 + "px";
    indicator.style.opacity = "1";
}

// ================= CURSOR GLOW =================
const glow = document.createElement("div");
glow.classList.add("cursor-glow");
document.body.appendChild(glow);

document.addEventListener("mousemove", (e) => {
    // Use clientX and clientY for position: fixed elements!
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
});

// ================= CROSS EFFECT =================
const cross = document.querySelector(".cross-effect");

function createSparkle() {
    const sparkle = document.createElement("span");
    sparkle.classList.add("sparkle");

    // Random size small/big stars
    const size = Math.random() * 6 + 2; // 2px - 8px
    sparkle.style.width = `${size}px`;
    sparkle.style.height = `${size}px`;

    // Random start position around the **entire cross area**
    const crossWidth = cross.offsetWidth + 96; // include horizontal bar width
    const crossHeight = cross.offsetHeight;
    const offsetX = Math.random() * crossWidth - crossWidth/2;
    const offsetY = Math.random() * crossHeight - crossHeight/2;
    sparkle.style.left = `${cross.offsetWidth/2 + offsetX}px`;
    sparkle.style.top = `${cross.offsetHeight/2 + offsetY}px`;

    // Random drift direction
    const driftX = Math.random() * 120 - 60; // -60 to 60 px
    const driftY = Math.random() * 80 - 40;  // -40 to 40 px
    sparkle.style.setProperty('--drift-x', `${driftX}px`);
    sparkle.style.setProperty('--drift-y', `${driftY}px`);

    // Random rotation
    sparkle.style.setProperty('--rotate', `${Math.random() * 360}deg`);

    // Random animation duration
    const duration = Math.random() * 2 + 2; // 2-4s
    sparkle.style.animation = `sparkleDrift ${duration}s ease-in-out forwards`;

    cross.appendChild(sparkle);

    // Remove sparkle after animation
    sparkle.addEventListener("animationend", () => {
        sparkle.remove();
    });
}

// ================= GOSPEL PARTICLES =================
const gospelSection = document.querySelector(".gospel");

function createParticle() {
    const particle = document.createElement("span");
    particle.classList.add("gospel-particle");

    const container = document.querySelector(".gospel-container");

    const rect = container.getBoundingClientRect();

    // Randomly pick which edge to spawn from
    const edge = Math.floor(Math.random() * 4);

    let x, y, driftX, driftY;

    switch(edge) {
        case 0: // TOP
            x = Math.random() * rect.width;
            y = 0;
            driftX = (Math.random() - 0.5) * 40;
            driftY = -60 - Math.random() * 60;
            break;

        case 1: // RIGHT
            x = rect.width;
            y = Math.random() * rect.height;
            driftX = 40 + Math.random() * 40;
            driftY = (Math.random() - 0.5) * 40;
            break;

        case 2: // BOTTOM
            x = Math.random() * rect.width;
            y = rect.height;
            driftX = (Math.random() - 0.5) * 40;
            driftY = 60 + Math.random() * 60;
            break;

        case 3: // LEFT
            x = 0;
            y = Math.random() * rect.height;
            driftX = -40 - Math.random() * 40;
            driftY = (Math.random() - 0.5) * 40;
            break;
    }

    particle.style.left = x + "px";
    particle.style.top = y + "px";

    // Random size
    const size = Math.random() * 5 + 2;
    particle.style.width = size + "px";
    particle.style.height = size + "px";

    // Drift direction
    particle.style.setProperty('--drift-x', driftX + "px");
    particle.style.setProperty('--drift-y', driftY + "px");

    // Duration
    const duration = Math.random() * 3 + 4;
    particle.style.animationDuration = duration + "s";

    container.appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, duration * 1000);
}

// ================= DIVINE SCROLL REVEAL =================
const revealElements = () => {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // We use a small timeout to let the CSS transitions breathe
                entry.target.classList.add("active");
                // Remove the 'reveal' class once 'active' is set to clean up logic
                entry.target.classList.remove("reveal");
            }
        });
    }, observerOptions);

    const targets = document.querySelectorAll(".gospel-block, .disciple-card, .tree-reveal, .trinity-reveal");
    targets.forEach((el, index) => {
        observer.observe(el);
        // Stagger the entrance
        el.style.transitionDelay = `${(index % 3) * 0.1}s`;
    });
};

document.addEventListener('DOMContentLoaded', revealElements);

// ================= DISCIPLE CARD PARTICLES =================
document.querySelectorAll('.disciple-card, .tree-card').forEach(card => {
    let particleInterval;

    card.addEventListener('mouseenter', () => {
        // Initial burst of 5 particles
        for(let i=0; i<5; i++) createParticle(card); 
        
        // Steady stream of 3 particles
        particleInterval = setInterval(() => {
            for(let i=0; i<3; i++) createParticle(card);
        }, 150); 
    });

    card.addEventListener('mouseleave', () => {
        clearInterval(particleInterval);
    });
});

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'gospel-particle'; 
    
    // Fallback if container is not passed (for global particles)
    const targetContainer = container.tagName ? container : document.body;

    const size = Math.random() * 5 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Position logic
    const x = Math.random() * targetContainer.offsetWidth;
    const y = Math.random() * targetContainer.offsetHeight;
    
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.position = "absolute";
    particle.style.zIndex = "10";
    particle.style.pointerEvents = "none";

    targetContainer.appendChild(particle);

    const destinationX = (Math.random() - 0.5) * 150;
    const destinationY = (Math.random() - 0.5) * 150;

    const anim = particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${destinationX}px, ${destinationY}px) scale(0)`, opacity: 0 }
    ], {
        duration: 1200 + Math.random() * 800,
        easing: 'ease-out'
    });

    anim.onfinish = () => particle.remove();
}

// Global ambient sparkles
setInterval(() => createParticle(document.querySelector('.gospel')), 300);

// Data for the Modals
const discipleData = {
    "Saint Simon Peter": {
        bio: "Simon Peter, originally a fisherman on the Sea of Galilee, became the 'Rock' upon which the Church was built. Known for his fiery and impulsive nature, he was the first to declare Jesus as the Messiah. Despite denying Christ three times, he was restored and became the bold leader of the early church in Jerusalem and later Rome. He is traditionally believed to have been crucified upside down, feeling unworthy to die in the same manner as his Lord.",
        mission: "To lead the Apostles and establish the Church's foundation."
    },
    "Saint Andrew": {
        bio: "The brother of Peter and a former disciple of John the Baptist, Andrew was the very first Apostle called by Jesus. He is often called the 'Protocletos' (First Called). Andrew was known for bringing others to Christ, including his own brother. He preached across Asia Minor and Greece. Tradition holds that he was martyred on an X-shaped cross (St. Andrew's Cross), continuing to preach to onlookers for two days until he passed.",
        mission: "Bringing individuals to Christ and spreading the Gospel to the East."
    },
    "Saint James the Greater": {
        bio: "The son of Zebedee and brother of John, James was part of the 'inner circle' (Peter, James, and John) who witnessed the Transfiguration and the Agony in Gethsemane. He was known for his intense zeal, earning the nickname 'Son of Thunder.' James was the first of the Twelve to be martyred, beheaded by King Herod Agrippa I in 44 AD. He remains the patron saint of Spain.",
        mission: "Boldly proclaiming the Kingdom and pioneering missionary work."
    },
    "Saint John the Beloved": {
        bio: "The youngest Apostle and the 'disciple whom Jesus loved,' John was the only Apostle who did not flee during the Crucifixion, staying at the foot of the cross. He was entrusted with the care of Mary, the mother of Jesus. John wrote the Fourth Gospel, three epistles, and the Book of Revelation while exiled on the Island of Patmos. He is the only Apostle traditionally believed to have died of old age.",
        mission: "To testify to the divinity of Christ through the theology of Love."
    },
    "Saint Philip": {
        bio: "Philip was from Bethsaida, the same town as Peter and Andrew. He was the one who famously told Nathanael, 'Come and see.' Philip was a practical man; he was the one Jesus questioned about how to feed the 5,000. He spent his later years preaching in Phrygia (modern-day Turkey), where he eventually met his martyrdom.",
        mission: "Direct evangelism and serving the practical needs of the growing church."
    },
    "Saint Bartholomew": {
        bio: "Also known as Nathanael, he was the man Jesus called 'an Israelite in whom there is no guile.' Initially skeptical of anything from Nazareth, he became a devoted follower after a brief conversation with Christ. Historical accounts suggest he traveled as far as India and Armenia to spread the Gospel. He suffered a particularly brutal martyrdom, being flayed alive for his faith.",
        mission: "Spreading the light of Christ to the furthest reaches of the East."
    },
    "Saint Matthew": {
        bio: "Formerly known as Levi, Matthew was a tax collector in Capernaum—a profession loathed by his fellow Jews. When Jesus said 'Follow me,' Matthew left his wealthy lifestyle behind immediately. He wrote the First Gospel, primarily for a Jewish audience, to prove that Jesus was the fulfillment of Old Testament prophecies. He later preached in Ethiopia and Persia.",
        mission: "Documenting the fulfillment of the Law through the life of Christ."
    },
    "Saint Thomas": {
        bio: "Often unfairly remembered only as 'Doubting Thomas,' he was actually a man of great courage who once said, 'Let us also go, that we may die with him.' While he struggled to believe in the Resurrection until he saw the wounds, his confession 'My Lord and my God!' is one of the most profound in the Bible. He is credited with bringing Christianity to India, where he was martyred.",
        mission: "Bringing the Gospel to distant lands and overcoming doubt through faith."
    },
    "Saint James the Lesser": {
        bio: "The son of Alphaeus, he is called 'the Less' likely because he was younger or shorter than the other James. He played a massive role in the early church as the first Bishop of Jerusalem. Known for his deep prayer life and holiness, he was eventually pushed from the pinnacle of the Temple and beaten to death when he refused to deny Christ.",
        mission: "Preserving the purity and law of the early church in Jerusalem."
    },
    "Saint Jude Thaddeus": {
        bio: "Not to be confused with Judas Iscariot, Jude (or Thaddeus) was the brother of James the Lesser. He wrote the Epistle of Jude to warn against false teachers. He is the patron saint of 'lost causes' or 'desperate situations,' symbolizing the hope that Christ offers when all seems lost. He preached in Mesopotamia and Armenia.",
        mission: "Encouraging the faithful to contend for the faith in difficult times."
    },
    "Saint Simon the Zealot": {
        bio: "Before following Jesus, Simon belonged to the Zealots, a political group dedicated to the violent overthrow of the Roman occupation. His transformation is a testament to Christ's peace—he went from a man of political violence to a man of spiritual salvation. He is said to have preached in Egypt and Persia alongside St. Jude.",
        mission: "Channeling earthly passion into the spiritual zeal for the Kingdom."
    },
    "Saint Matthias": {
        bio: "Matthias was a follower of Jesus from the beginning, having witnessed the baptism of John and the Resurrection. After Judas Iscariot's death, the Apostles cast lots, and the Holy Spirit chose Matthias to take his place among the Twelve. He was a faithful witness who preached in Judea and modern-day Georgia.",
        mission: "Filling the void left by betrayal and maintaining the apostolic witness."
    },
    "Judas Iscariot": {
        bio: "Judas was the treasurer of the group, but his heart was corrupted by greed. He is the tragic figure who betrayed Jesus for thirty pieces of silver with a kiss in the Garden of Gethsemane. His life serves as a somber warning that proximity to Jesus does not guarantee a changed heart. Overcome with remorse but lacking repentance, he took his own life shortly after the betrayal.",
        mission: "The fulfillment of prophecy through the mystery of betrayal."
    },
    "God The Father": {
        bio: "The one true God, Creator of the universe. In Christian theology, He is the first person of the Trinity, whose love for humanity was so great that He sent His only Son.",
        mission: "To love, create, and offer salvation to the world."
    },
    "Virgin Mary": {
        bio: "Chosen by God to be the earthly mother of Jesus through the miraculous conception by the Holy Spirit. Her faithful obedience ('Let it be done to me') changed the course of human history. While honored in ancient traditions for her 'Perpetual Virginity,' many biblical scholars and Protestant traditions note that after the virgin birth of Jesus, she and Joseph went on to have a natural marriage, giving birth to His earthly brothers: James, Joses, Simon, and Jude.",
        mission: "To bear the Savior of the world and anchor the Holy Family."
    },
    "Saint Joseph": {
        bio: "A righteous carpenter from the line of David. He served as the earthly father and protector of Jesus, guiding the Holy Family through exile in Egypt and raising Jesus in Nazareth. After the miraculous birth of Christ, he and Mary raised a bustling household together, bringing up Jesus alongside His younger brothers—James, Joses, Jude, and Simon—and their sisters.",
        mission: "To protect, provide for, and faithfully lead the Holy Family."
    },
    "Jesus Christ": {
        bio: "The central figure of Christianity, the Messiah, and the Son of God. He lived a sinless life, performed miracles, and willingly died on the cross to pay the penalty for human sin, rising again on the third day.",
        mission: "To bring salvation and eternal life to all who believe."
    },
    "James the Just": {
        bio: "Also known as James, brother of the Lord. He initially did not believe in Jesus but became a prominent leader in the early Jerusalem Church after encountering the resurrected Christ. He authored the Book of James.",
        mission: "Leading the early Jewish Christians in Jerusalem."
    },
    "Jude": {
        bio: "Often identified as the author of the Epistle of Jude, he initially doubted Jesus' divinity alongside his brothers. After the resurrection, he became a steadfast believer and a vital leader in the early Christian community, warning the church against false teachers.",
        mission: "To contend earnestly for the faith and protect the early church from corruption."
    },
    "Simon": {
        bio: "Simon (or Simeon) was one of the brothers of Jesus. Tradition holds that after the martyrdom of James the Just, Simon succeeded him as the second bishop of Jerusalem, guiding the Jewish Christian community through the turbulent times of the Jewish-Roman wars.",
        mission: "Shepherding and protecting the Jewish Christian community in Jerusalem."
    },
    "Joses": {
        bio: "Also known as Joseph, Joses is mentioned in the Gospels as one of Jesus' brothers. While less is recorded about his specific leadership compared to James and Jude, he was part of the devoted holy family that formed the core of the early believers after the Resurrection.",
        mission: "Serving faithfully within the foundational roots of the early church."
    }
};

function openModal(card, index) {
    const modal = document.getElementById('disciple-modal');
    const name = card.querySelector('h3').innerText;
    const img = card.querySelector('img').src;
    const occ = card.querySelector('.occupation').innerText;

    // Fill content
    document.getElementById('modal-name').innerText = name;
    document.getElementById('modal-img').src = img;
    document.getElementById('modal-occupation').innerText = occ;
    document.getElementById('modal-bio').innerText = discipleData[name]?.bio || "Biography coming soon...";

    // CLEAR OLD THEMES
    modal.classList.remove('slide-left', 'slide-top', 'slide-right', 'judas-theme');

    // CHECK IF IT'S JUDAS
    if (name === "Judas Iscariot") {
        modal.classList.add('judas-theme');
    }

    // Determine Direction based on row position
    const position = (index % 3); 
    if (position === 0) modal.classList.add('slide-left');
    else if (position === 1) modal.classList.add('slide-top');
    else modal.classList.add('slide-right');

    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeModal() {
    const modal = document.getElementById('disciple-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 600); // Matches CSS transition time
}

// Attach click events to the "More Info" buttons
document.querySelectorAll('.disciple-card, .tree-card').forEach((card, index) => {
    const btn = card.querySelector('.more-info-btn');
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents card hover trigger
        openModal(card, index);
    });
});

// ================= SCROLL REVEAL =================
const blocks = document.querySelectorAll(".gospel-block");

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
}, { 
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
});

blocks.forEach((block, index) => {
    observer.observe(block);

    // Add slight delay for each block
    block.style.transitionDelay = `${index * 0.1}s`;
});

// Spawn particles
setInterval(createParticle, 300);

// Generate sparkles at constant rate
setInterval(createSparkle, 250); // slightly more spaced