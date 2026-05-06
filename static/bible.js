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

    // ================= MULTI-PANEL READER LOGIC =================
    const panelOverlay = document.getElementById("panel-overlay");
    const closeBtns = document.querySelectorAll(".close-btn");

    // Map buttons to their specific panels
    const readerPanels = {
        orthodox: { 
            btn: document.getElementById("open-orthodox-reader"), 
            panel: document.getElementById("orthodox-reader-panel") 
        },
        catholic: { 
            btn: document.getElementById("open-catholic-reader"), 
            panel: document.getElementById("catholic-reader-panel") 
        },
        protestant: { 
            btn: document.getElementById("open-protestant-reader"), 
            panel: document.getElementById("protestant-reader-panel") 
        }
    };

    // Helper to close all panels
    function closeAllPanels() {
        Object.values(readerPanels).forEach(p => {
            if (p.panel) p.panel.classList.remove("open");
        });
        if (panelOverlay) panelOverlay.classList.remove("open");
        document.body.style.overflow = "auto"; // Restore background scrolling
    }

    // Attach click events to open specific panels
    Object.values(readerPanels).forEach(p => {
        if (p.btn && p.panel) {
            p.btn.addEventListener("click", (e) => {
                e.preventDefault();
                p.panel.classList.add("open");
                if (panelOverlay) panelOverlay.classList.add("open");
                document.body.style.overflow = "hidden"; // Prevent background scrolling
            });
        }
    });

    // Close logic
    closeBtns.forEach(btn => btn.addEventListener("click", closeAllPanels));
    if (panelOverlay) panelOverlay.addEventListener("click", closeAllPanels);
});