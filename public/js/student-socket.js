// public/js/student-socket.js
export class StudentSocket {
    constructor(sessionId, username) {
        this.sessionId = sessionId;
        this.username = username;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.connect();
    }

    connect() {
        this.socket = io({
            reconnection: false // we'll handle it manually
        });

        this.socket.on("connect", () => {
            console.log("⚡ Connected to server:", this.socket.id);
            this.reconnectAttempts = 0;
            this.joinSession();
        });

        this.socket.on("disconnect", (reason) => {
            console.warn("⚡ Disconnected:", reason);
            this.tryReconnect();
        });

        this.socket.on("sessionState", (session) => {
            console.log("📄 Received full session state:", session);
            document.dispatchEvent(new CustomEvent("sessionStateReceived", { detail: session }));
        });
        console.log('connect stuff');
        this.socket.on("receiveAsset", (asset) => {
            console.log('rec', asset);
            document.dispatchEvent(new CustomEvent("assetReceived", { detail: asset }));
        });

        this.socket.on("errorMessage", (msg) => {
            alert(msg);
        });
        this.socket.on("sessionReset", () => {
            console.log("Session reset — returning to waiting state.");
            if (onSessionReset) onSessionReset();
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
            console.error("⚠️ Max reconnect attempts reached. Unable to reconnect.");
            return;
        }

        const delay = Math.min(5000, 500 * Math.pow(2, this.reconnectAttempts)); // exponential backoff
        console.log(`🔄 Attempting reconnect in ${delay}ms...`);
        setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnect attempt #${this.reconnectAttempts}`);
            this.connect();
        }, delay);
    }
}
