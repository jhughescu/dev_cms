// controllers/fileSystemController.js
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
    imageSize
} = require("image-size");
//const pdfParse = require("pdf-parse");

const File = require("../models/metadataModel");
const {
    getUploadPath
} = require("../utils/uploadPath");
const {
    sanitiseInput
} = require("../utils/sanitiseInput");

// ----------------------
// Multer configuration
// ----------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const {
            project = "cms", instance = "main"
        } = req.body;
        const uploadDir = getUploadPath(project, instance, "uploads");
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext);
        const safeBase = sanitiseInput(base);
        const uniqueName = `${Date.now()}-${safeBase}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage
});

// ----------------------
// Helper: detect type
// ----------------------
function getDetectedType(mimetype) {
    if (!mimetype) return "Other";
    if (mimetype.startsWith("image/")) return "Image";
    if (mimetype === "application/pdf") return "PDF Document";
    if (mimetype.startsWith("text/")) return "Text";
    return "Other";
}

// ----------------------
// Handle file upload
// ----------------------
const handleUpload = async (req, res) => {
    console.log("🟢 handleUpload triggered");

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No file uploaded."
        });
    }

    try {
        // 🔹 Step 1: Sanitise and extract fields
        const project = sanitiseInput(req.body.project || "cms");
        const instance = sanitiseInput(req.body.instance || "main");
        const categoryRaw = sanitiseInput(req.body.category || "");
        const uploadedByRaw = sanitiseInput(req.body.uploadedBy || "");
        const category = categoryRaw && categoryRaw.trim() !== "" ? categoryRaw : "none";

        // 🔹 Step 2: Determine uploader
        const env = process.env.NODE_ENV || "development";
        let uploader = "unknown";
        if (env === "production" && req.user && req.user.username) {
            uploader = req.user.username;
        } else if (uploadedByRaw) {
            uploader = uploadedByRaw;
        } else if (process.env.UPLOAD_BY_DEV) {
            uploader = process.env.UPLOAD_BY_DEV;
        }

        // 🔹 Step 3: Compute file hash (async)
        const fileBuffer = await fs.promises.readFile(req.file.path);
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        // 🔹 Step 4: Duplicate check
        const existing = await File.findOne({
            hash: fileHash
        });
        if (existing) {
            await fs.promises.unlink(req.file.path);
            console.log("⚠️ Duplicate detected for:", existing.originalName);
            return res.json({
                success: false,
                message: `Duplicate file. Already uploaded as "${existing.originalName}".`
            });
        }

        // 🔹 Step 5: Relative URL
        const relativePath = path.relative("uploads", req.file.path).replace(/\\/g, "/");

        // 🔹 Step 6: Additional metadata
        const detectedType = getDetectedType(req.file.mimetype);
        const encoding = req.file.encoding || "binary";

        let dimensions = null;
        //        console.log(`detectedType: ${detectedType}`);
        if (detectedType === "Image") {
            try {
                const imageBuffer = await fs.promises.readFile(req.file.path);
                const {
                    width,
                    height
                } = imageSize(imageBuffer);

                dimensions = `${width}×${height}`;
                //                console.log(dimensions)
            } catch (err) {
                console.warn("⚠️ Could not determine image dimensions:", err.message);
                dimensions = null;
            }
        } else {
            dimensions = null;
        }


        // 🔹 Step 7: Save metadata
        const newFile = new File({
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            url: "/files/" + relativePath,
            hash: fileHash,
            project,
            instance,
            category,
            uploadedBy: uploader,
            detectedType,
            encoding,
            dimensions,
        });

        await newFile.save();
        console.log(`✅ File metadata saved: ${newFile.originalName} (${uploader})`);

        return res.json({
            success: true,
            message: `File "${newFile.originalName}" uploaded successfully by ${uploader}.`
        });

    } catch (err) {
        console.error("❌ Error during upload:", err);
        return res.status(500).json({
            success: false,
            message: `Error uploading file: ${err.message}`
        });
    }
};

// ----------------------
// Delete a file
// ----------------------
const handleDelete = async (req, res) => {
    const fileId = req.params.id;
    try {
        const file = await File.findById(fileId);
        if (!file) return res.json({
            error: "File not found or already deleted."
        });

        if (fs.existsSync(file.path)) await fs.promises.unlink(file.path);
        await File.findByIdAndDelete(fileId);

        return res.json({
            success: `File "${file.originalName}" deleted successfully.`
        });
    } catch (err) {
        console.error("❌ Error deleting file:", err);
        return res.json({
            error: `Failed to delete file: ${err.message}`
        });
    }
};

// ----------------------
// List files
// ----------------------
const handleList = async (req, res) => {
    try {
        let {
            page = 1, limit = 5, sort = "uploadedAt", dir = "desc", search = "", type = ""
        } = req.query;

        page = parseInt(page, 10);
        if (isNaN(page) || page < 1) page = 1;
        const isAll = limit === "All" || limit === "all";
        const numericLimit = isAll ? 0 : parseInt(limit, 10);

        // Filter
        const filter = {};
        if (search?.trim()) filter.originalName = new RegExp(search.trim(), "i");
        if (type && type !== "all") filter.mimetype = new RegExp(type.trim(), "i");

        const totalFiles = await File.countDocuments(filter);
        const totalPages = isAll ? 1 : Math.ceil(totalFiles / numericLimit);

        const sortObj = {};
        sortObj[sort] = dir === "asc" ? 1 : -1;

        let query = File.find(filter).sort(sortObj).lean();
        if (!isAll) query = query.skip((page - 1) * numericLimit).limit(numericLimit);
        const files = await query;

        res.render("filelist", {
            title: "Uploaded Files",
            layout: "main",
            files,
            currentPage: page,
            totalPages,
            limit,
            perPageOptions: ["5", "10", "20", "All"],
            sort,
            dir,
            query: req.query
        });

    } catch (err) {
        console.error("❌ Error loading files:", err);
        res.render("filelist", {
            title: "Uploaded Files",
            layout: "main",
            files: [],
            error_msg: ["Could not load file list."]
        });
    }
};

const handleListJson = async (req, res) => {
    try {
        // Optional: enforce facilitator role
        if (!req.user || !(req.user.role === 'superuser' || req.user.role === 'facilitator')) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Use the same filter logic you already have for listing
        const filter = {};
        // Optionally add project/instance filtering if req.query.project present
        const {
            project,
            instance
        } = req.query;
        if (project) filter.project = project;
        if (instance) filter.instance = instance;

        const files = await File.find(filter)
            .sort({
                uploadedAt: -1
            })
            .lean()
            .select('_id originalName filename mimetype size uploadedAt url project instance category uploadedBy');

        return res.json({
            files
        });
    } catch (err) {
        console.error('❌ Error fetching files JSON:', err);
        return res.status(500).json({
            error: 'Server error'
        });
    }
};

const getAllFiles = async () => {
    try {
        const files = await File.find().sort({ uploadedAt: -1 }).lean();
        return files;
    } catch (err) {
        console.error("❌ getAllFiles() failed:", err);
        throw err;
    }
};


module.exports = {
    upload,
    handleUpload,
    handleDelete,
    handleList,
    handleListJson,
    getAllFiles,
};
