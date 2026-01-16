    
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
    },
    // Returns "asc" or "desc" for the next click
    nextDir: (currentSort, currentDir, column) => {
        if (currentSort === column) {
            return currentDir === "asc" ? "desc" : "asc";
        }
        return "asc"; // default
    },
    // Returns an arrow for the current sorted column
    sortArrow: (currentSort, currentDir, column) => {
        //        console.log(`currentSort: ${currentSort}`)
        if (currentSort === column) {
            return currentDir === "asc" ? "↑" : "↓";
        }
        return "";
    },
    buildSortUrl: (query, column, nextDir) => {
        // Clone the current query to avoid mutating it
        const newQuery = {
            ...query
        };

        // Update sorting params
        newQuery.sort = column;
        newQuery.dir = nextDir;

        // Build a query string like ?sort=name&dir=asc&page=2
        const qs = Object.entries(newQuery)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");

        return `?${qs}`;
    },
    resetSortQuery: (query) => {
        try {
            if (!query || typeof query !== "object") return "";

            // Create a URLSearchParams object
            const params = new URLSearchParams(query);

            // Remove sort and dir
            params.delete("sort");
            params.delete("dir");

            // Convert back to query string
            const qs = params.toString();
            return qs ? `?${qs}` : "/files";
        } catch (err) {
            console.error("resetSortQuery error:", err);
            return "/files";
        }
    },
    or: (a, b) => a || b,
    // Equality helper alias used in templates (block or inline)
    eq: (a, b, options) => {
        if (options && typeof options.fn === "function") {
            return a == b ? options.fn(this) : options.inverse(this);
        }
        return a == b;
    },
    ifEq: (a, b, options) => {
        // If used as a block helper
        if (options && typeof options.fn === "function") {
            return a == b ? options.fn(this) : options.inverse(this);
        }

        // If used inline (returns a boolean)
        return a == b;
    },
    gt: (a, b) => a > b,
    lt: (a, b) => a < b,
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    range: (from, to) => {
        let arr = [];
        for (let i = from; i <= to; i++) arr.push(i);
        return arr;
    },
    toString: (value) => {
        return value != null ? value.toString() : "";
    },
    same: (a, b) => a === b,
    buildQueryUrl: (base, query, overrides) => {
        const merged = {
            ...query,
            ...overrides
        };
        const clean = Object.entries(merged)
            .filter(([_, v]) => v !== undefined && v !== null && v !== "");
        const params = clean
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");
        return `${base}?${params}`;
    },
    mergeQuery: (query, ...args) => {
        const options = args.pop(); // Handlebars passes options as last arg
        const overrides = {};

        for (let i = 0; i < args.length; i += 2) {
            overrides[args[i]] = args[i + 1];
        }

        return {
            ...query,
            ...overrides
        };
    },
    toLower: (str) => {
        if (typeof str !== 'string') return '';
        //        console.log(str, str.toLowerCase(str));
        return str.toLowerCase();
    },

    formattedSize: (size) => {
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
        return (size / (1024*1024)).toFixed(1) + ' MB';
    },

    formattedDate: (date) => {
        return new Date(date).toLocaleString();
    },
    isImage: mimetype => mimetype.startsWith('image/'),
    // --- Reverse an array (for latest-first display) ---
    reverse: arr => Array.isArray(arr) ? arr.slice().reverse() : arr,
};
