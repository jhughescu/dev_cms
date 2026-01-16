// models/sessionModel.js
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    socketId: { type: String, default: null },
    connected: { type: Boolean, default: true },
    joinedAt: { type: Date, default: null },
    lastActive: { type: Date, default: null },
    userAgent: { type: String, default: null },
    browser: { type: String, default: null },
    os: { type: String, default: null }
});

const assetSchema = new mongoose.Schema({
    originalName: String,
    filename: String,
    mimetype: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
});

const slideSchema = new mongoose.Schema({
    slideId: { type: Number, required: true },
    displayNumber: { type: Number, default: null },
    details: { type: String, default: '' },
    assets: [assetSchema],
    createdAt: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    facilitator: { type: String, required: true },
    // Facilitator's organization (e.g. "cu") - optional for legacy sessions
    organisation: { type: String, default: 'default' },
    // Unguessable token used for student join URLs (passwordless entry)
    joinToken: { type: String, unique: true, sparse: true },
    // Session password: 4-letter word + 4 digits (e.g. "bark1234") - optional for legacy sessions
    sessionPassword: { type: String, default: null },
    // Session status: pending (created but not active), active (currently running), archived (finished)
    status: { 
        type: String, 
        enum: ['pending', 'active', 'archived'], 
        default: 'pending',
        required: true 
    },
    students: [studentSchema],
    assets: [assetSchema],
    slides: [slideSchema],
    // Current session state: array of File ObjectIds (references to metadataModel)
    currentState: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    // History of state snapshots. Each entry stores the asset id list at a point in time
    stateHistory: [{ state: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }], timestamp: { type: Date, default: Date.now } }],
    templates: [mongoose.Schema.Types.Mixed], // for future session templates
    textContent: { type: String, default: "" }, // optional text shared
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    // Legacy fields - kept for backward compatibility
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
});

// Static helper: archive existing active sessions for a facilitator
sessionSchema.statics.archiveForFacilitator = async function(facilitator) {
    return this.updateMany({ facilitator, archived: { $ne: true } }, { $set: { archived: true, archivedAt: new Date() } });
};

module.exports = mongoose.model("Session", sessionSchema);
