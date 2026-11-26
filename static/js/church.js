// ================= TIMELINE SCROLL ANIMATIONS =================
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Observer for Sliding Boxes Left and Right
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px"
    };

    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
            }
        });
    }, observerOptions);

    document.querySelectorAll(".timeline-item, .church-reveal").forEach(item => {
        timelineObserver.observe(item);
    });

    // 2. Growing Timeline Line based on scroll
    const timelineFill = document.getElementById("timeline-fill");
    const timelineContainer = document.querySelector(".timeline-container");

    window.addEventListener("scroll", () => {
        // Calculate how far down the timeline container we have scrolled
        const containerRect = timelineContainer.getBoundingClientRect();
        const containerTop = containerRect.top;
        const containerHeight = containerRect.height;
        const windowHeight = window.innerHeight;

        // Start growing the line when the top of the container hits the middle of the screen
        let scrollPercentage = (windowHeight / 2 - containerTop) / containerHeight;

        // Cap the percentage between 0 and 1
        if (scrollPercentage < 0) scrollPercentage = 0;
        if (scrollPercentage > 1) scrollPercentage = 1;

        // Apply height
        timelineFill.style.height = `${scrollPercentage * 100}%`;
    });

    // ================= CHURCH TABS LOGIC =================
    const tabContainers = document.querySelectorAll('.church-tabs-container');

    // Loop through each container (Orthodox and Catholic) individually
    tabContainers.forEach(container => {
        const tabButtons = container.querySelectorAll('.tab-btn');
        const tabContents = container.querySelectorAll('.tab-content');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // 1. Remove active class from buttons/contents ONLY within this container
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // 2. Add active class to the clicked button
                btn.classList.add('active');

                // 3. Find the matching content ID and activate it
                const targetId = btn.getAttribute('data-tab');
                const targetContent = document.getElementById(targetId);
                if(targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    });
});