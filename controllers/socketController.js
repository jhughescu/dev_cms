const {
    Server
} = require("socket.io");
const {
    safeHandler
} = require("../utils/socketUtils");
const {
    handleJoinSession
} = require("./socketHandlers/joinSession");
const {
    handleSendAsset
} = require("./socketHandlers/sendAsset");
const {
    handleResetSession
} = require("./socketHandlers/resetSession");
const {
    handleStudentPing
} = require("./socketHandlers/studentPing");
const {
    handleDisconnect
} = require("./socketHandlers/disconnect");

let io;
const socketSessions = {}; // in-memory session tracking

function initSocket(server) {
    io = new Server(server);

    io.on("connection", (socket) => {
        console.log("⚡ Socket connected:", socket.id);

        socket.on("joinSession", (data) => safeHandler(() =>
            handleJoinSession(io, socket, data, socketSessions)
        ));

        socket.on("sendAsset", (data) => safeHandler(() =>
            handleSendAsset(io, socket, data)
        ));

        socket.on("resetSession", (data) => safeHandler(() =>
            handleResetSession(io, socket, data, socketSessions)
        ));

        socket.on("studentPing", (data) => safeHandler(() =>
            handleStudentPing(io, socket, data, socketSessions)
        ));

        socket.on("disconnect", () => safeHandler(() =>
            handleDisconnect(io, socket, socketSessions)
        ));
    });
}

module.exports = {
    initSocket,
    socketSessions
};
