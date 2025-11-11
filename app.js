// app.js
require("dotenv").config({ quiet: true });
const express = require("express");
const exphbs = require("express-handlebars");
const session = require("express-session");
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");
const path = require("path");
const http = require("http");                            // ✅ NEW

const { connectDB, mongoose } = require("./controllers/databaseController");
const { initSocket } = require("./controllers/socketController");
const routes = require("./controllers/routeController");
const hbsHelpers = require("./utils/hbsHelpers");
const { updateAtlasIP } = require("./utils/atlas-ip-manager");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Development logging
if (process.env.NODE_ENV === "development") {
    const morgan = require("morgan");
    app.use(
        morgan("dev", {
            skip: (req, res) => res.statusCode < 400
        })
    );
}

(async function startServer() {
    try {
        // 1️⃣ Auto-whitelist IP for MongoDB Atlas
        await updateAtlasIP({
            projectId: process.env.ATLAS_PROJECT_ID,
            apiPublicKey: process.env.ATLAS_API_PUBLIC_KEY,
            apiPrivateKey: process.env.ATLAS_API_PRIVATE_KEY,
            logFile: "./logs/atlas-ip.log",
        });

        // 2️⃣ Connect to MongoDB
        await connectDB();

        // 3️⃣ Setup Handlebars
        app.engine(
            "hbs",
            exphbs.engine({
                extname: "hbs",
                defaultLayout: "main",
                helpers: hbsHelpers,
            })
        );
        app.set("view engine", "hbs");
        app.set("views", path.join(__dirname, "views"));

        // 4️⃣ Middleware
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());
        app.use(express.static(path.join(__dirname, "public")));

        // 5️⃣ Sessions + Flash
        app.use(
            session({
                secret: process.env.SESSION_SECRET || "supersecretkey",
                resave: false,
                saveUninitialized: false,
                store: MongoStore.create({
                    client: mongoose.connection.getClient(),
                    collectionName: "sessions",
                    ttl: 14 * 24 * 60 * 60, // 14 days
                }),
            })
        );
        app.use(flash());

        // 6️⃣ Routes
        app.use("/", routes);

        // ✅✅✅ 7️⃣ Create HTTP server (instead of app.listen)
        const httpServer = http.createServer(app);

        // ✅ Initialise Socket.IO on the HTTP server
        initSocket(httpServer);

        // ✅ Start listening
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error("❌ Startup failed:", err);
        process.exit(1);
    }
})();
