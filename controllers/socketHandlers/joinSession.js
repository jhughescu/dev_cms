const Session = require("../../models/sessionModel");

async function handleJoinSession(io, socket, { sessionId, type, username }, socketSessions) {
    if (!sessionId || !username) return;

    if (!socketSessions[sessionId]) {
        socketSessions[sessionId] = { facilitator: null, students: [] };
    }

    let session = await Session.findOne({ sessionId });

    // Create session only if facilitator joins first
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

    // Facilitator joins
    if (type === "facilitator") {
        socketSessions[sessionId].facilitator = socket.id;
        console.log(`Facilitator ${username} joined ${sessionId}`);

        if (session.students.length > 0) {
            io.to(socket.id).emit("studentListUpdated", session.students);
        }
    }

    // Student joins
    if (type === "student") {
        const now = new Date();
        let student = session.students.find(s => s.username === username);

        if (!student) {
            student = { username, socketId: socket.id, connected: true, joinedAt: now, lastActive: now };
            session.students.push(student);
            console.log(`New student ${username} joined ${sessionId}`);
        } else {
            student.socketId = socket.id;
            student.connected = true;
            student.lastActive = now;
            if (!student.joinedAt) student.joinedAt = now;
            console.log(`Student ${username} reconnected to ${sessionId}`);
        }

        await session.save();

        if (!socketSessions[sessionId].students.includes(socket.id)) {
            socketSessions[sessionId].students.push(socket.id);
        }

        const facSock = socketSessions[sessionId].facilitator;
        if (facSock) io.to(facSock).emit("studentListUpdated", session.students);
    }

    socket.join(sessionId);
    socket.emit("sessionState", session);
}

module.exports = { handleJoinSession };
