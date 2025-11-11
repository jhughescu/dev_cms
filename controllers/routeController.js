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

// ----------------------
// Static routes
// ----------------------
router.use("/files", express.static(path.join(__dirname, "../uploads")));

// ----------------------
// Upload form
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
// Upload handler
// ----------------------
router.post("/upload", upload.single("file"), handleUpload);

// ----------------------
// List uploaded files
// ----------------------
router.get("/files", handleList);

// ----------------------
// Delete file
// ----------------------
router.post("/files/delete/:id", handleDelete);


router.get('/api/facilitator/files', handleListJson);

router.get("/facilitator", async (req, res) => {
    try {
//        const files = await File.find().sort({ uploadedAt: -1 }).lean();
        const files = await getAllFiles();
        console.log('files');
        console.log(files);
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

router.get("/student", (req, res) => {
    res.render("student", {
        title: "Student View",
        layout: "main",
    });
});


// ----------------------
// Home redirect
// ----------------------
router.get("/", (req, res) => res.redirect("/upload"));

module.exports = router;
