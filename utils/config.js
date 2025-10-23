require("dotenv").config({ quiet: true });

function parseValue(value) {
    if (value === undefined) return undefined;

    const lower = value.toLowerCase();

    // Boolean conversion
    if (lower === "true") return true;
    if (lower === "false") return false;

    // Number conversion (only if it’s a valid number)
    if (!isNaN(value) && value.trim() !== "") return Number(value);

    // JSON-like arrays or objects (optional)
    if ((value.startsWith("[") && value.endsWith("]")) ||
        (value.startsWith("{") && value.endsWith("}"))) {
        try {
            return JSON.parse(value);
        } catch {
            return value; // fallback
        }
    }

    // Default: return as string
    return value;
}

// Build a proxy that converts values on access
const config = new Proxy(process.env, {
    get(target, prop) {
        const raw = target[prop];
        return parseValue(raw);
    }
});

module.exports = config;
