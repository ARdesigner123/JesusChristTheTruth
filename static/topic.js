document.addEventListener("DOMContentLoaded", () => {
    
    // ================= INTERACTIVE FORUM BUTTONS =================
    
    // 1. LIKE BUTTONS
    const likeBtns = document.querySelectorAll(".like-btn");
    
    likeBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            // Toggle active visual state
            this.classList.toggle("active");
            
            // Get the current count span
            const countSpan = this.querySelector(".count");
            let currentCount = parseInt(countSpan.textContent);
            
            // Increment or decrement based on state
            if (this.classList.contains("active")) {
                countSpan.textContent = currentCount + 1;
                // Add a little pop animation class (optional)
                this.querySelector("i").style.transform = "scale(1.4)";
                setTimeout(() => this.querySelector("i").style.transform = "", 200);
            } else {
                countSpan.textContent = currentCount - 1;
            }
        });
    });

    // 2. FAVORITE BUTTONS
    const favBtns = document.querySelectorAll(".fav-btn");
    
    favBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            this.classList.toggle("active");
            
            const countSpan = this.querySelector(".count");
            let currentCount = parseInt(countSpan.textContent);
            
            if (this.classList.contains("active")) {
                countSpan.textContent = currentCount + 1;
                this.querySelector("i").style.transform = "scale(1.4) rotate(36deg)";
                setTimeout(() => this.querySelector("i").style.transform = "", 200);
            } else {
                countSpan.textContent = currentCount - 1;
            }
        });
    });

    // 3. MOCK REPLY / TESTIMONY SUBMISSION
    const replyBtns = document.querySelectorAll(".reply-trigger-btn, .main-reply-btn");
    replyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            alert("This feature will open a text box to write a reply! (Backend integration required to save)");
        });
    });

    const submitTestimony = document.querySelector(".submit-testimony-btn");
    if(submitTestimony) {
        submitTestimony.addEventListener("click", () => {
            const textarea = document.querySelector(".add-testimony-box textarea");
            if(textarea.value.trim() === "") {
                alert("Please write a testimony first!");
            } else {
                alert("Testimony submitted! It will appear after moderation.");
                textarea.value = ""; // Clear box
            }
        });
    }
});