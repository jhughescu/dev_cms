// public/js/facilitator-main.js
import {
    FacilitatorUI
} from "./facilitator-ui.js";

document.addEventListener("DOMContentLoaded", () => {
    // Initialize core objects
    const ui = new FacilitatorUI();
    const socket = io();

    const sessionId = "classroom1";
    const username = "JohnDoe"; // Replace with dynamic facilitator username if needed

    // ✅ Join the session as facilitator
    socket.emit("joinSession", {
        sessionId,
        type: "facilitator",
        username
    });

    // ✅ Hook up UI buttons (Send + Reset)
    ui.attachFileHandlers({
        sendAsset: (asset) => socket.emit("sendAsset", {
            sessionId,
            asset,
            username
        }),
        resetSession: () => socket.emit("resetSession", {
            sessionId
        })
    });

    // ✅ Student list updates
    socket.on("studentListUpdated", (students) => {
        console.log("📋 Student list updated:", students);
        ui.renderStudents(students);
    });

    // ✅ Full session state (for page reloads)
    socket.on("sessionState", (session) => {
        console.log("📦 Full session state received:", session);
        ui.renderStudents(session.students);
    });

    // ✅ Session reset
    socket.on("sessionReset", () => {
        console.log("🧹 Session has been reset.");
        ui.showStatus("Session has been reset.");
        ui.renderStudents([]);
    });

    // ✅ Student activity pings
    socket.on("studentActive", (data) => {
        console.log("💡 Student active:", data);
        ui.markActive(data);
    });

    // ✅ Error handling
    socket.on("errorMessage", (msg) => {
        alert("Error: " + msg);
    });
});
