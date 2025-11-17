// controllers/routeController.js
const express = require("express");
const router = express.Router();
const path = require("path");

const {
    upload,
    handleUpload,
    handleDelete,
    handleList,
    handleListJson,
    getAllFiles
} = require("./fileSystemController");

const facilitatorController = require("./facilitatorController");

// ----------------------
// Static File Serving
// ----------------------
router.use("/files", express.static(path.join(__dirname, "../uploads")));

// ----------------------
// Upload Form
// ----------------------
router.get("/upload", (req, res) => {
    const devUploader = process.env.UPLOAD_BY_DEV || "";
    res.render("uploadForm", {
        devUploader,
        layout: "main",
        title: "Upload a File",
        year: new Date().getFullYear(),
    });
});

// ----------------------
// Upload Handler
// ----------------------
router.post("/upload", upload.single("file"), handleUpload);

// ----------------------
// List Uploaded Files Page
// ----------------------
router.get("/files", handleList);

// ----------------------
// Delete File
// ----------------------
router.post("/files/delete/:id", handleDelete);

// ----------------------
// Public API (already existed)
// ----------------------
router.get("/api/facilitator/files", handleListJson);

// ----------------------
// Facilitator JSON File Browser (NEW / FIXED)
// ----------------------
router.get(
    "/facilitator/:project/:instance/files/json",
    facilitatorController.getFileBrowserJson
);

// ----------------------
// Facilitator Dashboard Page
// ----------------------
router.get("/facilitator", async (req, res) => {
    try {
        const files = await getAllFiles();
        res.render("facilitator", {
            title: "Facilitator Dashboard",
            layout: "main",
            files,
        });
    } catch (err) {
        console.error("❌ Error loading files:", err);
        res.render("facilitator", {
            title: "Facilitator Dashboard",
            layout: "main",
            files: [],
            error_msg: "Failed to load files.",
        });
    }
});

// ----------------------
// Student View
// ----------------------
router.get("/student", (req, res) => {
    res.render("student", {
        title: "Student View",
        layout: "main",
    });
});

// ----------------------
// Default Redirect
// ----------------------
router.get("/", (req, res) => res.redirect("/upload"));

module.exports = router;
