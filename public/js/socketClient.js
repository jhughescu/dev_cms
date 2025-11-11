// Replace SESSION_ID and ROLE dynamically as needed
const socket = io(); // assumes <script src="/socket.io/socket.io.js"></script> is loaded

const sessionId = "classroom1"; // example session
const role = "facilitator"; // or "student"

// Join the session
socket.emit("joinSession", { sessionId, role });

// Facilitator: send asset
function sendAssetToStudents(assetUrl) {
    socket.emit("sendAsset", { sessionId, asset: { url: assetUrl } });
}

// Student: receive asset
socket.on("receiveAsset", (asset) => {
    console.log("📥 Received asset:", asset);
    // Here you can create a <a> or <img> element dynamically
});
