// Shared facilitator helper functions (extracted from inline script)
// These are used by facilitator.hbs inline logic; later we can import them into modules.

// Check if editing is allowed based on session status
(function(global) {
    // UMD-style minimal exposure for existing inline scripts
    const api = {
        isEditingAllowed(status) {
            return status === 'pending';
        },
        isFirstSlide(slidesCache, slideId) {
            if (!slidesCache || slidesCache.length === 0) return false;
            return slidesCache[0].slideId === slideId;
        },
        isLastSlide(slidesCache, slideId) {
            if (!slidesCache || slidesCache.length === 0) return false;
            return slidesCache[slidesCache.length - 1].slideId === slideId;
        },
        isSlideEditable(slidesCache, status, slideId) {
            return api.isEditingAllowed(status) && !api.isFirstSlide(slidesCache, slideId) && !api.isLastSlide(slidesCache, slideId);
        }
    };

    global.FacilitatorHelpers = api;
})(window);
