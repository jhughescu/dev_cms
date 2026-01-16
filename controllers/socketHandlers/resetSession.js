const Session = require("../../models/sessionModel");

async function handleResetSession(io, socket, { sessionId }, socketSessions) {
    if (!sessionId) return;

    const session = await Session.findOne({ sessionId });
    if (!session) return;

    // Guard: prevent reset of archived sessions
    if (session.archived) {
        console.warn(`resetSession rejected: session ${sessionId} is archived`);
        try { socket.emit && socket.emit('sessionLocked', { sessionId, message: 'Session is archived and cannot be reset.' }); } catch (e) {}
        return;
    }

    await Session.deleteOne({ sessionId });

    const sessionRoom = `session:${sessionId}`;
    io.to(sessionRoom).emit("sessionReset");
    console.log(`Session ${sessionId} reset.`);

    delete socketSessions[sessionId];
}

module.exports = { handleResetSession };
