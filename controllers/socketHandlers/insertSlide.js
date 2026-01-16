const Session = require("../../models/sessionModel");

module.exports.handleInsertSlide = async (io, socket, { sessionId, afterSlideId }, socketSessions) => {
    if (!sessionId) {
        console.warn("❌ insertSlide: sessionId missing");
        return;
    }

    try {
        const session = await Session.findOne({ sessionId });
        if (!session) {
            console.warn(`❌ insertSlide: session ${sessionId} not found`);
            return;
        }

        // Determine the next slide ID
        const maxSlideId = session.slides && session.slides.length > 0
            ? Math.max(...session.slides.map(s => s.slideId))
            : 0;
        const newSlideId = maxSlideId + 1;

        // Determine the next display number (count existing content slides with displayNumber)
        const contentSlides = session.slides.filter(s => s.displayNumber != null);
        const maxDisplayNumber = contentSlides.length > 0
            ? Math.max(...contentSlides.map(s => s.displayNumber))
            : 0;
        const newDisplayNumber = maxDisplayNumber + 1;

        // Create the new slide
        const newSlide = {
            slideId: newSlideId,
            displayNumber: newDisplayNumber,
            details: '',
            assets: []
        };

        // Add new slide to the session
        if (!session.slides) {
            session.slides = [];
        }

        // If a reference slide is specified, insert after it; otherwise append to end
        if (afterSlideId !== undefined && afterSlideId !== null) {
            const insertIndex = session.slides.findIndex(s => s.slideId === afterSlideId);
            if (insertIndex !== -1) {
                session.slides.splice(insertIndex + 1, 0, newSlide);
                console.log(`✅ Slide ${newSlideId} inserted after slide ${afterSlideId} in session ${sessionId}`);
            } else {
                // Reference slide not found, append to end
                session.slides.push(newSlide);
                console.log(`⚠️ Reference slide ${afterSlideId} not found, appending slide ${newSlideId} to end of session ${sessionId}`);
            }
        } else {
            session.slides.push(newSlide);
            console.log(`✅ Slide ${newSlideId} appended to session ${sessionId}`);
        }

        await session.save();
        console.log(`📤 Broadcasting slidesUpdated to session room: ${sessionId}`);

        // Broadcast updated slides to all sockets in this session room
        io.to(sessionId).emit('slidesUpdated', { slides: session.slides });
        // Also emit to all connected sockets as fallback
        io.emit('slidesUpdated', { sessionId, slides: session.slides });
    } catch (error) {
        console.error("❌ insertSlide error:", error);
    }
};
