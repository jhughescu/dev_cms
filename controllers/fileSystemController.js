// controllers/fileSystemController.js
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const File = require("../models/metadataModel");

// Configure multer for local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage
});

// ----------------------
// Handle file upload with hashing and duplicate detection
// ----------------------
const handleUpload = async (req, res) => {
    console.log("🟢 handleUpload triggered");

    if (!req.file) {
        req.flash("error_msg", "No file uploaded.");
        console.log("❌ No file uploaded");
        return res.redirect("/upload");
    }

    try {
        console.log("🟢 File received:", req.file.originalname);
        console.log("📁 Stored at:", req.file.path);

        // Read file buffer
        let fileBuffer;
        try {
            fileBuffer = fs.readFileSync(req.file.path);
        } catch (err) {
            console.error("❌ Failed to read uploaded file:", err);
            req.flash("error_msg", "Failed to read uploaded file.");
            return res.redirect("/upload");
        }

        // Generate SHA-256 hash
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        console.log("🔑 Generated hash:", fileHash);

        // Check for duplicates in DB
        const existing = await File.findOne({
            hash: fileHash
        });
        if (existing) {
            console.log("⚠️ Duplicate detected for:", existing.originalName);

            // Remove the uploaded duplicate file
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.warn("⚠️ Could not delete duplicate file:", err.message);
            }

            // Store flash message
            req.flash(
                "error_msg",
                `Duplicate file detected. Already uploaded as "${existing.originalName}".`
            );

            console.log("🟡 Flash message stored, redirecting to /files");
            return res.redirect("/files");
        }

        // Save metadata to DB
        const newFile = new File({
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            url: "/files/" + req.file.filename,
            hash: fileHash,
        });

        const savedFile = await newFile.save();
        console.log("✅ File metadata saved to DB:", savedFile.originalName);

        req.flash("success_msg", `File "${savedFile.originalName}" uploaded successfully.`);
        console.log("🟢 Flash success stored, redirecting to /files");
        return res.redirect("/files");

    } catch (err) {
        console.error("❌ Unexpected error during upload:", err);
        req.flash("error_msg", `Error uploading file: ${err.message}`);
        return res.redirect("/upload");
    }
};

// ----------------------
// Delete a file
// ----------------------
const handleDelete = async (req, res) => {
    const fileId = req.params.id;

    try {
        const file = await File.findById(fileId);
        if (!file) {
            req.flash("error_msg", "File not found or already deleted.");
            return res.redirect("/files");
        }

        // Remove physical file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        console.log("🗑 Deleted file from uploads:", file.filename);

        // Remove metadata from DB
        await File.findByIdAndDelete(fileId);
        console.log("🗑 Deleted file metadata from DB:", file.filename);

        req.flash("success_msg", `File "${file.originalName}" deleted successfully.`);
        return res.redirect("/files");

    } catch (err) {
        console.error("❌ Error deleting file:", err);
        req.flash("error_msg", `Failed to delete file: ${err.message}`);
        return res.redirect("/files");
    }
};

// ----------------------
// List all uploaded files
// ----------------------
const handleList = async (req, res) => {
    try {
        const files = await File.find().sort({ uploadedAt: -1 }).lean();

        // Read flash messages once here
        const successMsgs = req.flash("success_msg");
        const errorMsgs = req.flash("error_msg");

        res.render("filelist", {
            title: "Uploaded Files",
            layout: "main",
            files,
            success_msg: successMsgs,
            error_msg: errorMsgs,
        });

        console.log("🚦 Rendering /files with messages:", {
            success: successMsgs,
            error: errorMsgs,
        });
    } catch (err) {
        console.error("❌ Error loading files:", err);
        res.render("filelist", {
            title: "Uploaded Files",
            layout: "main",
            files: [],
            error_msg: ["Could not load file list."],
        });
    }
};


module.exports = {
    upload,
    handleUpload,
    handleDelete,
    handleList,
};
