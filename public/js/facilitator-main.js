// public/js/facilitator-main.js
import { FacilitatorUI } from "./facilitator-ui.js";

document.addEventListener("DOMContentLoaded", () => {
    const ui = new FacilitatorUI();
    const socket = io();
    const sessionId = "classroom1";
    const username = "JohnDoe"; // or dynamic facilitator name

    socket.emit("joinSession", { sessionId, type: "facilitator", username });

    // ✅ When facilitator sends asset
    window.sendAsset = (asset) => {
        const payload = {
            sessionId,
            asset,
            username,
        };
        console.log("Sending asset:", payload);
        socket.emit("sendAsset", payload);
        ui.showStatus(`Asset "${asset.originalName}" sent to students.`);
    };

    // ✅ Reset session
    document.getElementById("reset-session-btn").addEventListener("click", () => {
        if (confirm("Reset session and disconnect students?")) {
            socket.emit("resetSession", { sessionId });
        }
    });

    // ✅ Show student list updates
    socket.on("studentListUpdated", (students) => {
        console.log("📋 Student list updated:", students);
        ui.renderStudents(students);
    });

    // ✅ Session reset
    socket.on("sessionReset", () => {
        ui.showStatus("Session has been reset.");
        ui.renderStudents([]);
    });

    // ✅ Session state (for reloads)
    socket.on("sessionState", (session) => {
        console.log("📦 Full session state received:", session);
        ui.renderStudents(session.students);
    });

    // ✅ Error messages
    socket.on("errorMessage", (msg) => {
        alert("Error: " + msg);
    });
});
