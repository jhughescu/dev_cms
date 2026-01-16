// Facilitator share/QR/password handlers
// Extracted from inline facilitator.hbs script block

(function(global) {
    function initShareHandlers(context) {
        // Copy share link handler (student-facing URL)
        const copyBtn = document.getElementById('copy-share-link-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const baseUrl = window.location.origin;
                const org = context.organisation || 'default';
                const sid = document.getElementById('session-select')?.value || context.sessionId;
                const shareUrl = `${baseUrl}/${org}/${sid}`;
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Share link copied!', 'success', 3000);
                    } else {
                        alert('Share link copied');
                    }
                } catch (err) {
                    console.error('Failed to copy share link:', err);
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Failed to copy share link', 'error', 4000);
                    } else {
                        alert('Failed to copy share link');
                    }
                }
            });
        }

        // Show QR code handler
        const qrBtn = document.getElementById('show-qr-btn');
        if (qrBtn) {
            qrBtn.addEventListener('click', () => {
                const sid = document.getElementById('session-select')?.value || context.sessionId;
                const qrUrl = `/session/${encodeURIComponent(sid)}/qr`;
                window.open(qrUrl, 'QR Code', 'width=400,height=500,resizable=yes,scrollbars=yes');
            });
        }

        // Copy password handler
        const copyPasswordBtn = document.getElementById('copy-password-btn');
        if (copyPasswordBtn) {
            copyPasswordBtn.addEventListener('click', async () => {
                const password = context.sessionPassword;
                if (!password) {
                    alert('No password available for this session');
                    return;
                }
                try {
                    await navigator.clipboard.writeText(password);
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Password copied to clipboard!', 'success', 3000);
                    } else {
                        alert('Password copied to clipboard');
                    }
                } catch (err) {
                    console.error('Failed to copy password:', err);
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Failed to copy password', 'error', 4000);
                    } else {
                        alert('Failed to copy password');
                    }
                }
            });
        }

        // Copy simple URL handler
        const copySimpleUrlBtn = document.getElementById('copy-simple-url-btn');
        if (copySimpleUrlBtn) {
            copySimpleUrlBtn.addEventListener('click', async () => {
                const baseUrl = window.location.origin;
                const org = context.organisation || 'default';
                const sid = context.sessionId;
                const simpleUrl = `${baseUrl}/${org}/${sid}`;
                try {
                    await navigator.clipboard.writeText(simpleUrl);
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Simple URL copied to clipboard!', 'success', 3000);
                    } else {
                        alert('Simple URL copied to clipboard');
                    }
                } catch (err) {
                    console.error('Failed to copy simple URL:', err);
                    if (window.addFlashMessage) {
                        window.addFlashMessage('Failed to copy simple URL', 'error', 4000);
                    } else {
                        alert('Failed to copy simple URL');
                    }
                }
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (global.__FACILITATOR_CONTEXT__) {
                initShareHandlers(global.__FACILITATOR_CONTEXT__);
            }
        });
    } else {
        // DOM already loaded
        if (global.__FACILITATOR_CONTEXT__) {
            initShareHandlers(global.__FACILITATOR_CONTEXT__);
        }
    }
})(window);
