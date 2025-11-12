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

        this.socket.on("studentJoined", (data) => {
            console.log(`🧑‍🎓 ${data.username} joined`);
            document.dispatchEvent(new CustomEvent("studentJoined", { detail: data }));
        });

        this.socket.on("studentLeft", (data) => {
            console.log(`🚪 ${data.username} left`);
            document.dispatchEvent(new CustomEvent("studentLeft", { detail: data }));
        });

        this.socket.on("sessionReset", () => {
            document.dispatchEvent(new CustomEvent("sessionReset"));
        });

        this.socket.on("errorMessage", (msg) => {
            alert(msg);
        });
    }

    sendAsset(asset) {
        this.socket.emit("sendAsset", {
            sessionId: this.sessionId,
            username: this.username,
            asset
        });
    }

    resetSession() {
        if (confirm("This will reset the session for all participants. Continue?")) {
            this.socket.emit("resetSession", { sessionId: this.sessionId });
        }
    }
}
