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

});