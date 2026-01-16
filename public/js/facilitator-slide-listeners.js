// Facilitator slide editor socket listeners
// Extracted from inline facilitator.hbs script block

(function(global) {
    function setupSlideSocketListeners(config) {
        const {
            getSocketLayer,
            renderSlidesFromDB,
            lastMaxSlideIdRef  // object with .value property to track mutable state
        } = config;

        function setupListeners() {
            const socketLayer = getSocketLayer();
            if (socketLayer && socketLayer.socket) {
                console.log('📊 Setting up slidesUpdated listener');
                socketLayer.socket.on('slidesUpdated', (data) => {
                    console.log('📊 RECEIVED slidesUpdated event:', data);
                    if (data.slides) {
                        // Detect if a new slide was added
                        let slideToSelect = null;
                        if (data.slides.length > 0) {
                            const newSlideIds = data.slides.map(s => s.slideId);
                            const currentMaxId = Math.max(...newSlideIds);
                            
                            // If this is the first update and we haven't set lastMaxSlideId yet
                            if (lastMaxSlideIdRef.value === null) {
                                lastMaxSlideIdRef.value = currentMaxId;
                                slideToSelect = null; // Don't auto-select on initial render
                            } else if (currentMaxId > lastMaxSlideIdRef.value) {
                                // A new slide was added (max ID increased)
                                slideToSelect = currentMaxId;
                                lastMaxSlideIdRef.value = currentMaxId;
                                console.log(`✨ New slide detected: ${currentMaxId}, auto-selecting it`);
                            } else {
                                // Max ID hasn't changed, just update without selection
                                lastMaxSlideIdRef.value = currentMaxId;
                            }
                        }
                        
                        renderSlidesFromDB(data.slides, slideToSelect);
                        
                        // Trigger file browser reload
                        if (typeof window.reloadFileTable === 'function') {
                            console.log('🔄 Reloading file table');
                            window.reloadFileTable();
                        } else {
                            console.warn('⚠️ reloadFileTable not available');
                        }
                    }
                });
                console.log('📊 Listener attached');
            } else {
                // Retry in 500ms if socket not ready
                setTimeout(setupListeners, 500);
            }
        }

        setupListeners();
    }

    // Export for inline script to call
    global.FacilitatorSlideListeners = {
        setupSocketListeners: setupSlideSocketListeners
    };
})(window);
