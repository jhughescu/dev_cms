const Session = require("../../models/sessionModel");
const File = require("../../models/metadataModel");

// Batch asset sender: overwrites currentState with the resolved fileIds from assets[] atomically.
async function handleSendAssetBatch(io, socket, { sessionId, assets, username }) {
    if (!Array.isArray(assets) || assets.length === 0) {
        return; // nothing to process
    }

    const session = await Session.findOne({ sessionId });
    if (!session) return;

    if (username !== session.facilitator) {
        console.warn(`Unauthorized batch asset send attempt by ${username}`);
        return;
    }

    // Guard: block modifications on archived sessions
    console.log(`handleSendAssetBatch: checking archived status for session ${sessionId}`);
    if (session.archived) {
        console.warn(`sendAssetBatch rejected: session ${sessionId} is archived`);
        try {
            socket.emit('sessionLocked', { sessionId, message: 'Session is archived and cannot be modified.' });
        } catch (e) {
            console.warn('sendAssetBatch: failed to emit sessionLocked message', e);
        }
        return;
    }

    // Resolve all fileIds (prefer provided _id / id, fallback to url lookup)
    const resolvedIds = [];
    for (const asset of assets) {
        let fileId = asset && (asset._id || asset.id) || null;
        if (!fileId && asset && asset.url) {
            try {
                const fileDoc = await File.findOne({ url: asset.url }).select("_id");
                if (fileDoc) fileId = fileDoc._id;
            } catch (e) {
                console.warn('sendAssetBatch: lookup by URL failed', asset.url, e);
            }
        }
        if (fileId) resolvedIds.push(String(fileId));
    }

    // Deduplicate while preserving order
    const uniqueIds = [];
    const seen = new Set();
    for (const id of resolvedIds) {
        if (!seen.has(id)) { seen.add(id); uniqueIds.push(id); }
    }

    const sessionRoom = `session:${sessionId}`;

    const updateOps = {
        $push: { assets: { $each: assets } },
        $set: { updatedAt: new Date(), currentState: uniqueIds }
    };

    const updated = await Session.findOneAndUpdate({ sessionId }, updateOps, { new: true }).exec();
    if (!updated) return;

    // Push a single history snapshot of the entire batch
    try {
        const snapshot = (updated.currentState || []).slice();
        await Session.updateOne({ _id: updated._id }, {
            $push: { stateHistory: { state: snapshot, timestamp: new Date() } },
            $set: { updatedAt: new Date() }
        });
    } catch (err) {
        console.warn('sendAssetBatch: failed to push stateHistory snapshot', err);
    }

    // Emit a batch-specific event (optional future use) plus legacy per-asset events for compatibility (send first so clients set assetsUpdatePending before full sessionState arrives)
    try { io.to(sessionRoom).emit('receiveAssetBatch', { assets }); } catch (e) {}
    for (const asset of assets) {
        try { io.to(sessionRoom).emit('receiveAsset', asset); } catch (e) {}
    }

    // Emit populated sessionState to session + admin rooms
    try {
        const { socketSessions } = require('../socketController');
        const populated = await Session.findById(updated._id)
            .populate('currentState')
            .populate('stateHistory.state')
            .lean();
        io.to(sessionRoom).emit('sessionState', populated);

        // Lightweight payload for students to avoid large-frame drops
        const lite = {
            sessionId: populated.sessionId,
            currentState: (populated.currentState || []).map(file => ({
                _id: file._id,
                url: file.url,
                mimetype: file.mimetype,
                originalName: file.originalName,
                uploadedBy: file.uploadedBy
            })),
            stateHistorySize: populated.stateHistory?.length || 0,
            timestamp: Date.now()
        };
        io.to(sessionRoom).emit('sessionStateLite', lite);
        // Emit to facilitator socket so file table re-renders
        const facSock = socketSessions[sessionId]?.facilitator;
        if (facSock) io.to(facSock).emit('sessionState', populated);
        io.to('admin').emit('sessionState', populated);
    } catch (err) {
        console.warn('sendAssetBatch: populate failed, emitting fallback ids', err);
        io.to(sessionRoom).emit('sessionState', {
            sessionId: updated.sessionId,
            currentState: updated.currentState || [],
            stateHistory: updated.stateHistory || []
        });
    }
}

module.exports = { handleSendAssetBatch };
