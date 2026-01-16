const Session = require("../../models/sessionModel");

// Simple user agent parsers
function parseBrowser(ua) {
    if (!ua) return 'Unknown';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
    return 'Other';
}

function parseOS(ua) {
    if (!ua) return 'Unknown';
    if (ua.includes('Windows NT 10.0')) return 'Windows 10';
    if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (ua.includes('Windows NT 6.2')) return 'Windows 8';
    if (ua.includes('Windows NT 6.1')) return 'Windows 7';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
}

// New: handleJoinSession with role/organisation logic
async function handleJoinSession(io, socket, payload, socketSessions) {
    // Accepts: { sessionId, username, role, organisation, type }
    const { sessionId, username, role, organisation, type } = payload || {};
    const normalizedRole = String(role || type || '').toLowerCase();
    if (!normalizedRole) return;

    // Admins join admin room
    if (normalizedRole === 'admin') {
        socket.join('admin');
        socket.emit('sessionState', { adminJoined: true });
        return;
    }

    // Facilitators join facilitator-org:<organisation> (not session rooms)
    if (normalizedRole === 'facilitator') {
        // Track facilitator socket per session so we can push student list updates
        if (sessionId) {
            if (!socketSessions[sessionId]) {
                socketSessions[sessionId] = { facilitator: null, students: [] };
            }
            socketSessions[sessionId].facilitator = socket.id;
        }

        // Keep legacy org-based room join if organisation is provided
        if (organisation) {
            const orgRoom = `facilitator-org:${organisation}`;
            socket.join(orgRoom);
        }

        // Send current student list immediately if session exists
        if (sessionId) {
            try {
                const session = await Session.findOne({ sessionId }).lean();
                if (session) {
                    io.to(socket.id).emit('studentListUpdated', session.students || []);
                }
            } catch (err) {
                console.error('[joinSession] Failed to load session for facilitator', err);
            }
        }

        socket.emit('sessionState', { facilitatorJoined: true, organisation });
        return;
    }

    // Students join session:<sessionId>
    if (normalizedRole === 'student') {
        if (!sessionId || !username) return;

        if (!socketSessions[sessionId]) {
            socketSessions[sessionId] = { facilitator: null, students: [] };
        }

        let session = await Session.findOne({ sessionId });

        // Only allow students to join existing sessions
        if (!session) {
            socket.emit("errorMessage", "Session not yet started by facilitator");
            return;
        }

        // Extract user agent info from socket handshake
        const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
        const browser = parseBrowser(userAgent);
        const os = parseOS(userAgent);

        // Student joins
        const now = new Date();
        let student = session.students.find(s => s.username === username);

        if (!student) {
            // Check for duplicate username (excluding offline/disconnected students)
            const duplicateStudent = session.students.find(s => s.username === username && s.connected);
            if (duplicateStudent) {
                socket.emit("errorMessage", `The name "${username}" is already in use. Please choose a different name.`);
                return;
            }

            student = { 
                username, 
                socketId: socket.id, 
                connected: true, 
                joinedAt: now, 
                lastActive: now,
                userAgent,
                browser,
                os
            };
            session.students.push(student);
            console.log(`[joinSession] New student ${username} joined ${sessionId}`);
        } else {
            student.socketId = socket.id;
            student.connected = true;
            student.lastActive = now;
            if (!student.joinedAt) student.joinedAt = now;
            // Update user agent info on reconnect
            student.userAgent = userAgent;
            student.browser = browser;
            student.os = os;
            console.log(`[joinSession] Student ${username} reconnected to ${sessionId}`);
        }

        await session.save();

        if (!socketSessions[sessionId].students.includes(socket.id)) {
            socketSessions[sessionId].students.push(socket.id);
        }

        // No facilitator socket tracking for now (since facilitators don't join session rooms)
        // Broadcast updated student list to facilitator if connected
        const facSock = socketSessions[sessionId].facilitator;
        if (facSock) {
            io.to(facSock).emit('studentListUpdated', session.students);
        }

        const sessionRoom = `session:${sessionId}`;
        socket.join(sessionRoom);
        console.log(`[joinSession] Student ${username} joined room ${sessionRoom}`);
        
        // Populate currentState before sending to student so they get full file objects
        try {
            const populatedSession = await Session.findById(session._id)
                .populate('currentState')
                .lean();
            socket.emit("sessionState", populatedSession);
        } catch (err) {
            console.warn('[joinSession] Failed to populate currentState, sending unpopulated:', err);
            socket.emit("sessionState", session);
        }
        return;
    }

    // Unknown role
    socket.emit('errorMessage', 'Unknown role');
}

module.exports = { handleJoinSession };
