// controllers/socketController.js
const {
    Server
} = require("socket.io");
const Session = require("../models/sessionModel");

let io;
const socketSessions = {}; // in-memory { sessionId: [socketIds] }

function initSocket(server) {
    io = new Server(server);

    io.on("connection", (socket) => {
        console.log("⚡ Socket connected:", socket.id);

        // --- Join session (facilitator or student) ---
        socket.on("joinSession", async ({
            sessionId,
            type,
            username
        }) => {
            if (!sessionId || !username) return;

            // Create array for in-memory tracking if missing
            if (!socketSessions[sessionId]) socketSessions[sessionId] = [];
            socketSessions[sessionId].push(socket.id);

            let session = await Session.findOne({
                sessionId
            });

            if (!session) {
                if (type === "facilitator") {
                    // Create new session
                    session = new Session({
                        sessionId,
                        facilitator: username,
                        students: [],
                        assets: [],
                    });
                    await session.save();
                    console.log(`Session created: ${sessionId} by facilitator ${username}`);
                } else {
                    socket.emit("errorMessage", "Session not yet started by facilitator");
                    return;
                }
            }

            // --- Handle student reconnects or new joins ---
            if (type === "student") {
                const existing = session.students.find((s) => s.username === username);
                if (!existing) {
                    session.students.push({
                        username,
                        socketId: socket.id
                    });
                    console.log(`New student ${username} joined session ${sessionId}`);
                } else {
                    existing.socketId = socket.id; // update for reconnect
                    console.log(`Student ${username} reconnected to session ${sessionId}`);
                }
                await session.save();
            }

            socket.join(sessionId);
            console.log(`${username} joined session ${sessionId} as ${type}`);

            // --- Send full session state to joining socket ---
            socket.emit("sessionState", session);
        });

        socket.on("resetSession", async ({
            sessionId
        }) => {
            if (!sessionId) return;

            await Session.deleteOne({
                sessionId
            });

            // Notify all connected clients
            io.to(sessionId).emit("sessionReset");

            // Optionally clear rooms (clients will auto-leave on reconnect)
            console.log(`Session ${sessionId} has been reset.`);
        });

        // --- Facilitator sends asset to session ---
        socket.on("sendAsset", async ({
            sessionId,
            asset,
            username
        }) => {
            const session = await Session.findOne({
                sessionId
            });
            if (!session) return;

            // Only facilitator can send
            if (username !== session.facilitator) {
                console.warn(`Unauthorized asset send attempt by ${username}`);
                return;
            }

            session.assets.push(asset);
            session.updatedAt = new Date();
            await session.save();

            io.to(sessionId).emit("receiveAsset", asset);
            console.log(`Asset sent to session ${sessionId} by ${username}: ${asset.originalName}`);
        });

        // --- Disconnect handling ---
        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
            for (const sessionId in socketSessions) {
                socketSessions[sessionId] = socketSessions[sessionId].filter(
                    (id) => id !== socket.id
                );
            }
        });
    });
}

module.exports = {
    initSocket,
    socketSessions,
};
