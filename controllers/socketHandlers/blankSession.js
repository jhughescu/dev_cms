// controllers/socketHandlers/blankSession.js
const Session = require("../../models/sessionModel");

module.exports.handleBlankSession = async (io, socket, data, socketSessions) => {
  console.log('[SERVER blankSession] Handler called with data:', data);
  try {
    const { sessionId, username } = data || {};
    if (!sessionId) {
      console.warn('blankSession: missing sessionId');
      return;
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      console.warn('blankSession: session not found', sessionId);
      return;
    }

    console.log('[SERVER blankSession] Session found:', { sessionId, archived: session.archived });

    // Optional: verify facilitator
    if (username && session.facilitator && username !== session.facilitator) {
      console.warn(`blankSession: unauthorized attempt by ${username} for session ${sessionId}`);
      return;
    }

    // Guard: do not allow blanking an archived session
    if (session.archived) {
      console.warn(`[SERVER blankSession] REJECTED: session ${sessionId} is archived`);
      try {
        console.log('[SERVER blankSession] Emitting sessionLocked to socket:', socket.id);
        socket.emit('sessionLocked', { sessionId, message: 'Session is archived and cannot be modified.' });
      } catch (e) {
        console.error('[SERVER blankSession] Error emitting sessionLocked:', e);
      }
      return;
    }

    // Set currentState to empty array
    const updated = await Session.findOneAndUpdate(
      { sessionId },
      { $set: { currentState: [], updatedAt: new Date() } },
      { new: true }
    ).exec();

    if (!updated) {
      console.warn('blankSession: failed to update session', sessionId);
      return;
    }

    // Push an empty snapshot into stateHistory
    try {
      await Session.updateOne({ _id: updated._id }, { $push: { stateHistory: { state: [], timestamp: new Date() } }, $set: { updatedAt: new Date() } });
    } catch (err) {
      console.warn('blankSession: failed to push stateHistory', err);
    }

    // Populate and emit the new session state to the session room
    try {
      const populated = await Session.findById(updated._id).populate('currentState').populate('stateHistory.state').lean();
      const sessionRoom = `session:${sessionId}`;
      io.to(sessionRoom).emit('sessionState', populated);
      // Also emit to admin room so admin dashboards receive the update
      io.to('admin').emit('sessionState', populated);
    } catch (err) {
      console.warn('blankSession: failed to populate session for emit', err);
      const fallback = { sessionId: updated.sessionId, currentState: updated.currentState || [], stateHistory: updated.stateHistory || [] };
      const sessionRoom = `session:${sessionId}`;
      io.to(sessionRoom).emit('sessionState', fallback);
      io.to('admin').emit('sessionState', fallback);
    }

    // Also emit blankSession event to allow clients to clear UI immediately
    const sessionRoom = `session:${sessionId}`;
    io.to(sessionRoom).emit('blankSession');
    console.log(`Session ${sessionId} blanked by ${username || 'system'}`);
  } catch (err) {
    console.warn('blankSession: unexpected error', err);
  }
};
