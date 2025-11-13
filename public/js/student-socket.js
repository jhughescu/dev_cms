// public/js/student-socket.js
export class StudentSocket {
    constructor(sessionId, username) {
        this.sessionId = sessionId;
        this.username = username;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.onSessionState = null;
        this.onReceiveAsset = null;
        this.onSessionReset = null;
        this.connect();
    }

    connect() {
        this.socket = io({
            reconnection: false
        }); // manual reconnection

        this.socket.on("connect", () => {
            console.log("⚡ Connected to server:", this.socket.id);
            this.reconnectAttempts = 0;
            this.joinSession();

            // Heartbeat ping every 30s
            this.pingInterval = setInterval(() => {
                if (this.socket && this.socket.connected) {
                    this.socket.emit("studentPing", {
                        sessionId: this.sessionId,
                        username: this.username
                    });
                }
            }, 30000);
        });

        this.socket.on("disconnect", (reason) => {
            console.warn("⚡ Disconnected:", reason);
            clearInterval(this.pingInterval);
            this.tryReconnect();
        });

        // --- Session state from server
        this.socket.on("sessionState", (session) => {
            console.log("📄 Received full session state:", session);

            // Fire callback if defined
            if (this.onSessionState) this.onSessionState(session);

            // Also dispatch global event for StudentSession/UI
            document.dispatchEvent(
                new CustomEvent("sessionStateReceived", {
                    detail: session
                })
            );
        });

        // --- Asset sent by facilitator
        this.socket.on("receiveAsset", (asset) => {
            console.log("📥 Asset received from facilitator:", asset);

            // Fire callback if defined
            if (this.onReceiveAsset) this.onReceiveAsset(asset);

            // Dispatch global event so StudentSession/UI can handle
            document.dispatchEvent(
                new CustomEvent("assetReceived", {
                    detail: asset
                })
            );
        });

        // --- Session reset
        this.socket.on("sessionReset", () => {
            console.log("🔄 Session reset — returning to waiting state.");
            this.assets = [];

            if (this.onSessionReset) this.onSessionReset();

            document.dispatchEvent(
                new CustomEvent("sessionStateReceived", {
                    detail: {
                        assets: []
                    }
                })
            );

            alert("The session has been reset by the facilitator.");
        });

        // --- Error handling
        this.socket.on("errorMessage", (msg) => {
            console.warn("⚠️ Server error:", msg);
        });
    }

    joinSession() {
        this.socket.emit("joinSession", {
            sessionId: this.sessionId,
            type: "student",
            username: this.username
        });
    }

    tryReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("⚠️ Max reconnect attempts reached.");
            return;
        }

        const delay = Math.min(5000, 500 * Math.pow(2, this.reconnectAttempts));
        console.log(`🔄 Reconnect attempt #${this.reconnectAttempts + 1} in ${delay}ms`);
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    sendMessage(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    // Optional callback API (for legacy or explicit wiring)
    setCallbacks({
        onSessionState,
        onReceiveAsset,
        onSessionReset
    } = {}) {
        if (onSessionState) this.onSessionState = onSessionState;
        if (onReceiveAsset) this.onReceiveAsset = onReceiveAsset;
        if (onSessionReset) this.onSessionReset = onSessionReset;
    }
}
