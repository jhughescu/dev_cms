const Session = require("../../models/sessionModel");

module.exports.handleUpdateSlideDetails = async (io, socket, { sessionId, slideId, details, assets }, socketSessions) => {
    if (!sessionId || slideId === undefined) {
        console.warn("❌ updateSlideDetails: sessionId or slideId missing");
        return;
    }

    try {
        const session = await Session.findOne({ sessionId });
        if (!session) {
            console.warn(`❌ updateSlideDetails: session ${sessionId} not found`);
            return;
        }

        if (!session.slides) {
            console.warn(`❌ updateSlideDetails: no slides in session ${sessionId}`);
            return;
        }

        // Find the slide
        const slide = session.slides.find(s => s.slideId === slideId);
        if (!slide) {
            console.warn(`❌ updateSlideDetails: slide ${slideId} not found in session ${sessionId}`);
            return;
        }

        // Update slide details and assets
        if (details !== undefined) {
            slide.details = details;
        }
        if (Array.isArray(assets)) {
            slide.assets = assets;
        }

        await session.save();
        console.log(`✅ Slide ${slideId} updated in session ${sessionId}`);
        console.log(`📤 Broadcasting slidesUpdated to session room: ${sessionId}`);

        // Broadcast updated slides to all sockets in this session room
        io.to(sessionId).emit('slidesUpdated', { slides: session.slides });
        // Also emit to all connected sockets as fallback
        io.emit('slidesUpdated', { sessionId, slides: session.slides });
    } catch (error) {
        console.error("❌ updateSlideDetails error:", error);
    }
};
