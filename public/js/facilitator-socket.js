// public/js/facilitator-socket.js
export class FacilitatorSocket {
    constructor(sessionId, username) {
        this.sessionId = sessionId;
        this.username = username;
        this.socket = io();
        this.registerEvents();
    }

    registerEvents() {
        this.socket.on("connect", () => {
            console.log(`⚡ Connected as facilitator: ${this.username}`);

            this.socket.emit("joinSession", {
                sessionId: this.sessionId,
                role: "facilitator",
                username: this.username
            });
        });

        //
        // 🔵 STUDENT EVENTS
        //
        this.socket.on("studentJoined", (data) => {
            document.dispatchEvent(new CustomEvent("studentJoined", {
                detail: data
            }));
        });

        this.socket.on("studentLeft", (data) => {
            document.dispatchEvent(new CustomEvent("studentLeft", {
                detail: data
            }));
        });

        this.socket.on("studentListUpdated", (students) => {
            document.dispatchEvent(
                new CustomEvent("studentListUpdated", {
                    detail: students
                })
            );
        });

        //
        // 🔵 FULL SESSION SNAPSHOT (page reload support)
        //
        this.socket.on("sessionState", (session) => {
            document.dispatchEvent(
                new CustomEvent("sessionState", {
                    detail: session
                })
            );
        });

        //
        // 🔵 STUDENT ACTIVITY
        //
        this.socket.on("studentActive", (data) => {
            document.dispatchEvent(
                new CustomEvent("studentActive", {
                    detail: data
                })
            );
        });

        //
        // 🔵 SESSION RESET
        //
        this.socket.on("sessionReset", () => {
            document.dispatchEvent(new CustomEvent("sessionReset"));
        });

        //
        // 🔵 ERRORS
        this.socket.on("errorMessage", (msg) => {
            document.dispatchEvent(new CustomEvent("socketError", {
                detail: msg
            }));
        });

        // 🔵 SESSION LOCKED (archived)
        this.socket.on("sessionLocked", (payload) => {
            console.log('[FacilitatorSocket] sessionLocked received from server:', payload);
            document.dispatchEvent(new CustomEvent("sessionLocked", {
                detail: payload
            }));
        });
    }

    //
    // 🟣 OUTGOING COMMANDS
    //
    sendAsset(asset) {
        this.socket.emit("sendAsset", {
            sessionId: this.sessionId,
            username: this.username,
            asset
        });
    }

    sendAssetsBatch(assets) {
        if (!Array.isArray(assets) || assets.length === 0) return;
        this.socket.emit("sendAssetBatch", {
            sessionId: this.sessionId,
            username: this.username,
            assets
        });
    }

    resetSession() {
        if (confirm("This will reset the session for all participants. Continue?")) {
            this.socket.emit("resetSession", {
                sessionId: this.sessionId
            });
        }
    }

    removeStudent(username) {
        if (!username) return;
        if (!confirm(`Remove ${username} from this session?`)) return;
        this.socket.emit("removeStudent", { sessionId: this.sessionId, username });
    }


    blankSession() {
        console.log('[FacilitatorSocket] blankSession() called');
        // Check if session is archived by reading the selected option
        const sessionSelect = document.getElementById('session-select');
        const selectedOption = sessionSelect && sessionSelect.options[sessionSelect.selectedIndex];
        const isArchived = selectedOption && (selectedOption.getAttribute('data-archived') === 'true');
        
        console.log('[FacilitatorSocket] Archived check:', { 
            hasSelect: !!sessionSelect, 
            hasOption: !!selectedOption, 
            archivedAttr: selectedOption ? selectedOption.getAttribute('data-archived') : null,
            isArchived 
        });
        
        if (isArchived) {
            console.log('[FacilitatorSocket] Session is archived, dispatching sessionLocked event');
            const event = new CustomEvent('sessionLocked', {
                detail: { sessionId: this.sessionId, message: 'Session is archived and cannot be modified.' }
            });
            console.log('[FacilitatorSocket] Event created:', event);
            document.dispatchEvent(event);
            console.log('[FacilitatorSocket] Event dispatched');
            return;
        }
        
        if (confirm("Blank the session for all students? This will remove all assets from their view.")) {
            console.log('[FacilitatorSocket] User confirmed, emitting blankSession event');
            this.socket.emit("blankSession", {
                sessionId: this.sessionId,
                username: this.username
            });
        } else {
            console.log('[FacilitatorSocket] User cancelled blank session');
        }
    }
}
