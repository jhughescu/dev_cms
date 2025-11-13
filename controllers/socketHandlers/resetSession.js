const Session = require("../../models/sessionModel");

async function handleResetSession(io, socket, { sessionId }, socketSessions) {
    if (!sessionId) return;

    await Session.deleteOne({ sessionId });

    io.to(sessionId).emit("sessionReset");
    console.log(`Session ${sessionId} reset.`);

    delete socketSessions[sessionId];
}

module.exports = { handleResetSession };
