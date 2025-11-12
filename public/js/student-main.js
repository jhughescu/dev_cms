import {
    StudentSocket
} from "./student-socket.js";
import {
    StudentUI
} from "./student-ui.js";
import {
    StudentSession
} from "./student-session.js";

document.addEventListener("DOMContentLoaded", () => {
    const sessionId = "classroom1";

    // Load or request username
    let username = localStorage.getItem("studentUsername");
    if (!username) {
        username = prompt("Enter your name:") || `student_${Math.floor(Math.random() * 9999)}`;
        localStorage.setItem("studentUsername", username);
    }

    // Instantiate UI and session
    const sessionLayer = new StudentSession(sessionId, username);
    const uiLayer = new StudentUI("received");

    // ✅ Create socket layer
    const socketLayer = new StudentSocket(sessionId, username);

    // Wire callbacks
    document.addEventListener("sessionStateReceived", (e) => {
        const sessionState = e.detail;
        sessionLayer.updateSession(sessionState);
        uiLayer.renderSession(sessionState);
    });

    document.addEventListener("assetReceived", (e) => {
        const asset = e.detail;
        sessionLayer.addAsset(asset);
        uiLayer.renderAsset(asset);
    });

    console.log(`✅ Student started with username "${username}" in "${sessionId}"`);
});
