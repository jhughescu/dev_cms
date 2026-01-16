const Session = require("../../models/sessionModel");

module.exports.handleReorderSlides = async (io, socket, { sessionId, slides }, socketSessions) => {
    if (!sessionId || !slides) {
        console.warn("❌ reorderSlides: sessionId or slides missing");
        return;
    }

    try {
        const session = await Session.findOne({ sessionId });
        if (!session) {
            console.warn(`❌ reorderSlides: session ${sessionId} not found`);
            return;
        }

        // Validate that we have the same slides, just reordered
        if (!session.slides || session.slides.length !== slides.length) {
            console.warn(`❌ reorderSlides: slide count mismatch in session ${sessionId}`);
            return;
        }

        // Update the slides array with the new order
        session.slides = slides;

        await session.save();
        console.log(`✅ Slides reordered in session ${sessionId}`);
        console.log(`📤 Broadcasting slidesUpdated to session room: ${sessionId}`);

        // Broadcast updated slides to all sockets in this session room
        io.to(sessionId).emit('slidesUpdated', { slides: session.slides });
    } catch (error) {
        console.error(`❌ Error in reorderSlides for session ${sessionId}:`, error);
    }
};
