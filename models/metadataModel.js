const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    hash: {
        type: String,
        required: true,
        unique: true
    },

    // New metadata
    project: {
        type: String,
        required: true,
        default: "cms"
    },
    instance: {
        type: String,
        required: true,
        default: "main"
    },
    category: {
        type: String,
        required: true,
        default: "none"
    },
    uploadedBy: {
        type: String,
        required: true,
        default: process.env.UPLOAD_BY_DEV || "superuser"
    },

    detectedType: {
        type: String,
        default: "Other"
    },
    encoding: {
        type: String,
        default: "binary"
    },
    dimensions: {
        type: String,
        default: null
    },

    uploadedAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model("File", fileSchema);
