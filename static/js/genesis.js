document.addEventListener("DOMContentLoaded", () => {
    
    // ================= SCROLL REVEAL ANIMATION =================
    // Selects all elements with the 'reveal-element' class
    const revealElements = document.querySelectorAll('.reveal-element');

    // Observer options: Trigger when 10% of the element is visible
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -30px 0px"
    };

    const chapterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add 'active' class to trigger CSS transition
                entry.target.classList.add('active');
                
                // Unobserve after revealing so it only animates once per load
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    // Attach observer to each element
    revealElements.forEach(el => {
        chapterObserver.observe(el);
    });

});