// controllers/socketController.js
const {
    Server
} = require("socket.io");
const Session = require("../models/sessionModel");

let io;

// In-memory tracking for live sockets
// Structure: { [sessionId]: { facilitator: socketId|null, students: [socketId,...] } }
const socketSessions = {};

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

            // Initialize in-memory tracking
            if (!socketSessions[sessionId]) {
                socketSessions[sessionId] = {
                    facilitator: null,
                    students: []
                };
            }

            let session = await Session.findOne({
                sessionId
            });

            // 🧱 Create session only if facilitator joins first
            if (!session) {
                if (type === "facilitator") {
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

            // --- Facilitator joins ---
            if (type === "facilitator") {
                socketSessions[sessionId].facilitator = socket.id;
                console.log(`Facilitator ${username} joined ${sessionId}`);

                // Send current student list to facilitator
                if (session.students.length > 0) {
                    io.to(socket.id).emit("studentListUpdated", session.students);
                }
            }

            // --- Student joins/reconnects ---
            if (type === "student") {
                let student = session.students.find((s) => s.username === username);

                if (!student) {
                    student = {
                        username,
                        socketId: socket.id,
                        connected: true,
                    };
                    session.students.push(student);
                    console.log(`New student ${username} joined ${sessionId}`);
                } else {
                    student.socketId = socket.id;
                    student.connected = true;
                    console.log(`Student ${username} reconnected to ${sessionId}`);
                }

                await session.save();

                // Track student socket in memory
                if (!socketSessions[sessionId].students.includes(socket.id)) {
                    socketSessions[sessionId].students.push(socket.id);
                }

                // Notify facilitator if connected
                if (socketSessions[sessionId].facilitator) {
                    console.log(`emit studentListUpdated`);
                    io.to(socketSessions[sessionId].facilitator).emit("studentListUpdated", session.students);
                }
            }

            socket.join(sessionId);

            // Send full session state to joining socket
            socket.emit("sessionState", session);
        });

        // --- Facilitator sends asset ---
        socket.on("sendAsset", async ({
            sessionId,
            asset,
            username
        }) => {
            const session = await Session.findOne({
                sessionId
            });
            if (!session) return;

            if (username !== session.facilitator) {
                console.warn(`Unauthorized asset send attempt by ${username}`);
                return;
            }

            session.assets.push(asset);
            session.updatedAt = new Date();
            await session.save();

            io.to(sessionId).emit("receiveAsset", asset);
            console.log(`Asset sent to ${sessionId} by ${username}: ${asset.originalName}`);
        });

        // --- Reset session ---
        socket.on("resetSession", async ({
            sessionId
        }) => {
            if (!sessionId) return;
            await Session.deleteOne({
                sessionId
            });

            // Notify all connected clients
            io.to(sessionId).emit("sessionReset");
            console.log(`Session ${sessionId} reset.`);

            // Cleanup in-memory sockets
            delete socketSessions[sessionId];
        });

        // --- Disconnect handling ---
        // --- Disconnect handling ---
        socket.on("disconnect", async () => {
            console.log("Socket disconnected:", socket.id);

            // Check if student
            let session = await Session.findOne({
                "students.socketId": socket.id
            });
            if (session) {
                const student = session.students.find((s) => s.socketId === socket.id);
                if (student) {
                    student.connected = false;
                    await session.save();

                    // Notify facilitator if connected
                    const facilitatorSocket =
                        socketSessions[session.sessionId] && socketSessions[session.sessionId].facilitator;
                    if (facilitatorSocket) {
                        console.log(`emit studentListUpdated`);
                        io.to(facilitatorSocket).emit("studentListUpdated", session.students);
                    }

                    console.log(`Student ${student.username} disconnected from ${session.sessionId}`);
                }
            }

            // Remove student socket from in-memory tracking
            for (const sId in socketSessions) {
                const idx = socketSessions[sId].students.indexOf(socket.id);
                if (idx !== -1) socketSessions[sId].students.splice(idx, 1);

                // Remove facilitator socket if it disconnected
                if (socketSessions[sId].facilitator === socket.id) {
                    socketSessions[sId].facilitator = null;
                }
            }
        });

    });
}

module.exports = {
    initSocket,
    socketSessions
};
