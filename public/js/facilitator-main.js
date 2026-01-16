// public/js/facilitator-main.js
console.log('[facilitator-main.js] Module loaded');
import { FacilitatorUI } from "./facilitator-ui.js";
import { FacilitatorSocket } from "./facilitator-socket.js";
import { initFlashMessagesFromJSON, addFlashMessage } from "./flash.js";

// Expose flash function globally for inline scripts
window.addFlashMessage = addFlashMessage;

console.log('[facilitator-main.js] Imports complete, waiting for DOMContentLoaded');

document.addEventListener("DOMContentLoaded", () => {
    console.log('[facilitator-main.js] DOMContentLoaded fired');

    // Initialize server-rendered flash messages
    initFlashMessagesFromJSON();

    // Fetch dynamic sessionId and username from the DOM or server
    const sessionId = document.body.dataset.sessionId || "unknown-session";
    const username = document.body.dataset.username || "unknown-user";

    console.log(`[facilitator-main.js] Facilitator session initialized with sessionId=${sessionId}, username=${username}`);

    const socketLayer = new FacilitatorSocket(sessionId, username);
    const ui = new FacilitatorUI(socketLayer);

    // Expose socketLayer globally for inline scripts (Session Editor)
    window.facilitatorSocketLayer = socketLayer;

    // Pass the actual socketLayer instance so UI can access all methods including sendAssetsBatch
    ui.attachFileHandlers(socketLayer);

    // Re-render file list when session state updates (active indicators stay current)
    document.addEventListener("sessionState", () => {
        if (typeof window.reloadFileTable === "function") {
            window.reloadFileTable();
        }
    });

    // Attach blank session button
    const blankBtn = document.getElementById("blank-session-btn");
    console.log('[facilitator-main.js] Blank button found:', !!blankBtn);
    console.log('[facilitator-main.js] Blank button element:', blankBtn);
    if (blankBtn) {
        console.log('[facilitator-main.js] Adding click listener to blank button');
        blankBtn.addEventListener("click", (e) => {
            console.log('[facilitator-main.js] Blank Session button CLICKED - event:', e);
            e.preventDefault();
            e.stopPropagation();
            socketLayer.blankSession();
        }, true); // Use capture phase
        console.log('[facilitator-main.js] Click listener added');
    }

    // UI listens to DOM events (dispatched by socketLayer)
});
