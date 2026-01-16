const Session = require("../../models/sessionModel");

async function handleStudentPing(io, socket, { sessionId, username }, socketSessions) {
    if (!sessionId) return;

    const session = await Session.findOne({ sessionId });
    if (!session) return;

    let student =
        session.students.find(s => s.username === username) ||
        session.students.find(s => s.socketId === socket.id);

    if (!student) {
        console.warn(`Ping from unknown student ${username} (${sessionId})`);
        return;
    }

    student.lastActive = new Date();
    student.connected = true;  // Ensure they're marked as connected on ping
    if (!student.joinedAt) student.joinedAt = new Date();
    await session.save();

    const facSock = socketSessions[sessionId]?.facilitator;
    if (facSock) {
        io.to(facSock).emit("studentActive", {
            username: student.username,
            lastActive: student.lastActive,
            joinedAt: student.joinedAt,
        });
    }
}

module.exports = { handleStudentPing };
