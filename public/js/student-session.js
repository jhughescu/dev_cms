// public/js/student-session.js
export class StudentSession {
    constructor(sessionId, username) {
        this.sessionId = sessionId;
        this.username = username;
        this.assets = [];
        console.log(`🎓 StudentSession created for ${username} in ${sessionId}`);
    }

    updateSession(sessionState) {
        console.log("🔄 Updating session from server:", sessionState);

        if (!sessionState || !Array.isArray(sessionState.assets)) {
            console.warn("⚠️ Invalid session state received:", sessionState);
            return;
        }

        // Replace local state completely (no duplicates)
        this.assets = sessionState.assets;

        // Notify listeners (UI)
        document.dispatchEvent(
            new CustomEvent("sessionStateReceived", {
                detail: sessionState
            })
        );
    }

    addAsset(asset) {
        if (!asset || !asset.url) {
            console.warn("⚠️ Invalid asset received:", asset);
            return;
        }

        // Prevent duplicates (by URL or ID)
        const exists = this.assets.some(a => a.url === asset.url);
        if (!exists) {
            this.assets.push(asset);
            console.log("📦 Asset added:", asset.originalName);

            // Notify listeners (UI)
            document.dispatchEvent(
                new CustomEvent("assetReceived", {
                    detail: asset
                })
            );
        } else {
            console.log("⚠️ Duplicate asset ignored:", asset.originalName);
        }
    }

    clearSession() {
        console.log("🧹 Clearing all assets from session");
        this.assets = [];
    }
}
