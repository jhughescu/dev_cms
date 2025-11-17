// public/js/facilitator-main.js
import { FacilitatorUI } from "./facilitator-ui.js";
import { FacilitatorSocket } from "./facilitator-socket.js";

document.addEventListener("DOMContentLoaded", () => {

    const sessionId = "classroom1";
    const username = "JohnDoe"; // TODO: make dynamic

    const socketLayer = new FacilitatorSocket(sessionId, username);
    const ui = new FacilitatorUI();

    // Bridge UI → Socket commands
    ui.attachFileHandlers({
        sendAsset: (asset) => socketLayer.sendAsset(asset),
        resetSession: () => socketLayer.resetSession()
    });

    // UI listens to DOM events (dispatched by socketLayer)
});
