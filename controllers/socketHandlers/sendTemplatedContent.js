// controllers/socketHandlers/sendTemplatedContent.js
const Session = require('../../models/sessionModel');

module.exports.handleSendTemplatedContent = async (io, socket, data, socketSessions) => {
  try {
    const { sessionId, content, slideType, details } = data;
    
    if (!sessionId || !content) {
      console.log('❌ sendTemplatedContent: Missing sessionId or content');
      return;
    }

    // Find session by sessionId field (not _id)
    const session = await Session.findOne({ sessionId });
    if (!session) {
      console.log('❌ sendTemplatedContent: Session not found');
      return;
    }

    // Check if session is archived (shouldn't send to archived sessions)
    if (session.status === 'archived') {
      console.log('⚠️ sendTemplatedContent: Cannot send to archived session');
      return;
    }

    // Don't update currentState (it's for File ObjectIds only)
    // Just broadcast the templated content to students
    
    // Emit to all students in this session (using the session room format)
    const sessionRoom = `session:${sessionId}`;
    io.to(sessionRoom).emit('templatedContentReceived', {
      sessionId,
      content,
      slideType,
      details,
      timestamp: new Date()
    });

    console.log(`✅ Sent templated content "${content}" (${slideType}) to ${sessionRoom}`);
  } catch (err) {
    console.error('❌ Error in handleSendTemplatedContent:', err);
  }
};
