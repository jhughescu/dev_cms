const Session = require("../../models/sessionModel");

async function handleStudentLeave(io, socket, { sessionId, username } = {}, socketSessions, ack) {
    if (!sessionId || !username) {
        if (typeof ack === "function") ack({ success: false, error: "Missing sessionId or username." });
        return;
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
        if (typeof ack === "function") ack({ success: false, error: "Session not found." });
        return;
    }

    const idx = session.students.findIndex((s) => s.socketId === socket.id || s.username === username);
    if (idx === -1) {
        if (typeof ack === "function") ack({ success: false, error: "Student not in session." });
        return;
    }

    const removed = session.students[idx];
    session.students.splice(idx, 1);
    await session.save();

    // Clean up in-memory tracking
    const studentList = socketSessions[sessionId]?.students || [];
    const pos = studentList.indexOf(socket.id);
    if (pos !== -1) studentList.splice(pos, 1);

    // Notify facilitator of updated list
    const facSock = socketSessions[sessionId]?.facilitator;
    if (facSock) io.to(facSock).emit("studentListUpdated", session.students);

    if (typeof ack === "function") ack({ success: true, removed: removed.username });
}

module.exports = { handleStudentLeave };
