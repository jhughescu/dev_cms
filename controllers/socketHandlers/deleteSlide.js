const Session = require("../../models/sessionModel");

module.exports.handleDeleteSlide = async (io, socket, { sessionId, slideId }, socketSessions) => {
    if (!sessionId || slideId === undefined) {
        console.warn("❌ deleteSlide: sessionId or slideId missing");
        return;
    }

    try {
        const session = await Session.findOne({ sessionId });
        if (!session) {
            console.warn(`❌ deleteSlide: session ${sessionId} not found`);
            return;
        }

        if (!session.slides) {
            console.warn(`❌ deleteSlide: no slides in session ${sessionId}`);
            return;
        }

        // Find and remove the slide
        const initialCount = session.slides.length;
        session.slides = session.slides.filter(slide => slide.slideId !== slideId);

        if (session.slides.length === initialCount) {
            console.warn(`❌ deleteSlide: slide ${slideId} not found in session ${sessionId}`);
            return;
        }

        await session.save();
        console.log(`✅ Slide ${slideId} deleted from session ${sessionId}`);
        console.log(`📤 Broadcasting slidesUpdated to session room: ${sessionId}`);

        // Broadcast updated slides to all sockets in this session room
        io.to(sessionId).emit('slidesUpdated', { slides: session.slides });
        // Also emit to all connected sockets as fallback
        io.emit('slidesUpdated', { sessionId, slides: session.slides });
    } catch (error) {
        console.error("❌ deleteSlide error:", error);
    }
};
