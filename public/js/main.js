import {
    addFlashMessage
} from "./flash.js";
import {
    initDeleteConfirmation
} from "./delete.js";
import {
    initUploader
} from "./uploader.js";

document.addEventListener("DOMContentLoaded", () => {
    // Initialize pre-rendered flashes
    const flashes = document.querySelectorAll("#flash-container .flash-banner");
    flashes.forEach((flash, i) => {
        setTimeout(() => {
            flash.classList.add("flash-visible");
        }, i * 150);

        // Auto-dismiss
        setTimeout(() => {
            flash.classList.add("flash-hidden");
            flash.addEventListener("transitionend", () => flash.remove());
        }, 4000 + i * 200);

        // Click-to-dismiss
        flash.addEventListener("click", () => {
            flash.classList.add("flash-hidden");
            flash.addEventListener("transitionend", () => flash.remove());
        });
    });

    // Initialize other modules
    initDeleteConfirmation();
    initUploader();
});
