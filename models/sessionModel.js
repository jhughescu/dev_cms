// models/sessionModel.js
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    socketId: { type: String, default: null },
});

const assetSchema = new mongoose.Schema({
    originalName: String,
    filename: String,
    mimetype: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    facilitator: { type: String, required: true },
    students: [studentSchema],
    assets: [assetSchema],
    templates: [mongoose.Schema.Types.Mixed], // for future session templates
    textContent: { type: String, default: "" }, // optional text shared
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", sessionSchema);
