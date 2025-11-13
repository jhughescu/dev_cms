const Session = require("../../models/sessionModel");

async function handleSendAsset(io, socket, { sessionId, asset, username }) {
    const session = await Session.findOne({ sessionId });
    if (!session) return;

    if (username !== session.facilitator) {
        console.warn(`Unauthorized asset send attempt by ${username}`);
        return;
    }

    session.assets.push(asset);
    session.updatedAt = new Date();
    await session.save();

    io.to(sessionId).emit("receiveAsset", asset);
    console.log(`Asset sent to ${sessionId} by ${username}: ${asset.originalName}`);
}

module.exports = { handleSendAsset };
