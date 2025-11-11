// public/js/student-main.js
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

    // ✅ Load or request username
    let username = localStorage.getItem("studentUsername");
    if (!username) {
        username = prompt("Enter your name:");
        if (!username || username.trim() === "") {
            username = "student_" + Math.floor(Math.random() * 9999);
        }
        localStorage.setItem("studentUsername", username);
    }

    // ✅ Instantiate components
    const socketLayer = new StudentSocket(sessionId, username);
    const sessionLayer = new StudentSession();
    const uiLayer = new StudentUI("received");

    // ✅ Wire events
    document.addEventListener("sessionStateReceived", (e) => {
        const session = e.detail;

        // Update session data (text, template, assets, etc.)
        sessionLayer.updateSession(session);

        // Replace UI with the most recent asset if present
        if (session.assets && session.assets.length > 0) {
            const latestAsset = session.assets[session.assets.length - 1];
            uiLayer.showAsset(latestAsset);
        }
    });

    document.addEventListener("assetReceived", (e) => {
        const asset = e.detail;

        // Store internally
        sessionLayer.addAsset(asset);

        // UI: replace with latest
        uiLayer.showAsset(asset);
    });

    console.log(`✅ Student started with username "${username}" in "${sessionId}"`);
});
