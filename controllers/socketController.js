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
const { handleSendAssetBatch } = require("./socketHandlers/sendAssetBatch");
const {
    // handleResetSession removed
} = require("./socketHandlers/resetSession"); // removed resetSession
const {
    handleStudentPing
} = require("./socketHandlers/studentPing");
const { handleSendTemplatedContent } = require("./socketHandlers/sendTemplatedContent");

const {
    handleDisconnect
} = require("./socketHandlers/disconnect");
const { handleBlankSession } = require("./socketHandlers/blankSession");
const { handleRemoveStudent } = require("./socketHandlers/removeStudent");
const { handleStudentLeave } = require("./socketHandlers/studentLeave");
const { handleInsertSlide } = require("./socketHandlers/insertSlide");
const { handleDeleteSlide } = require("./socketHandlers/deleteSlide");
const { handleUpdateSlideDetails } = require("./socketHandlers/updateSlideDetails");
const { handleReorderSlides } = require("./socketHandlers/reorderSlides");

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

        socket.on("sendAssetBatch", (data) => safeHandler(() =>
            handleSendAssetBatch(io, socket, data)
        ));

        socket.on("sendTemplatedContent", (data) => safeHandler(() =>
            handleSendTemplatedContent(io, socket, data, socketSessions)
        ));

        // resetSession socket event removed

        socket.on("studentPing", (data) => safeHandler(() =>
            handleStudentPing(io, socket, data, socketSessions)
        ));

        socket.on("removeStudent", (data) => safeHandler(() =>
            handleRemoveStudent(io, socket, data, socketSessions)
        ));

        socket.on("studentLeave", (data, ack) => safeHandler(() =>
            handleStudentLeave(io, socket, data, socketSessions, ack)
        ));

        socket.on("insertSlide", (data) => safeHandler(() =>
            handleInsertSlide(io, socket, data, socketSessions)
        ));

        socket.on("deleteSlide", (data) => safeHandler(() =>
            handleDeleteSlide(io, socket, data, socketSessions)
        ));

        socket.on("updateSlideDetails", (data) => safeHandler(() =>
            handleUpdateSlideDetails(io, socket, data, socketSessions)
        ));

        socket.on("reorderSlides", (data) => safeHandler(() =>
            handleReorderSlides(io, socket, data, socketSessions)
        ));

        socket.on("disconnect", () => safeHandler(() =>
            handleDisconnect(io, socket, socketSessions)
        ));

        // Facilitator can trigger blankSession for all students
        socket.on("blankSession", (data) => safeHandler(() =>
            handleBlankSession(io, socket, data, socketSessions)
        ));
    });
}

module.exports = {
    initSocket,
    socketSessions,
    getIO: () => io
};
