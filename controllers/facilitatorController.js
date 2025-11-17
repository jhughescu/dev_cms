// controllers/facilitatorController.js

const File = require("../models/metadataModel"); // <<-- use your existing metadataModel.js

// --- Helper Functions ---

function mapIcon(ext, detectedType) {
    if (detectedType === "Image") return "image";
    if (ext === "pdf") return "pdf";
    if (ext === "mp3") return "audio";
    if (["mp4", "mov", "m4v"].includes(ext)) return "video";
    if (detectedType === "Text") return "text";
    return "file";
}

function mapGroup(detectedType, ext) {
    if (detectedType === "Image") return "Images";
    if (ext === "pdf") return "PDFs";
    if (detectedType === "Text") return "Text Files";
    if (["mp3"].includes(ext)) return "Audio";
    if (["mp4", "mov", "m4v"].includes(ext)) return "Video";
    return "Other";
}

// --- New Endpoint ---

exports.getFileBrowserJson = async function(req, res) {
    try {
        // Accept project and instance via params or query for flexibility
        const project = req.params.project || req.query.project || "cms";
        const instance = req.params.instance || req.query.instance || "main";

        const filter = { project, instance };

        const files = await File.find(filter)
            .sort({ uploadedAt: -1 })
            .lean()
            .select(
                "_id originalName filename mimetype size uploadedAt url " +
                "project instance category uploadedBy detectedType dimensions"
            );

        const mapped = files.map(f => {
            const ext = (f.originalName.split('.').pop() || "").toLowerCase();

            return {
                id: f._id,
                name: f.originalName,
                filename: f.filename,
                ext,
                size: f.size,
                mimetype: f.mimetype,
                detectedType: f.detectedType,
                uploadedAt: f.uploadedAt,
                url: f.url,
                project: f.project,
                instance: f.instance,
                category: f.category || "none",
                uploadedBy: f.uploadedBy,
                dimensions: f.dimensions || null,

                // Derived UI values
                icon: mapIcon(ext, f.detectedType),
                group: mapGroup(f.detectedType, ext),
                folder: f.category || "none"
            };
        });

        // Auto-generated filter lists
        const filters = {
            types: [...new Set(mapped.map(f => f.group))],
            extensions: [...new Set(mapped.map(f => f.ext))],
            categories: [...new Set(mapped.map(f => f.category))],
            uploaders: [...new Set(mapped.map(f => f.uploadedBy))]
        };

        return res.json({
            project,
            instance,
            count: mapped.length,
            filters,
            files: mapped
        });

    } catch (err) {
        console.error("Error in getFileBrowserJson:", err);
        return res.status(500).json({ error: "Failed to load file list." });
    }
};
