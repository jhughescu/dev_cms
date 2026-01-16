// Facilitator session selector handlers
// Extracted from inline facilitator.hbs script block

(function(global) {
    function initFormStatusHandlers() {
        const activateForm = document.getElementById('activate-form');
        const archiveForm = document.getElementById('archive-form');
        const unarchiveForm = document.getElementById('unarchive-form');
        
        if (activateForm) {
            activateForm.addEventListener('submit', () => {
                setTimeout(() => {
                    // Update global status (used by Session Editor IIFE)
                    if (global.currentSessionStatus !== undefined) {
                        global.currentSessionStatus = 'active';
                    }
                    if (typeof global.updateEditorLabel === 'function') {
                        global.updateEditorLabel();
                    }
                }, 100);
            });
        }
        
        if (archiveForm) {
            archiveForm.addEventListener('submit', () => {
                setTimeout(() => {
                    if (global.currentSessionStatus !== undefined) {
                        global.currentSessionStatus = 'archived';
                    }
                    if (typeof global.updateEditorLabel === 'function') {
                        global.updateEditorLabel();
                    }
                }, 100);
            });
        }
        
        if (unarchiveForm) {
            unarchiveForm.addEventListener('submit', () => {
                setTimeout(() => {
                    if (global.currentSessionStatus !== undefined) {
                        global.currentSessionStatus = 'pending';
                    }
                    if (typeof global.updateEditorLabel === 'function') {
                        global.updateEditorLabel();
                    }
                }, 100);
            });
        }
    }

    function initSessionSelector() {
        const select = document.getElementById('session-select');
        const activateForm = document.getElementById('activate-form');
        const archiveForm = document.getElementById('archive-form');
        const unarchiveForm = document.getElementById('unarchive-form');
        const deleteForm = document.getElementById('delete-form');
        const exportBtn = document.getElementById('export-csv-btn');
        const activateBtn = document.getElementById('activate-btn');
        const archiveBtn = document.getElementById('archive-btn');
        const unarchiveBtn = document.getElementById('unarchive-btn');
        const deleteBtn = document.getElementById('delete-btn');
        const sessionEditorContainer = document.getElementById('session-editor-container');

        function updateFormsFor(sessionId, status, archived) {
            if (activateForm) activateForm.action = `/sessions/${encodeURIComponent(sessionId)}/activate`;
            if (archiveForm) archiveForm.action = `/sessions/${encodeURIComponent(sessionId)}/archive`;
            if (unarchiveForm) unarchiveForm.action = `/sessions/${encodeURIComponent(sessionId)}/unarchive`;
            if (deleteForm) deleteForm.action = `/sessions/${encodeURIComponent(sessionId)}/delete`;
            if (exportBtn) exportBtn.onclick = () => { window.location.href = `/sessions/${encodeURIComponent(sessionId)}/export.csv`; };
            
            // Use status if available, otherwise fall back to archived flag
            const sessionStatus = status || (archived === 'true' || archived === true ? 'archived' : 'active');
            
            // Always show Session Editor, but disable editing for non-pending sessions
            if (sessionEditorContainer) {
                sessionEditorContainer.style.display = 'flex'; // Keep display toggle as inline
                
                // Get editing controls
                const newSlideBtn = document.getElementById('new-slide-btn');
                const addAssetsBtn = document.getElementById('add-assets-btn');
                const deleteSlideBtn = document.getElementById('delete-slide-btn');
                
                const isPending = sessionStatus === 'pending';
                
                // Enable/disable buttons based on status
                if (newSlideBtn) {
                    newSlideBtn.disabled = !isPending;
                    newSlideBtn.classList.toggle('button--disabled', !isPending);
                }
                if (addAssetsBtn) {
                    addAssetsBtn.disabled = !isPending;
                    addAssetsBtn.classList.toggle('button--disabled', !isPending);
                }
                if (deleteSlideBtn) {
                    deleteSlideBtn.disabled = !isPending;
                    deleteSlideBtn.classList.toggle('button--disabled', !isPending);
                }
            }
            
            // Show/hide buttons based on status
            if (sessionStatus === 'pending') {
                if (activateBtn) activateBtn.classList.remove('button--hidden');
                if (archiveBtn) archiveBtn.classList.remove('button--hidden');
                if (unarchiveBtn) unarchiveBtn.classList.add('button--hidden');
                if (deleteBtn) deleteBtn.classList.remove('button--hidden');
            } else if (sessionStatus === 'active') {
                if (activateBtn) activateBtn.classList.add('button--hidden');
                if (archiveBtn) archiveBtn.classList.remove('button--hidden');
                if (unarchiveBtn) unarchiveBtn.classList.add('button--hidden');
                if (deleteBtn) deleteBtn.classList.remove('button--hidden');
            } else if (sessionStatus === 'archived') {
                if (activateBtn) activateBtn.classList.add('button--hidden');
                if (archiveBtn) archiveBtn.classList.add('button--hidden');
                if (unarchiveBtn) unarchiveBtn.classList.remove('button--hidden');
                if (deleteBtn) deleteBtn.classList.remove('button--hidden');
            }

            // Gray out controls when not active
            const sendBtn = document.getElementById('send-selected-btn');
            const blankBtn = document.getElementById('blank-session-btn');
            const fileCheckboxes = document.querySelectorAll('.select-file');
            const isNotActive = sessionStatus !== 'active';
            
            if (isNotActive) {
                if (sendBtn) sendBtn.classList.add('button--disabled');
                if (blankBtn) blankBtn.classList.add('button--disabled');
                if (fileCheckboxes && fileCheckboxes.length) {
                    fileCheckboxes.forEach(cb => { 
                        cb.disabled = true;
                    });
                }
            } else {
                if (sendBtn) sendBtn.classList.remove('button--disabled');
                if (blankBtn) blankBtn.classList.remove('button--disabled');
                if (fileCheckboxes && fileCheckboxes.length) {
                    fileCheckboxes.forEach(cb => { 
                        cb.disabled = false;
                    });
                }
            }

            // Update status message
            const statusEl = document.getElementById('status');
            if (statusEl) {
                if (sessionStatus === 'archived') {
                    statusEl.textContent = 'This session is archived — updates are disabled.';
                } else if (sessionStatus === 'pending') {
                    statusEl.textContent = 'This session is pending — click Activate to enable student access and file sending.';
                } else {
                    statusEl.textContent = '';
                }
            }
        }

        if (select) {
            select.addEventListener('change', (e) => {
                const sid = e.target.value;
                console.log('[facilitator.hbs] Session dropdown changed to:', sid);
                const optStatus = e.target.options[e.target.selectedIndex].getAttribute('data-status');
                const archived = e.target.options[e.target.selectedIndex].getAttribute('data-archived');
                // update forms so activate/archive/unarchive target the chosen session
                updateFormsFor(sid, optStatus, archived);
                
                // Also update the location
                const url = new URL(window.location);
                url.searchParams.set('sessionId', sid);
                console.log('[facilitator.hbs] Redirecting to:', url.toString());
                window.location.href = url.toString();
            });

            // initialize buttons for the currently selected option
            const opt = select.options[select.selectedIndex];
            if (opt) updateFormsFor(opt.value, opt.getAttribute('data-status'), opt.getAttribute('data-archived'));
        } else {
            // No session select dropdown - hide Session Editor by default
            const sessionEditorContainer = document.getElementById('session-editor-container');
            if (sessionEditorContainer) {
                sessionEditorContainer.style.display = 'none'; // Keep display toggle as inline
            }
        }
    }

    // Export for initialization
    global.FacilitatorSessionSelector = {
        init: initSessionSelector,
        initFormHandlers: initFormStatusHandlers
    };
})(window);
