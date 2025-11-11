// student-session.js
export class StudentSession {
    constructor(sessionId, username) {
        this.sessionId = sessionId;
        this.username = username;

        // ✅ Socket reference
        this.socket = null;

        // ✅ Session state stored locally
        this.text = "";
        this.template = null;
        this.assets = [];
    }

    // ✅ Called by student-main.js to begin socket connection
    connect(onSessionState, onReceiveAsset) {
        this.socket = initStudentSocket(
            this.sessionId,
            this.username,
            (sessionState) => {
                this.updateSession(sessionState);      // ✅ update internal state
                onSessionState(sessionState);          // ✅ notify UI layer
            },
            (asset) => {
                this.addAsset(asset);                  // ✅ track assets internally
                onReceiveAsset(asset);                 // ✅ notify UI layer
            },
            this.onSessionReset
        );
    }

    // ✅ Required: student-main.js and socket must call this
    updateSession(sessionState) {
        this.text = sessionState.text || "";
        this.template = sessionState.template || null;
        this.assets = sessionState.assets || [];
        console.log(sessionState)
    }

    // ✅ Helper when the server sends a single asset
    addAsset(asset) {
        this.assets.push(asset);
    }

    // ✅ Generic socket emitter
    sendMessage(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }
}
