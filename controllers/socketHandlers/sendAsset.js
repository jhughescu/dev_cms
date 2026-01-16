const Session = require("../../models/sessionModel");
const File = require("../../models/metadataModel");

async function handleSendAsset(io, socket, { sessionId, asset, username }) {
    const session = await Session.findOne({ sessionId });
    if (!session) return;

    if (username !== session.facilitator) {
        console.warn(`Unauthorized asset send attempt by ${username}`);
        return;
    }

    // Guard: do not allow modifications on archived sessions
    console.log(`handleSendAsset: checking archived status for session ${sessionId}`);
    if (session.archived) {
        console.warn(`sendAsset rejected: session ${sessionId} is archived`);
        try {
            console.log(`sessionLocked: session ${sessionId} is archived, rejecting sendAsset from ${username}`);
             socket.emit('sessionLocked', { sessionId, message: 'Session is archived and cannot be modified.' }); 
    } catch (e) {
        console.warn('sendAsset: failed to emit sessionLocked message', e);
    }
        return;
    }

    // Resolve File _id if possible (prefer asset._id or match by url)
    let fileId = asset._id || asset.id || null;
    if (!fileId && asset.url) {
        const fileDoc = await File.findOne({ url: asset.url }).select("_id");
        if (fileDoc) fileId = fileDoc._id;
    }

    // Debug logs: incoming payload and resolved file id
    try {
        console.log('sendAsset: incoming asset payload:', {
            sessionId,
            assetPreview: {
                originalName: asset && (asset.originalName || asset.originalname || asset.filename || asset.url),
                providedId: asset && (asset._id || asset.id),
                url: asset && asset.url,
            },
            resolvedFileId: fileId ? String(fileId) : null,
            sender: username
        });
    } catch (e) {
        console.warn('sendAsset: failed to log incoming asset payload', e);
    }

    // Build atomic update:
    // - Always log the asset event into `assets`
    // - OVERWRITE currentState to contain ONLY this asset (no accrual)
    const updateOps = { $push: { assets: asset }, $set: { updatedAt: new Date() } };
    if (fileId) {
        updateOps.$set.currentState = [fileId];
    }

    // Use findOneAndUpdate to avoid versioning conflicts
    // Log the intended DB updateOps for debugging
    try {
        console.log('sendAsset: updateOps prepared:', JSON.stringify({
            set: updateOps.$set
        }));
    } catch (e) {}

    const updated = await Session.findOneAndUpdate({ sessionId }, updateOps, { new: true }).exec();
    if (!updated) return;

    // Push a history snapshot (state array) — separate update to avoid version error on save
    try {
        const snapshot = (updated.currentState || []).slice();
        await Session.updateOne({ _id: updated._id }, { $push: { stateHistory: { state: snapshot, timestamp: new Date() } }, $set: { updatedAt: new Date() } });
        try { console.log('sendAsset: pushed stateHistory snapshot:', { sessionId: updated.sessionId, snapshot }); } catch (e) {}
    } catch (err) {
        console.warn('Failed to push stateHistory:', err);
    }

    // Emit the new session state to all participants in the room (populate currentState for client convenience)
    try {
        // Populate both currentState and historical state entries for admin-friendly payload
        const { socketSessions } = require('../socketController');
        const populated = await Session.findById(updated._id)
            .populate('currentState')
            .populate('stateHistory.state')
            .lean();
        const sessionRoom = `session:${sessionId}`;
        io.to(sessionRoom).emit("sessionState", populated);
        // Emit to facilitator socket so file table re-renders
        const facSock = socketSessions[sessionId]?.facilitator;
        if (facSock) io.to(facSock).emit("sessionState", populated);
        // Notify admin room as well so admin dashboards update
        io.to('admin').emit('sessionState', populated);
    } catch (err) {
        console.warn('Failed to populate currentState/stateHistory for emit, falling back to ids:', err);
        const sessionRoom = `session:${sessionId}`;
        io.to(sessionRoom).emit("sessionState", {
            sessionId: updated.sessionId,
            currentState: updated.currentState || [],
            stateHistory: updated.stateHistory || []
        });
    }

    // Also emit receiveAsset for compatibility with existing clients
    const sessionRoom = `session:${sessionId}`;
    io.to(sessionRoom).emit("receiveAsset", asset);
    console.log(`Asset sent to ${sessionId} by ${username}: ${asset.originalName || asset.filename || asset.url || 'unknown'}`);
}

module.exports = { handleSendAsset };
