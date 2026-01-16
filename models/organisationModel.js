// models/organisationModel.js
const mongoose = require("mongoose");

const organisationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        default: ""
    },
    maxFacilitators: {
        type: Number,
        default: 3,
        min: 1
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Simple 6-char alphanumeric token required for facilitator registration
    token: {
        type: String,
        default: null,
        trim: true
    }
});

// Update the updatedAt timestamp on save
organisationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Helper to generate a 6-char alphanumeric token
organisationSchema.statics.generateToken = function() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let t = '';
    for (let i = 0; i < 6; i++) t += chars[Math.floor(Math.random() * chars.length)];
    return t;
};

module.exports = mongoose.model("Organisation", organisationSchema);
