<!-- .github/copilot-instructions.md: Project-specific instructions for AI coding agents -->
# dev_cms — Copilot instructions

Purpose: short, actionable guidance so an AI coding agent can be productive immediately in this repo.

- Run / build
  - Dev: `npm run dev` — runs `sass --watch` and `nodemon app.js` concurrently.
  - Production start: `npm run start` — builds CSS then runs `node app.js` with `NODE_ENV=production`.
  - Build CSS only: `npm run build:css` (uses `sass src/scss/app.scss public/css/style.css`).
  - Clean uploads/db: `npm run clean:uploads` runs `node utils/cleanUploadsAndDB.js`.

- Big picture (architecture)
  - `app.js` is the entry point. It:
    - updates MongoDB Atlas IP (via `utils/atlas-ip-manager.js`) on startup,
    - connects to MongoDB through `controllers/databaseController.js`,
    - configures Handlebars view engine (`utils/hbsHelpers.js` helpers),
    - mounts routes from `controllers/routeController.js`,
    - creates an HTTP server and initialises Socket.IO via `controllers/socketController.js`.
  - Uploads are stored on disk (under `uploads/`) and metadata is persisted to MongoDB (see `controllers/fileSystemController.js` and `models/metadataModel.js`).

- Key integration points & expectations
  - MongoDB Atlas: env vars `ATLAS_PROJECT_ID`, `ATLAS_API_PUBLIC_KEY`, `ATLAS_API_PRIVATE_KEY`, and `MONGODB_URI_DEV` / `MONGODB_URI_PROD` must be present for DB + Atlas IP manager to work.
    - The Atlas IP manager may open a browser if API access is denied (Windows `start` used).
  - Sessions: `express-session` persisted using `connect-mongo` (see `app.js` session config).
  - Socket.IO: uses a shared HTTP server — register socket handlers in `controllers/socketHandlers/*.js` and expose them via `controllers/socketController.js`.

- Project-specific patterns & conventions
  - Async/await favored; errors handled with `try/catch` and console logging (emoji prefixes are common).
  - Socket handlers are wrapped with `utils/socketUtils.safeHandler(fn)` to surface async errors safely.
  - File upload flow:
    - `controllers/fileSystemController.js` configures `multer` disk storage.
    - Uploaded files are renamed to a timestamp + sanitized base (`utils/sanitiseInput.js`).
    - Metadata saved to `models/metadataModel.js` including a SHA-256 `hash` to detect duplicates.
  - Handlebars helpers are centralized at `utils/hbsHelpers.js` — use these helpers in templates rather than adding new logic in views.

- How to modify / extend
  - Routes: add express routes in `controllers/routeController.js` or create new routers and mount them in `app.js`.
  - Socket events: add a file `controllers/socketHandlers/<eventName>.js` exporting a handler (signature usually `(io, socket, data, socketSessions)`) and import/register it in `controllers/socketController.js` using `safeHandler`.
    - Example registration: `socket.on("myEvent", data => safeHandler(() => handleMyEvent(io, socket, data, socketSessions)))`.
  - New upload logic: update/extend `controllers/fileSystemController.js` and ensure storage paths come from `utils/uploadPath.js`.

- Helpful code examples (copyable)
  - Add socket handler file skeleton:
    ```js
    // controllers/socketHandlers/myEvent.js
    module.exports.handleMyEvent = async (io, socket, data, socketSessions) => {
      // validate data, update socketSessions, emit events
    };
    ```

- Environment & safety notes
  - Many features depend on env vars. For local development you can create a `.env` file. Key vars: `PORT`, `NODE_ENV`, `SESSION_SECRET`, `UPLOAD_BY_DEV`, `MONGODB_URI_DEV`, Atlas keys above.
  - `utils/atlas-ip-manager.js` performs network calls to Atlas API on startup — if credentials are incorrect the app may exit. Avoid changing this behavior without understanding Atlas API flow.

- Files to inspect first when debugging
  - `app.js` — startup flow and socket initialisation
  - `controllers/databaseController.js` — Mongo connection logic
  - `controllers/fileSystemController.js` — upload + metadata save flow
  - `controllers/socketController.js` + `controllers/socketHandlers/` — real-time flows
  - `utils/atlas-ip-manager.js` — Atlas whitelist automation and common failure modes

If anything in these instructions is unclear or you want additional examples (unit tests, sample `.env`, or a small starter script for sockets), tell me which part and I will iterate.
