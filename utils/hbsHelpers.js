// utils/hbsHelpers.js

module.exports = {
    // --- Format a date into readable string ---
    formatDate: (date) => {
        if (!date) return "";
        const d = new Date(date);
        return isNaN(d) ? "" : d.toLocaleString();
    },

    // --- Convert bytes to kilobytes ---
    formatKB: (size) => {
        if (!size && size !== 0) return "";
        const n = Number(size);
        return isNaN(n) ? "" : (n / 1024).toFixed(1);
    },

    // --- Shorten long strings with ellipsis ---
    truncate: (str, len = 20) => {
        if (!str) return "";
        return str.length > len ? str.substring(0, len) + "..." : str;
    },

    // --- Simplify MIME types into readable labels ---
    fileTypeLabel: (mimetype) => {
        if (!mimetype) return "Unknown";
        if (mimetype.startsWith("image/")) return "Image";
        if (mimetype.startsWith("video/")) return "Video";
        if (mimetype.startsWith("audio/")) return "Audio";
        if (mimetype.startsWith("text/")) return "Text";
        if (mimetype.includes("pdf")) return "PDF";
        return "File";
    },

    // --- Boolean check for inline usage ---
    ifEq: (a, b) => a == b,

    // --- Check if value exists ---
    ifExists: (value) => !!value,

    json: (context) => {
        return JSON.stringify(context || []);
    }
};
