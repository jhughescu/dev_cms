// public/js/flash.js
//console.log("flash.js loaded");

/**
 * Smoothly fade out and remove a flash element
 */
function fadeAndDismiss(flash, timeout = 500) {
    if (flash.__isFading) return;
    flash.__isFading = true;

    // Trigger reflow to ensure transition applies
    void flash.offsetWidth;

    flash.classList.add("flash-hidden");

    const onTransitionEnd = () => {
        flash.removeEventListener("transitionend", onTransitionEnd);
        if (flash.parentNode) flash.parentNode.removeChild(flash);
    };

    flash.addEventListener("transitionend", onTransitionEnd);

    // Safety fallback removal
    setTimeout(() => {
        try {
            flash.removeEventListener("transitionend", onTransitionEnd);
            if (flash.parentNode) flash.parentNode.removeChild(flash);
        } catch {}
    }, timeout + 800);
}

/**
 * Create and display a flash banner dynamically
 * @param {string} message - The text to show
 * @param {"success"|"error"} [type="success"]
 * @param {number} [duration=4000] - How long before auto-dismiss (ms)
 */
export function addFlashMessage(message, type = "success", duration = 4000) {
    console.log
    let container = document.getElementById("flash-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "flash-container";
        container.style.position = "fixed";
        container.style.top = "1rem";
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.zIndex = "1000";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "0.5rem";
        document.body.appendChild(container);
    }

    const flash = document.createElement("div");
    flash.classList.add("flash-banner");
    flash.classList.add(`flash-${type}-banner`);
    flash.textContent = message;

    // Start hidden
    flash.style.opacity = 0;
    flash.style.transform = "translateY(-10px)";
    flash.style.transition = "opacity 0.5s, transform 0.5s";
    flash.style.alignSelf = "center";

    container.appendChild(flash);

    // Animate in
    requestAnimationFrame(() => {
        flash.style.opacity = 1;
        flash.style.transform = "translateY(0)";
    });

    // Auto-dismiss
    setTimeout(() => fadeAndDismiss(flash, 500), duration);

    // Click-to-dismiss
    flash.addEventListener("click", () => fadeAndDismiss(flash, 500));
}

/**
 * Initialize server-rendered flash messages (if any exist in JSON)
 */
export function initFlashMessagesFromJSON() {
    const flashDataEl = document.getElementById("flash-data");
    if (!flashDataEl) return;

    let flashData;
    try {
        flashData = JSON.parse(flashDataEl.textContent);
    } catch (err) {
        console.error("Failed to parse flash JSON:", err);
        return;
    }

    if (flashData.success && Array.isArray(flashData.success)) {
        flashData.success.forEach((msg) => addFlashMessage(msg, "success"));
    }
    if (flashData.error && Array.isArray(flashData.error)) {
        flashData.error.forEach((msg) => addFlashMessage(msg, "error"));
    }
}
