// public/js/student-session.js
export class StudentSession {
    constructor(sessionId, username) {
        this.sessionId = sessionId;
        this.username = username;

        // Session state stored locally
        this.text = "";
        this.template = null;
        this.assets = [];
    }

    // Update the internal session state from server data
    updateSession(sessionState) {
        this.text = sessionState.text || "";
        this.template = sessionState.template || null;
        this.assets = sessionState.assets || [];
        console.log("Session state updated:", sessionState);
    }

    // Add a single asset to the local session state
    addAsset(asset) {
        this.assets.push(asset);
        console.log("Asset added to local session:", asset);
    }

    // Generic helper to emit messages to the server (requires socket reference externally)
    sendMessage(socket, event, data) {
        if (socket && socket.connected) {
            socket.emit(event, data);
        }
    }
}
