document.addEventListener("DOMContentLoaded", () => {
    
    // ================= SCROLL REVEAL ANIMATION =================
    // Selects all elements with the 'bible-reveal' class
    const revealElements = document.querySelectorAll('.bible-reveal');

    // Observer options: Trigger when 15% of the element is visible
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px" // Triggers slightly before it enters the bottom of the screen
    };

    const bibleObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add 'active' class to trigger CSS transition
                entry.target.classList.add('active');
                
                // Optional: Unobserve after revealing to only animate once per load
                // observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    // Attach observer to each element
    revealElements.forEach(el => {
        bibleObserver.observe(el);
    });

    // ================= BIBLE READER PANEL LOGIC =================
    const openReaderBtn = document.getElementById("open-orthodox-reader");
    const closeReaderBtn = document.getElementById("close-panel-btn");
    const sidePanel = document.getElementById("bible-reader-panel");
    const panelOverlay = document.getElementById("panel-overlay");

    if (openReaderBtn && sidePanel && panelOverlay) {
        
        // Open Panel
        openReaderBtn.addEventListener("click", (e) => {
            e.preventDefault();
            sidePanel.classList.add("open");
            panelOverlay.classList.add("open");
            document.body.style.overflow = "hidden"; // Prevents background scrolling
        });

        // Close Panel via Back Arrow
        closeReaderBtn.addEventListener("click", closePanel);

        // Close Panel by clicking the dark overlay outside the menu
        panelOverlay.addEventListener("click", closePanel);

        function closePanel() {
            sidePanel.classList.remove("open");
            panelOverlay.classList.remove("open");
            document.body.style.overflow = "auto"; // Restores background scrolling
        }
    }
});