import { StudentSocket } from "./student-socket.js";
import { StudentUI } from "./student-ui.js";
import { StudentSession } from "./student-session.js";

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

    // ✅ Create and connect socket layer (no need to call setCallbacks())
    const socketLayer = new StudentSocket(sessionId, username);

    // --- Listen for full session updates
    document.addEventListener("sessionStateReceived", (e) => {
        const sessionState = e.detail;
        console.log("🎓 Full session state received by student:", sessionState);
        sessionLayer.updateSession(sessionState);
        uiLayer.renderSession(sessionState);
    });

    // --- Listen for single asset updates
    document.addEventListener("assetReceived", (e) => {
        const asset = e.detail;
        console.log("🎓 New asset received by student:", asset);
        sessionLayer.addAsset(asset);
        uiLayer.renderAsset(asset);
    });

    console.log(`✅ Student started with username "${username}" in "${sessionId}"`);
});
