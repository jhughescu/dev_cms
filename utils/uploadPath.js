// utils/uploadPath.js
import fs from "fs";
import path from "path";

export function getUploadPath(project = "default", instance = "main", category = "misc") {
    const now = new Date();
    const folder = path.join(
        "uploads",
        project,
        instance,
        category,
        now.getFullYear().toString(),
        String(now.getMonth() + 1).padStart(2, "0")
    );

    fs.mkdirSync(folder, {
        recursive: true
    });
    return folder;
}
