// Facilitator Session Editor
// Full encapsulated session editor with state management

(function(global) {
    class SessionEditor {
        constructor(config) {
            // DOM element references
            this.elements = {
                newSlideBtn: document.getElementById('new-slide-btn'),
                slideLeftBtn: document.getElementById('slide-left-btn'),
                slideRightBtn: document.getElementById('slide-right-btn'),
                slideGrid: document.getElementById('slide-grid'),
                slideAssetsList: document.getElementById('slide-assets-list'),
                addAssetsBtn: document.getElementById('add-assets-btn'),
                deleteSlideBtn: document.getElementById('delete-slide-btn'),
                slideControls: document.getElementById('slide-controls'),
                selectedLabel: document.getElementById('selected-slide-label'),
                assetThumbnails: document.getElementById('asset-thumbnails'),
                editorLabel: document.getElementById('session-editor-label'),
                fileTableBody: document.getElementById('file-table-body')
            };

            // Session state
            this.currentSessionId = config.sessionId;
            this.currentSessionStatus = config.sessionStatus;
            
            // Slide state
            this.currentFocusedSlideId = null;
            this.lastMaxSlideId = null;
            this.slidesCache = [];
            this.ensuredInitialSlides = false;

            console.log('[SessionEditor] Initialized with sessionId:', this.currentSessionId, 'status:', this.currentSessionStatus);
        }

        // Helper: check if editing is allowed
        isEditingAllowed() {
            return window.FacilitatorHelpers.isEditingAllowed(window.currentSessionStatus);
        }

        // Helper: check if slide is first
        isFirstSlide(slideId) {
            return window.FacilitatorHelpers.isFirstSlide(this.slidesCache, slideId);
        }

        // Helper: check if slide is last
        isLastSlide(slideId) {
            return window.FacilitatorHelpers.isLastSlide(this.slidesCache, slideId);
        }

        // Helper: check if slide is editable
        isSlideEditable(slideId) {
            return window.FacilitatorHelpers.isSlideEditable(this.slidesCache, window.currentSessionStatus, slideId);
        }

        // Helper: get socket layer
        getSocketLayer() {
            if (window.facilitatorSocketLayer) {
                return window.facilitatorSocketLayer;
            }
            return null;
        }

        // Update arrow button states based on current selection
        updateArrowButtonStates() {
            const { slideLeftBtn, slideRightBtn } = this.elements;
            if (!slideLeftBtn || !slideRightBtn) return;
            
            let leftDisabled = true;
            let rightDisabled = true;
            
            if (this.currentFocusedSlideId !== null && this.isEditingAllowed()) {
                if (this.isFirstSlide(this.currentFocusedSlideId) || this.isLastSlide(this.currentFocusedSlideId)) {
                    leftDisabled = true;
                    rightDisabled = true;
                } else {
                    const currentIndex = this.slidesCache.findIndex(s => s.slideId === this.currentFocusedSlideId);
                    leftDisabled = currentIndex <= 1;
                    rightDisabled = currentIndex >= this.slidesCache.length - 2;
                }
            }
            
            slideLeftBtn.disabled = leftDisabled;
            slideRightBtn.disabled = rightDisabled;
            slideLeftBtn.classList.toggle('button--disabled', leftDisabled);
            slideRightBtn.classList.toggle('button--disabled', rightDisabled);
        }

        // Refresh controls for currently focused slide
        refreshControlsForCurrentSlide() {
            const { addAssetsBtn, deleteSlideBtn } = this.elements;
            const canEdit = this.isSlideEditable(this.currentFocusedSlideId);
            
            [addAssetsBtn, deleteSlideBtn].forEach(btn => {
                if (!btn) return;
                btn.disabled = !canEdit;
                btn.classList.toggle('button--disabled', !canEdit);
            });
            this.updateArrowButtonStates();
        }

        // Update editor label based on session status
        updateEditorLabel() {
            if (this.elements.editorLabel) {
                if (window.currentSessionStatus === 'active') {
                    this.elements.editorLabel.textContent = 'Session Controller';
                } else {
                    this.elements.editorLabel.textContent = 'Session Editor';
                }
            }
        }

        // Initialize the editor
        init() {
            console.log('[SessionEditor] Starting initialization');
            this.updateEditorLabel();
            this.setupEventHandlers();
            console.log('[SessionEditor] Initialization complete');
        }

        // Setup all button event handlers
        setupEventHandlers() {
            this.setupNewSlideButton();
            this.setupAddAssetsButton();
            this.setupDeleteSlideButton();
            this.setupMoveLeftButton();
            this.setupMoveRightButton();
        }

        // Setup new slide button
        setupNewSlideButton() {
            const { newSlideBtn } = this.elements;
            if (!newSlideBtn) return;

            newSlideBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const socketLayer = this.getSocketLayer();
                if (!socketLayer || !socketLayer.socket) {
                    console.error('❌ Socket layer not available');
                    alert('Socket connection not available. Please reload the page.');
                    return;
                }
                
                // Determine insertion point: after beginning and before end
                const emitData = { sessionId: this.currentSessionId };
                console.log('[insertSlide] slidesCache:', this.slidesCache.map(s => s.slideId));
                console.log('[insertSlide] currentFocusedSlideId:', this.currentFocusedSlideId);
                
                if (this.slidesCache.length >= 2) {
                    const firstId = this.slidesCache[0].slideId;
                    const lastId = this.slidesCache[this.slidesCache.length - 1].slideId;
                    console.log('[insertSlide] firstId:', firstId, 'lastId:', lastId);
                    
                    if (this.currentFocusedSlideId === null) {
                        emitData.afterSlideId = firstId; // default after first
                    } else if (this.currentFocusedSlideId === lastId) {
                        // Insert before end => after the one before last
                        const beforeLast = this.slidesCache[this.slidesCache.length - 2].slideId;
                        emitData.afterSlideId = beforeLast;
                    } else {
                        emitData.afterSlideId = this.currentFocusedSlideId;
                    }
                }
                
                console.log('📤 Emitting insertSlide:', emitData);
                socketLayer.socket.emit('insertSlide', emitData);
            });
        }

        // Setup add assets button
        setupAddAssetsButton() {
            const { addAssetsBtn, slideAssetsList, assetThumbnails } = this.elements;
            if (!addAssetsBtn) return;

            addAssetsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.isSlideEditable(this.currentFocusedSlideId)) {
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Cannot edit first or last slide', 'error', 3000);
                    }
                    return;
                }
                const selectedCheckboxes = document.querySelectorAll('.select-file:checked');
                
                if (selectedCheckboxes.length === 0) {
                    alert('Please select at least one asset from the file list.');
                    return;
                }
                
                // Get existing asset names from the list
                const existingItems = Array.from(slideAssetsList.querySelectorAll('li')).map(li => li.textContent.replace('remove', '').trim());
                const existingAssets = new Set(existingItems);
                const currentAssetCount = existingItems.length;
                const MAX_ASSETS_PER_SLIDE = 5;
                
                // Gather asset information, filtering out duplicates
                const assetList = [];
                const duplicates = [];
                selectedCheckboxes.forEach(checkbox => {
                    const row = checkbox.closest('tr');
                    if (row) {
                        const nameCell = row.querySelector('td:nth-child(3)');
                        if (nameCell) {
                            const name = nameCell.textContent.trim();
                            if (existingAssets.has(name)) {
                                duplicates.push(name);
                            } else {
                                assetList.push(name);
                                existingAssets.add(name);
                            }
                        }
                    }
                });
                
                // Check if adding new assets would exceed the limit
                if (currentAssetCount + assetList.length > MAX_ASSETS_PER_SLIDE) {
                    const allowedCount = MAX_ASSETS_PER_SLIDE - currentAssetCount;
                    if (typeof window.addFlashMessage === 'function') {
                        window.addFlashMessage(`Maximum ${MAX_ASSETS_PER_SLIDE} assets per slide. You can only add ${allowedCount} more asset(s).`, 'error', 5000);
                    } else {
                        alert(`Maximum ${MAX_ASSETS_PER_SLIDE} assets per slide. You can only add ${allowedCount} more asset(s).`);
                    }
                    selectedCheckboxes.forEach(cb => cb.checked = false);
                    return;
                }
                
                // Show warning if there are duplicates
                if (duplicates.length > 0) {
                    if (typeof window.addFlashMessage === 'function') {
                        window.addFlashMessage(`These assets already exist in this slide and were skipped: ${duplicates.join(', ')}`, 'warning', 5000);
                    } else {
                        alert(`The following assets already exist in this slide and were skipped:\n\n${duplicates.join('\n')}`);
                    }
                    
                    // Remove manual previews for duplicate assets
                    duplicates.forEach(assetName => {
                        const preview = assetThumbnails.querySelector(`[data-manual-preview="true"][data-asset-name="${assetName}"]`);
                        if (preview) {
                            preview.remove();
                            console.log('[addAssets] Removed preview for duplicate asset:', assetName);
                        }
                    });
                }
                
                // Only proceed if there are new assets to add
                if (assetList.length === 0) {
                    selectedCheckboxes.forEach(cb => cb.checked = false);
                    return;
                }
                
                // Build updated assets string
                const existingText = Array.from(slideAssetsList.querySelectorAll('li')).map(li => li.textContent.replace('remove', '').trim()).filter(t => t).join('\n');
                const newText = existingText 
                    ? existingText + '\n' + assetList.join('\n')
                    : assetList.join('\n');
                
                // Update the list display and database
                this.renderAssetsList(newText);
                
                // Remove manual previews for assets that were just added
                assetList.forEach(assetName => {
                    const preview = assetThumbnails.querySelector(`[data-manual-preview="true"][data-asset-name="${assetName}"]`);
                    if (preview) {
                        preview.remove();
                        console.log('[addAssets] Removed preview for added asset:', assetName);
                    }
                });
                
                // Uncheck the selected assets
                selectedCheckboxes.forEach(cb => cb.checked = false);
                
                // Save the updated details to database
                if (this.currentFocusedSlideId !== null) {
                    const socketLayer = this.getSocketLayer();
                    if (socketLayer && socketLayer.socket) {
                        socketLayer.socket.emit('updateSlideDetails', {
                            sessionId: this.currentSessionId,
                            slideId: this.currentFocusedSlideId,
                            details: newText
                        });
                    }
                }
            });
        }

        // Setup delete slide button
        setupDeleteSlideButton() {
            const { deleteSlideBtn, slideControls } = this.elements;
            if (!deleteSlideBtn) return;

            deleteSlideBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isFirstSlide(this.currentFocusedSlideId) || this.isLastSlide(this.currentFocusedSlideId)) {
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Cannot delete the first or last slide', 'error', 3000);
                    }
                    return;
                }
                if (this.currentFocusedSlideId === null) {
                    alert('No slide selected');
                    return;
                }
                
                if (!confirm('Delete this slide?')) return;
                
                const socketLayer = this.getSocketLayer();
                if (!socketLayer || !socketLayer.socket) {
                    alert('Socket connection not available');
                    return;
                }
                
                socketLayer.socket.emit('deleteSlide', {
                    sessionId: this.currentSessionId,
                    slideId: this.currentFocusedSlideId
                });
                
                // Hide controls
                if (slideControls) slideControls.style.display = 'none'; // Keep display toggle as inline
                this.currentFocusedSlideId = null;
            });
        }

        // Setup move left button
        setupMoveLeftButton() {
            const { slideLeftBtn } = this.elements;
            if (!slideLeftBtn) return;

            slideLeftBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.currentFocusedSlideId === null) {
                    if (window.addFlashMessage) {
                        window.addFlashMessage('No slide selected', 'error', 3000);
                    }
                    return;
                }
                
                // Cannot move first or last slide
                if (this.isFirstSlide(this.currentFocusedSlideId) || this.isLastSlide(this.currentFocusedSlideId)) {
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Cannot move the first or last slide', 'error', 3000);
                    }
                    return;
                }
                
                // Find current slide index
                const currentIndex = this.slidesCache.findIndex(s => s.slideId === this.currentFocusedSlideId);
                // Cannot move if at index 0 (B), index 1 (first after B), or beyond
                if (currentIndex <= 1) {
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Cannot move slide further left', 'error', 3000);
                    }
                    return;
                }
                
                // Swap with previous slide
                [this.slidesCache[currentIndex - 1], this.slidesCache[currentIndex]] = [this.slidesCache[currentIndex], this.slidesCache[currentIndex - 1]];
                
                // Refresh UI immediately
                this.renderSlidesFromDB(this.slidesCache, this.currentFocusedSlideId);
                this.updateArrowButtonStates();
                
                const socketLayer = this.getSocketLayer();
                if (!socketLayer || !socketLayer.socket) {
                    alert('Socket connection not available');
                    return;
                }
                
                socketLayer.socket.emit('reorderSlides', {
                    sessionId: this.currentSessionId,
                    slides: this.slidesCache
                });
            });
        }

        // Setup move right button
        setupMoveRightButton() {
            const { slideRightBtn } = this.elements;
            if (!slideRightBtn) return;

            slideRightBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.currentFocusedSlideId === null) {
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Cannot move slide further right', 'error', 3000);
                    }
                    return;
                }
                
                // Cannot move first or last slide
                if (this.isFirstSlide(this.currentFocusedSlideId) || this.isLastSlide(this.currentFocusedSlideId)) {
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Cannot move the first or last slide', 'error', 3000);
                    }
                    return;
                }
                
                // Find current slide index
                const currentIndex = this.slidesCache.findIndex(s => s.slideId === this.currentFocusedSlideId);
                // Cannot move if at last index (E), second-to-last (immediately before E), or beyond
                if (currentIndex >= this.slidesCache.length - 2) {
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Cannot move slide further right', 'error', 3000);
                    }
                    return;
                }
                
                // Swap with next slide
                [this.slidesCache[currentIndex], this.slidesCache[currentIndex + 1]] = [this.slidesCache[currentIndex + 1], this.slidesCache[currentIndex]];
                
                // Refresh UI immediately
                this.renderSlidesFromDB(this.slidesCache, this.currentFocusedSlideId);
                this.updateArrowButtonStates();
                
                const socketLayer = this.getSocketLayer();
                if (!socketLayer || !socketLayer.socket) {
                    alert('Socket connection not available');
                    return;
                }
                
                socketLayer.socket.emit('reorderSlides', {
                    sessionId: this.currentSessionId,
                    slides: this.slidesCache
                });
            });
        }

        // Render asset thumbnails in the preview area
        renderAssetThumbnails(assetsText) {
            const { assetThumbnails, slideAssetsList } = this.elements;
            
            // Save manually-added previews before clearing
            const manualPreviews = Array.from(assetThumbnails.querySelectorAll('[data-manual-preview="true"]'));
            
            assetThumbnails.innerHTML = '';
            
            // Re-add manual previews
            manualPreviews.forEach(preview => {
                assetThumbnails.appendChild(preview);
            });
            
            if (!assetsText || assetsText.trim() === '') {
                return;
            }
            
            const assets = assetsText.trim().split('\n').map(a => a.trim()).filter(a => a);
            
            // Helper to find asset URL with retry logic
            const findAssetUrl = (assetName, retries = 0) => {
                const fileRows = document.querySelectorAll('#file-table-body tr');
                let assetUrl = null;
                
                fileRows.forEach(row => {
                    const nameCell = row.querySelector('td:nth-child(3)');
                    if (nameCell && nameCell.textContent.trim() === assetName) {
                        const fileData = row.dataset.url;
                        assetUrl = fileData;
                    }
                });
                
                // If not found and we have retries left, try again after a short delay
                if (!assetUrl && retries < 2) {
                    setTimeout(() => {
                        const foundUrl = findAssetUrl(assetName, retries + 1);
                        if (foundUrl) {
                            // Update the thumbnail's image if we find it
                            const thumb = assetThumbnails.querySelector(`[title="${assetName}"]`);
                            if (thumb) {
                                const imgWrapper = thumb.querySelector('div');
                                if (imgWrapper && !imgWrapper.querySelector('img')) {
                                    const img = document.createElement('img');
                                    img.className = 'asset-thumbnail__image';
                                    img.src = foundUrl;
                                    img.onerror = () => {
                                        imgWrapper.textContent = '📄';
                                        imgWrapper.classList.add('asset-thumbnail__placeholder');
                                    };
                                    imgWrapper.innerHTML = '';
                                    imgWrapper.appendChild(img);
                                }
                            }
                        }
                    }, 300);
                }
                
                return assetUrl;
            };
            
            assets.forEach(assetName => {
                const assetUrl = findAssetUrl(assetName);
                
                const thumb = document.createElement('div');
                thumb.className = 'asset-thumbnail';
                thumb.setAttribute('data-asset-name', assetName);
                thumb.title = assetName;
                
                // Create wrapper for image content
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'asset-thumbnail__wrapper';
                
                if (assetUrl) {
                    const img = document.createElement('img');
                    img.className = 'asset-thumbnail__image';
                    img.src = assetUrl;
                    img.onerror = () => {
                        imgWrapper.textContent = '📄';
                        imgWrapper.classList.add('asset-thumbnail__placeholder');
                    };
                    imgWrapper.appendChild(img);
                } else {
                    imgWrapper.textContent = '📄';
                    imgWrapper.classList.add('asset-thumbnail__placeholder');
                }
                
                thumb.appendChild(imgWrapper);
                
                // Add close button for pending sessions
                if (this.isEditingAllowed()) {
                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'asset-thumbnail__close';
                    closeBtn.textContent = '✕';

                    let hoverTimer = null;
                    let isHoverVisible = false;

                    const handleCloseBtnClick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (!isHoverVisible) return;
                        if (!this.isSlideEditable(this.currentFocusedSlideId)) {
                            if (window.addFlashMessage) {
                                window.addFlashMessage('Cannot edit first or last slide', 'error', 3000);
                            }
                            return;
                        }
                        if (!this.isEditingAllowed()) {
                            if (window.addFlashMessage) {
                                window.addFlashMessage('Cannot edit slides in non-pending sessions', 'error', 3000);
                            }
                            return;
                        }
                        if (!confirm(`Are you sure you want to remove this asset? "${assetName}"`)) return;

                        const currentAssets = assetsText.trim().split('\n').map(a => a.trim()).filter(a => a);
                        const updatedAssets = currentAssets.filter(a => a !== assetName).join('\n');
                        this.renderAssetsList(updatedAssets);

                        if (this.currentFocusedSlideId !== null) {
                            const socketLayer = this.getSocketLayer();
                            if (socketLayer && socketLayer.socket) {
                                socketLayer.socket.emit('updateSlideDetails', {
                                    sessionId: this.currentSessionId,
                                    slideId: this.currentFocusedSlideId,
                                    details: updatedAssets
                                });
                            }
                        }

                        if (typeof window.addFlashMessage === 'function') {
                            window.addFlashMessage(`Removed asset "${assetName}" from slide`, 'warning', 4000);
                        }
                    };

                    closeBtn.addEventListener('click', handleCloseBtnClick, true);
                    thumb.appendChild(closeBtn);
                    
                    thumb.addEventListener('click', (e) => {
                        if (e.target === closeBtn || closeBtn.contains(e.target)) return;
                        if (isHoverVisible && this.isSlideEditable(this.currentFocusedSlideId)) {
                            handleCloseBtnClick(e);
                        }
                    });

                    thumb.addEventListener('mouseenter', () => {
                        const assetNameSpan = slideAssetsList.querySelector(`.asset-name[data-asset-name="${assetName}"]`);
                        if (assetNameSpan) assetNameSpan.classList.add('asset-list-item__name--bold');
                        
                        hoverTimer = setTimeout(() => {
                            closeBtn.classList.add('asset-thumbnail__close--visible');
                            isHoverVisible = true;
                        }, 1000);
                    });

                    thumb.addEventListener('mouseleave', (e) => {
                        const toEl = e.relatedTarget;
                        if (toEl && (toEl === closeBtn || (thumb.contains(toEl) && toEl !== thumb))) return;
                        
                        const assetNameSpan = slideAssetsList.querySelector(`.asset-name[data-asset-name="${assetName}"]`);
                        if (assetNameSpan) assetNameSpan.classList.remove('asset-list-item__name--bold');
                        
                        if (hoverTimer) clearTimeout(hoverTimer);
                        isHoverVisible = false;
                        closeBtn.classList.remove('asset-thumbnail__close--visible');
                    });

                    closeBtn.addEventListener('mouseenter', () => {
                        if (hoverTimer) clearTimeout(hoverTimer);
                        isHoverVisible = true;
                        closeBtn.classList.add('asset-thumbnail__close--visible');
                    });
                    
                    closeBtn.addEventListener('mouseleave', (e) => {
                        const toEl = e.relatedTarget;
                        if (toEl && thumb.contains(toEl)) return;
                        isHoverVisible = false;
                        closeBtn.classList.remove('asset-thumbnail__close--visible');
                    });
                }
                
                assetThumbnails.appendChild(thumb);
            });
        }

        // Render assets list with remove functionality
        renderAssetsList(assetsText) {
            const { slideAssetsList, assetThumbnails } = this.elements;
            
            slideAssetsList.innerHTML = '';
            this.renderAssetThumbnails(assetsText);
            
            if (!assetsText || assetsText.trim() === '') return;
            
            const assets = assetsText.trim().split('\n').map(a => a.trim()).filter(a => a);
            
            assets.forEach(assetName => {
                const li = document.createElement('li');
                li.className = 'asset-list-item';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = assetName;
                nameSpan.className = 'asset-name asset-list-item__name';
                nameSpan.setAttribute('data-asset-name', assetName);
                
                nameSpan.addEventListener('mouseenter', () => {
                    const preview = assetThumbnails.querySelector(`[data-asset-name="${assetName}"]`);
                    if (preview) preview.classList.add('asset-thumbnail--highlighted');
                });
                
                nameSpan.addEventListener('mouseleave', () => {
                    const preview = assetThumbnails.querySelector(`[data-asset-name="${assetName}"]`);
                    if (preview) preview.classList.remove('asset-thumbnail--highlighted');
                });
                
                const removeLink = document.createElement('a');
                removeLink.textContent = 'remove';
                removeLink.href = '#';
                removeLink.className = 'asset-list-item__remove';
                
                removeLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!confirm(`Remove asset "${assetName}" from slide?`)) return;
                    if (!this.isSlideEditable(this.currentFocusedSlideId)) {
                        if (window.addFlashMessage) {
                            window.addFlashMessage('Cannot edit first or last slide', 'error', 3000);
                        }
                        return;
                    }
                    if (!this.isEditingAllowed()) {
                        if (window.addFlashMessage) {
                            window.addFlashMessage('Cannot edit slides in non-pending sessions', 'error', 3000);
                        }
                        return;
                    }
                    
                    const updatedAssets = assets.filter(a => a !== assetName).join('\n');
                    this.renderAssetsList(updatedAssets);
                    
                    if (this.currentFocusedSlideId !== null) {
                        const socketLayer = this.getSocketLayer();
                        if (socketLayer && socketLayer.socket) {
                            socketLayer.socket.emit('updateSlideDetails', {
                                sessionId: this.currentSessionId,
                                slideId: this.currentFocusedSlideId,
                                details: updatedAssets
                            });
                        }
                    }
                });
                
                li.appendChild(nameSpan);
                li.appendChild(removeLink);
                slideAssetsList.appendChild(li);
            });
        }

        // Render slides from database
        renderSlidesFromDB(slides, selectSlideId = null) {
            const { slideGrid } = this.elements;
            
            slideGrid.innerHTML = '';
            if (!slides || slides.length === 0) return;

            this.slidesCache = slides.slice();
            
            // Check localStorage for previously selected slide
            if (selectSlideId === null && this.currentSessionId) {
                const storedSlideId = localStorage.getItem(`selectedSlide_${this.currentSessionId}`);
                if (storedSlideId) {
                    selectSlideId = parseInt(storedSlideId, 10);
                }
            }
            
            // Default to slide 1 if no selection
            if (selectSlideId === null && slides.length > 0) {
                const firstSlide = slides.find(s => s.slideId === 1);
                if (firstSlide) selectSlideId = 1;
            }
            
            // Backward compatibility: assign displayNumber to slides without one
            slides.forEach((slide, index) => {
                if (index > 0 && index < slides.length - 1 && slide.displayNumber == null) {
                    let position = 0;
                    for (let i = 1; i < index; i++) position++;
                    slide._tempDisplayNumber = position + 1;
                }
            });
            
            slides.forEach((slide) => {
                const displayNum = slide.displayNumber != null ? slide.displayNumber : slide._tempDisplayNumber;
                const slideSquare = this.createSlideSquare(slide.slideId, slide.details, displayNum);
                slideGrid.appendChild(slideSquare);
                
                // Auto-select slide
                if (selectSlideId !== null && slide.slideId === selectSlideId) {
                    slideSquare.click();
                } else if (this.currentFocusedSlideId !== null && slide.slideId === this.currentFocusedSlideId) {
                    slideSquare.click();
                } else if (this.currentFocusedSlideId === null && this.isFirstSlide(slide.slideId)) {
                    slideSquare.click();
                }
            });
        }

        // Create a slide square element
        createSlideSquare(slideId, details, displayNumber) {
            const { slideControls, selectedLabel } = this.elements;
            
            const slideSquare = document.createElement('div');
            slideSquare.classList.add('slide-thumbnail');
            slideSquare.dataset.slideId = slideId;
            slideSquare.title = `Slide ${slideId}`;
            
            // Label slides
            if (this.isFirstSlide(slideId)) {
                slideSquare.textContent = 'B';
            } else if (this.isLastSlide(slideId)) {
                slideSquare.textContent = 'E';
            } else {
                slideSquare.textContent = displayNumber;
            }

            slideSquare.addEventListener('click', () => {
                this.currentFocusedSlideId = slideId;

                // Persist to localStorage
                if (this.currentSessionId) {
                    localStorage.setItem(`selectedSlide_${this.currentSessionId}`, slideId);
                }

                // Update UI focus
                document.querySelectorAll('.slide-thumbnail').forEach(slide => {
                    slide.classList.remove('slide-thumbnail--focused');
                });

                slideSquare.classList.add('slide-thumbnail--focused');

                // Show controls and load assets
                if (slideControls) {
                    slideControls.style.display = 'grid'; // Keep display toggle as inline
                    if (selectedLabel) selectedLabel.textContent = `Slide #${slideId}`;
                    this.renderAssetsList(details || '');
                    this.refreshControlsForCurrentSlide();
                }
                
                // In active sessions, send content to students
                if (window.currentSessionStatus === 'active') {
                    if (this.isFirstSlide(slideId)) {
                        const socketLayer = this.getSocketLayer();
                        if (socketLayer && socketLayer.socket) {
                            const sessionDetails = {
                                title: this.currentSessionId || 'Session',
                                numSlides: this.slidesCache.length,
                                organisation: '{{currentSession.organisation}}' || 'default',
                                facilitator: '{{facilitator}}' || 'Facilitator'
                            };
                            socketLayer.socket.emit('sendTemplatedContent', {
                                sessionId: this.currentSessionId,
                                content: 'beginning',
                                slideType: 'B',
                                details: sessionDetails
                            });
                            if (typeof window.addFlashMessage === 'function') {
                                window.addFlashMessage('Sent "Beginning" content to students', 'info', 2000);
                            }
                        }
                    } else if (this.isLastSlide(slideId)) {
                        const socketLayer = this.getSocketLayer();
                        if (socketLayer && socketLayer.socket) {
                            socketLayer.socket.emit('sendTemplatedContent', {
                                sessionId: this.currentSessionId,
                                content: 'end',
                                slideType: 'E'
                            });
                            if (typeof window.addFlashMessage === 'function') {
                                window.addFlashMessage('Sent "End" content to students', 'info', 2000);
                            }
                        }
                    } else if (details && details.trim()) {
                        // Auto-send assets to students
                        const assetNames = details.trim().split('\n').map(a => a.trim()).filter(a => a);
                        if (assetNames.length > 0) {
                            const fileRows = document.querySelectorAll('#file-table-body tr');
                            const assetsToSend = [];
                            
                            assetNames.forEach(assetName => {
                                fileRows.forEach(row => {
                                    const nameCell = row.querySelector('td:nth-child(3)');
                                    if (nameCell && nameCell.textContent.trim() === assetName) {
                                        const url = row.dataset.url;
                                        const mimetype = row.dataset.mimetype;
                                        const originalName = row.dataset.originalname;
                                        const size = row.dataset.size;
                                        const uploadedBy = row.dataset.uploadedby;
                                        if (url) {
                                            assetsToSend.push({
                                                url, mimetype, originalName: originalName || assetName, size, uploadedBy
                                            });
                                        }
                                    }
                                });
                            });
                        
                            if (assetsToSend.length > 0) {
                                const socketLayer = this.getSocketLayer();
                                if (socketLayer && socketLayer.sendAssetsBatch) {
                                    socketLayer.sendAssetsBatch(assetsToSend);
                                    if (typeof window.addFlashMessage === 'function') {
                                        window.addFlashMessage(`Sent ${assetsToSend.length} asset(s) to students`, 'info', 2000);
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return slideSquare;
        }
    }

    // Export to global
    global.SessionEditor = SessionEditor;
})(window);
