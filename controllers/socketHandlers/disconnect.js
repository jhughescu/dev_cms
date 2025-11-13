const Session = require("../../models/sessionModel");

async function handleDisconnect(io, socket, socketSessions) {
    console.log("Socket disconnected:", socket.id);

    const session = await Session.findOne({ "students.socketId": socket.id });
    if (session) {
        const student = session.students.find(s => s.socketId === socket.id);
        if (student) {
            student.connected = false;
            await session.save();

            // Refactored facilitator socket retrieval (no optional chaining)
            let facSock = null;
            if (
                socketSessions[session.sessionId] &&
                socketSessions[session.sessionId].facilitator
            ) {
                facSock = socketSessions[session.sessionId].facilitator;
            }

            if (facSock) {
                io.to(facSock).emit("studentListUpdated", session.students);
            }

            console.log(`Student ${student.username} disconnected from ${session.sessionId}`);
        }
    }

    // Cleanup memory
    for (const sId in socketSessions) {
        const idx = socketSessions[sId].students.indexOf(socket.id);
        if (idx !== -1) socketSessions[sId].students.splice(idx, 1);
        if (socketSessions[sId].facilitator === socket.id) {
            socketSessions[sId].facilitator = null;
        }
    }
}

module.exports = { handleDisconnect };
