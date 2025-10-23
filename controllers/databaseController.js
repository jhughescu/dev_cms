// controllers/databaseController.js
const mongoose = require("mongoose");
require("dotenv").config({ quiet: true });

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("ℹ️ MongoDB already connected");
    return mongoose.connection;
  }

  try {
    const env = process.env.NODE_ENV || "development";
    const MONGO_URI =
      env === "production"
        ? process.env.MONGODB_URI_PROD
        : process.env.MONGODB_URI_DEV;

    if (!MONGO_URI) {
      throw new Error("❌ MONGODB_URI missing in .env file");
    }

    await mongoose.connect(MONGO_URI, {
      // optional best practices:
      autoIndex: false,
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log("✅ Connected to MongoDB");
    return mongoose.connection;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = { connectDB, mongoose };
