function safeHandler(fn) {
    Promise.resolve(fn()).catch(err =>
        console.error("❌ Socket handler error:", err)
    );
}

module.exports = { safeHandler };
