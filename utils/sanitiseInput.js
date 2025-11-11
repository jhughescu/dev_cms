// utils/sanitiseInput.js
const path = require("path");

/**
 * Sanitise a simple text value (e.g. form field)
 */
function sanitise(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

/**
 * Sanitise specific fields of an object (returns a copy)
 */
function sanitiseFields(obj, keys = []) {
    const clean = {
        ...obj
    };
    for (const key of keys) {
        if (key in clean) {
            clean[key] = sanitise(clean[key]);
        }
    }
    return clean;
}

/**
 * Sanitise filenames for safe use in storage.
 */
function safeFilename(originalName, addTimestamp = true) {
    if (typeof originalName !== "string") return "file";

    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    let safeBase = base.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    if (!safeBase) safeBase = "file";

    const timestamp = addTimestamp ? `${Date.now()}_` : "";

    return `${timestamp}${safeBase}${ext.toLowerCase()}`;
}

/**
 * Sanitise input (UK spelling)
 */
function sanitiseInput(input) {
    if (typeof input !== "string") return "";
    return input
        .trim()
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/["']/g, "");
}

module.exports = {
    sanitise,
    sanitiseFields,
    safeFilename,
    sanitiseInput,
};
