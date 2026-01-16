// Facilitator slide editor button handlers
// This module initializes button click handlers for the slide editor
// State is managed by the inline script in facilitator.hbs

(function(global) {
    function initSlideButtons(config) {
        const {
            newSlideBtn,
            slideLeftBtn,
            slideRightBtn,
            addAssetsBtn,
            deleteSlideBtn,
            getSocketLayer,
            isFirstSlide,
            isLastSlide,
            isSlideEditable,
            refreshControlsForCurrentSlide,
            updateArrowButtonStates,
            renderSlidesFromDB,
            currentSessionId,
            slidesCache,
            currentFocusedSlideId
        } = config;

        // Helper to get updated values from config (since they change)
        const getState = () => ({
            currentSessionId: config.currentSessionId(),
            slidesCache: config.slidesCache(),
            currentFocusedSlideId: config.currentFocusedSlideId()
        });

        console.log('[slide-buttons] Initializing slide button handlers');

        // Insert Slide button
        if (newSlideBtn) {
            newSlideBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const socketLayer = getSocketLayer();
                if (!socketLayer || !socketLayer.socket) {
                    console.error('❌ Socket layer not available');
                    alert('Socket connection not available. Please reload the page.');
                    return;
                }
                
                const state = getState();
                const emitData = { sessionId: state.currentSessionId };
                
                if (state.slidesCache.length >= 2) {
                    const firstId = state.slidesCache[0].slideId;
                    const lastId = state.slidesCache[state.slidesCache.length - 1].slideId;
                    
                    if (state.currentFocusedSlideId === null) {
                        emitData.afterSlideId = firstId;
                    } else if (state.currentFocusedSlideId === lastId) {
                        const beforeLast = state.slidesCache[state.slidesCache.length - 2].slideId;
                        emitData.afterSlideId = beforeLast;
                    } else {
                        emitData.afterSlideId = state.currentFocusedSlideId;
                    }
                }
                
                console.log('📤 Emitting insertSlide:', emitData);
                socketLayer.socket.emit('insertSlide', emitData);
            });
        }
    }

    // Export for inline script to call
    global.FacilitatorSlideButtons = {
        init: initSlideButtons
    };
})(window);
