// public/js/flash.js
export function initFlashMessages() {
    const flashElements = document.querySelectorAll(".flash");

    flashElements.forEach(flash => {
        // Fade in
        flash.style.opacity = 0;
        flash.style.transition = "opacity 0.5s";
        requestAnimationFrame(() => {
            flash.style.opacity = 1;
        });

        // Fade out after 5s
        setTimeout(() => {
            flash.style.opacity = 0;
            flash.addEventListener("transitionend", () => flash.remove());
        }, 5000);
    });
}
// public/js/flash.js
console.log('flash.js loaded');
export function initFlashBanners() {
    // Select all flash elements already rendered in the DOM
    const flashes = document.querySelectorAll(".flash-banner");
    console.log('initFlashBanners')
    flashes.forEach((flash) => {
        // Auto-dismiss after 4 seconds
        console.log('flash dismiss timeout')
        setTimeout(() => {
            flash.classList.add("flash-hidden");
            // Remove from DOM after transition
            flash.addEventListener("transitionend", () => flash.remove());
        }, 4000);

        // Optional: allow click to dismiss immediately
        flash.addEventListener("click", () => {
            flash.classList.add("flash-hidden");
            flash.addEventListener("transitionend", () => flash.remove());
        });
    });
}
