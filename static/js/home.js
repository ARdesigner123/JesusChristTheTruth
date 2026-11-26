// =====================================================================
//  HOME PAGE
// =====================================================================
(function () {
    'use strict';
    const J = window.JCT;

    const PEOPLE = {
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

    // ---------------- Gospel path ----------------
    const GOSPEL = [
        ['God Is Holy', '“Holy, holy, holy is the Lord Almighty; the whole earth is full of His glory.”', 'Isaiah 6:3', 'fa-sun'],
        ['All Have Sinned', '“For all have sinned and fall short of the glory of God.”', 'Romans 3:23', 'fa-scale-unbalanced'],
        ['The Consequence Of Sin', '“For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.”', 'Romans 6:23', 'fa-skull'],
        ['Christ Died For Us', '“But God demonstrates His own love for us in this: While we were still sinners, Christ died for us.”', 'Romans 5:8', 'fa-cross'],
        ['Salvation Through Jesus Alone', '“Jesus answered, ‘I am the way and the truth and the life. No one comes to the Father except through me.’”', 'John 14:6', 'fa-route'],
        ['Believe And Be Saved', '“If you declare with your mouth, ‘Jesus is Lord,’ and believe in your heart that God raised Him from the dead, you will be saved.”', 'Romans 10:9', 'fa-heart'],
        ['Grace, Not Works', '“For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.”', 'Ephesians 2:8-9', 'fa-gift'],
        ['Repent And Turn To God', '“Repent, then, and turn to God, so that your sins may be wiped out, that times of refreshing may come from the Lord.”', 'Acts 3:19', 'fa-arrow-rotate-left'],
        ['Faith Without Works Is Dead', '“As the body without the spirit is dead, so faith without deeds is dead.”', 'James 2:26', 'fa-seedling'],
        ['Christ Rose Again', '“He is not here; He has risen, just as He said.”', 'Matthew 28:6', 'fa-sun-plant-wilt'],
        ['New Life In Christ', '“Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!”', '2 Corinthians 5:17', 'fa-dove'],
        ['The Gift Of Eternal Life', '“And this is the testimony: God has given us eternal life, and this life is in His Son.”', '1 John 5:11', 'fa-infinity']
    ];
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    document.getElementById('gospel-path').innerHTML = GOSPEL.map((g, i) => `
        <li class="gospel-step ${i % 2 ? 'right' : 'left'}" data-reveal="${i % 2 ? 'right' : 'left'}">
            <span class="g-num">${ROMAN[i]}</span>
            <div class="g-card card card-hover">
                <i class="fas ${g[3]} g-icon" aria-hidden="true"></i>
                <h3>${g[0]}</h3>
                <p>${g[1]}</p>
                <span class="g-ref">${g[2]} (NIV)</span>
            </div>
        </li>`).join('');

    // ---------------- People (family + apostles) ----------------
    document.querySelectorAll('.person').forEach(btn => {
        const name = btn.dataset.person;
        btn.type = 'button';
        btn.setAttribute('aria-label', `Read about ${name}`);
        btn.innerHTML = `
            <span class="p-img"><img src="${btn.dataset.img}" alt="" loading="lazy"></span>
            <span class="p-name">${J.esc(name)}</span>
            <span class="p-role">${J.esc(btn.dataset.role)}</span>
            <span class="p-more">More info <i class="fas fa-arrow-right"></i></span>`;
        btn.addEventListener('click', () => openPerson(btn));
    });

    const modal = document.getElementById('person-modal');
    modal.querySelector('[data-close]').onclick = () => J.closeModal(modal);
    function openPerson(btn) {
        const name = btn.dataset.person;
        const info = PEOPLE[name] || {};
        document.getElementById('pm-img').src = btn.dataset.img;
        document.getElementById('pm-img').alt = name;
        document.getElementById('pm-name').textContent = name;
        document.getElementById('pm-role').textContent = btn.dataset.role;
        document.getElementById('pm-bio').textContent = info.bio || 'Biography coming soon…';
        document.getElementById('pm-mission').textContent = info.mission || '';
        modal.classList.toggle('judas-theme', name === 'Judas Iscariot');
        J.openModal(modal);
        const r = btn.getBoundingClientRect();
        if (window.JCTFX && name !== 'Judas Iscariot') window.JCTFX.burst(r.left + r.width / 2, r.top + r.height / 3, 30);
    }

    // ---------------- Gentle 3D tilt on cards (desktop) ----------------
    if (matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.person, .art-frame').forEach(el => {
            el.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
                el.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
                el.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
                el.style.setProperty('--mx', ((x + .5) * 100).toFixed(1) + '%');
                el.style.setProperty('--my', ((y + .5) * 100).toFixed(1) + '%');
            });
            el.addEventListener('mouseleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
        });
    }

    // ---------------- Live stats (count up) ----------------
    function countUp(el, to) {
        const dur = 1600, start = performance.now();
        (function step(now) {
            const t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 4);
            el.textContent = J.fmtNum(Math.round(to * e));
            if (t < 1) requestAnimationFrame(step);
        })(start);
    }
    if (J.configured) {
        J.rpc('jct_site_stats', {}).then(st => {
            document.querySelectorAll('[data-count]').forEach(el => countUp(el, Number(st[el.dataset.count]) || 0));
        }).catch(() => document.querySelectorAll('[data-count]').forEach(el => { el.textContent = '·'; }));
    }

    // ---------------- Personalised call to action ----------------
    const s = J.getSession();
    if (s && !s.is_guest) {
        document.getElementById('cta-title').textContent = `Grace and peace, ${s.username}`;
        document.getElementById('cta-text').textContent = 'Your quests are waiting. Take today’s Daily Quiz, earn Holy Power and keep your streak alive.';
        document.getElementById('cta-buttons').innerHTML = `
            <a href="profile.html#quiz" class="btn btn-lg"><i class="fas fa-scroll"></i> Daily Quiz</a>
            <a href="quests.html" class="btn btn-ghost btn-lg"><i class="fas fa-map"></i> My Quests</a>`;
    }
})();
