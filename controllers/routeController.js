// controllers/routeController.js
const express = require("express");
const router = express.Router();
const path = require("path");
const {
    upload,
    handleUpload,
    handleDelete,
    handleList
} = require("./fileSystemController");

// ----------------------
// Static routes
// ----------------------
router.use("/files", express.static(path.join(__dirname, "../uploads")));

// ----------------------
// Upload form
// ----------------------
router.get("/upload", (req, res) => {
    res.render("uploadForm", {
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



// ----------------------
// Home redirect
// ----------------------
router.get("/", (req, res) => res.redirect("/upload"));

module.exports = router;
