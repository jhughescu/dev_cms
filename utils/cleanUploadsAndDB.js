//require("dotenv").config({
//    path: "../.env"
//});
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const File = require("../models/metadataModel");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function confirmAndRun() {
    const env = process.env.NODE_ENV || "development";

    // Prevent accidental production cleanup
    if (env === "production") {
        console.log("🚫 Refusing to run cleanup in production mode.");
        rl.close();
        process.exit(1);
    }

    console.log(`🧩 Environment: ${env}`);

    // Use only your defined variables
    const uri =
        env === "production" ?
        process.env.MONGODB_URI_PROD // production URI
        :
        process.env.MONGODB_URI_DEV; // development URI
    if (!uri) {
        console.error("❌ MongoDB URI not found in .env file.");
        rl.close();
        process.exit(1);
    }

    rl.question(
        "⚠️  This will DELETE all uploaded files and database records. Continue? (y/N): ",
        async (answer) => {
            const proceed = answer.trim().toLowerCase() === "y";

            if (!proceed) {
                console.log("❎ Cancelled — no changes made.");
                rl.close();
                process.exit(0);
            }

            try {
                console.log("\n🧹 Starting cleanup...");

                // 1️⃣ Connect to MongoDB
                await mongoose.connect(uri);
                console.log(`✅ Connected to MongoDB (${env})`);

                // 2️⃣ Delete all File records
                const result = await File.deleteMany({});
                const deletedRecords = result.deletedCount;
                console.log(`🗑️ Deleted ${deletedRecords} file record(s) from DB`);

                // 3️⃣ Clear uploads folder
                const uploadsDir = path.resolve(__dirname, "../uploads");
                let deletedFiles = 0;

                if (fs.existsSync(uploadsDir)) {
                    const files = fs.readdirSync(uploadsDir);
                    if (files.length > 0) {
                        files.forEach((file) => fs.unlinkSync(path.join(uploadsDir, file)));
                        deletedFiles = files.length;
                    }
                    console.log(
                        deletedFiles > 0 ?
                        `🧾 Deleted ${deletedFiles} file(s) from uploads folder` :
                        "ℹ️ No files to delete in uploads folder"
                    );
                } else {
                    fs.mkdirSync(uploadsDir);
                    console.log("📁 uploads folder created");
                }

                // 4️⃣ Summary report
                console.log("\n📊 Cleanup Summary:");
                console.log(`   Environment: ${env}`);
                console.log(`   Mongo URI: ${uri}`);
                console.log(`   DB records deleted: ${deletedRecords}`);
                console.log(`   Files deleted: ${deletedFiles}`);

                // 5️⃣ Done
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

confirmAndRun();
