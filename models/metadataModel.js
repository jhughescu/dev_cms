const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    originalName: String,
    filename: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    path: String,
    url: String,
    hash: {
        type: String,
        unique: true
    } // 🔒 unique hash for duplicate detection
});

module.exports = mongoose.model("File", fileSchema);
