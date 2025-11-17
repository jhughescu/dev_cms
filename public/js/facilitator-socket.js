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
                type: "facilitator",
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
        //
        this.socket.on("errorMessage", (msg) => {
            document.dispatchEvent(new CustomEvent("socketError", {
                detail: msg
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

    resetSession() {
        if (confirm("This will reset the session for all participants. Continue?")) {
            this.socket.emit("resetSession", {
                sessionId: this.sessionId
            });
        }
    }
}
