const Session = require("../../models/sessionModel");

// Remove a student from a session (facilitator initiated)
async function handleRemoveStudent(io, socket, { sessionId, username }, socketSessions) {
    if (!sessionId || !username) return;

    // Only allow the facilitator socket registered for this session
    const facilitatorSocket = socketSessions[sessionId]?.facilitator;
    if (facilitatorSocket && facilitatorSocket !== socket.id) {
        console.warn(`[removeStudent] Unauthorized socket attempted removal for ${sessionId}`);
        return;
    }

    const session = await Session.findOne({ sessionId });
    if (!session) return;

    const idx = session.students.findIndex(s => s.username === username);
    if (idx === -1) return;

    const removed = session.students[idx];
    session.students.splice(idx, 1);
    await session.save();

    // If the student is currently connected, drop their socket and notify
    if (removed.socketId) {
        io.to(removed.socketId).emit("removedFromSession", { reason: "Facilitator removed you." });
        const studentSocket = io.sockets.sockets.get(removed.socketId);
        if (studentSocket) studentSocket.disconnect(true);

        // Clean up in-memory tracking
        const studentList = socketSessions[sessionId]?.students || [];
        const pos = studentList.indexOf(removed.socketId);
        if (pos !== -1) studentList.splice(pos, 1);
    }

    // Push updated list to facilitator
    io.to(socket.id).emit("studentListUpdated", session.students);
}

module.exports = { handleRemoveStudent };
