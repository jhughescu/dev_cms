// utils/cleanUploadsAndDB.js
require("dotenv").config({
    quiet: true
});
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const File = require("../models/metadataModel");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Recursively print folder tree with project/instance highlighting and file counts
function printTree(dir, prefix = "", isRoot = true) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir).sort();
    entries.forEach((entry, idx) => {
        const fullPath = path.join(dir, entry);
        const isLast = idx === entries.length - 1;
        const pointer = isLast ? "└── " : "├── ";

        if (fs.statSync(fullPath).isDirectory()) {
            // Count number of files under this directory (recursively)
            const fileCount = countFiles(fullPath);

            if (isRoot) {
                console.log(`${pointer}📁 Project: ${entry} (${fileCount} files)`);
            } else if (prefix === "│   " || prefix === "    ") {
                console.log(`${prefix}${pointer}🗂️ Instance: ${entry} (${fileCount} files)`);
            } else {
                console.log(`${prefix}${pointer}${entry}`);
            }

            const newPrefix = prefix + (isLast ? "    " : "│   ");
            printTree(fullPath, newPrefix, false);
        } else {
            // Regular file
            console.log(`${prefix}${pointer}${entry}`);
        }
    });
}

// Helper to count files recursively in a directory
function countFiles(dir) {
    let count = 0;
    if (!fs.existsSync(dir)) return count;
    const entries = fs.readdirSync(dir);
    entries.forEach((entry) => {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
            count += countFiles(fullPath);
        } else {
            count += 1;
        }
    });
    return count;
}

async function confirmAndRun() {
    const env = process.env.NODE_ENV || "development";

    if (env === "production") {
        console.log("🚫 Refusing to run cleanup in production mode.");
        rl.close();
        process.exit(1);
    }

    console.log(`🧩 Environment: ${env}`);

    const uri = env === "production" ?
        process.env.MONGODB_URI_PROD :
        process.env.MONGODB_URI_DEV;

    if (!uri) {
        console.error("❌ MongoDB URI not found in .env file.");
        rl.close();
        process.exit(1);
    }

    const uploadsDir = path.resolve(__dirname, "../uploads");
    console.log("\n📂 Current uploads folder structure (projects / instances) with file counts:");
    if (fs.existsSync(uploadsDir)) {
        printTree(uploadsDir);
    } else {
        console.log("ℹ️ Uploads folder does not exist");
    }

    rl.question(
        "\n⚠️  This will DELETE all uploaded files (recursively) and database records. Continue? (y/N): ",
        async (answer) => {
            const proceed = answer.trim().toLowerCase() === "y";

            if (!proceed) {
                console.log("❎ Cancelled — no changes made.");
                rl.close();
                process.exit(0);
            }

            try {
                console.log("\n🧹 Starting cleanup...");

                // --- Connect to MongoDB ---
                await mongoose.connect(uri);
                console.log(`✅ Connected to MongoDB (${env})`);

                // --- Delete all File records ---
                const result = await File.deleteMany({});
                const deletedRecords = result.deletedCount;
                console.log(`🗑️ Deleted ${deletedRecords} file record(s) from DB`);

                // --- Clear uploads folder recursively ---
                if (fs.existsSync(uploadsDir)) {
                    fs.rmSync(uploadsDir, {
                        recursive: true,
                        force: true
                    });
                    console.log("🧹 All uploads deleted recursively");
                }

                // --- Recreate empty uploads folder ---
                fs.mkdirSync(uploadsDir, {
                    recursive: true
                });
                console.log("📁 Empty uploads folder recreated");

                // --- Summary report ---
                console.log("\n📊 Cleanup Summary:");
                console.log(`   Environment: ${env}`);
                console.log(`   Mongo URI: ${uri}`);
                console.log(`   DB records deleted: ${deletedRecords}`);
                console.log(`   Uploads folder cleared`);

                // --- Disconnect and exit ---
                await mongoose.disconnect();
                console.log("\n✅ Cleanup complete!");
                rl.close();
                process.exit(0);

            } catch (err) {
                console.error("❌ Cleanup failed:", err);
                rl.close();
                process.exit(1);
            }
        }
    );
}

// Only run if executed directly
if (require.main === module) {
    confirmAndRun();
}

module.exports = confirmAndRun;
