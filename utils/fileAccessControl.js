// utils/fileAccessControl.js
const path = require('path');
const fs = require('fs');
const Session = require('../models/sessionModel');
const File = require('../models/metadataModel');

/**
 * Middleware to control access to uploaded files
 * Students can only access files that are in their session's currentState
 * Facilitators and admins have unrestricted access
 */
async function fileAccessControl(req, res, next) {
    try {
        const requestedPath = req.path;
        // Extract just the filename(s) from the path, keeping the relative path structure
        // e.g. /files/cms/main/uploads/2025/12/123456-file.svg → cms/main/uploads/2025/12/123456-file.svg
        let relativePath = requestedPath.replace(/^\/files/, '');
        // Remove leading slash if present
        if (relativePath.startsWith('/')) {
            relativePath = relativePath.substring(1);
        }
        
        // Check if user is facilitator or admin (unrestricted access)
        const isFacilitator = req.session && (
            String(req.session.role).toLowerCase() === 'facilitator' ||
            String(req.session.role).toLowerCase() === 'admin'
        );
        
        if (isFacilitator) {
            // Facilitators/admins get unrestricted access
            return next();
        }

        // For students: check if file is in their session's currentState
        const sessionId = req.session?.studentSessionId || req.query.sessionId;
        
        if (!sessionId) {
            console.log(`🚫 [File Access] Access denied - no session ID`);
            return res.status(403).send('Access denied: No active session');
        }

        // Find the session
        const session = await Session.findOne({ sessionId }).populate('currentState');
        
        if (!session) {
            console.log(`🚫 [File Access] Access denied - session not found: ${sessionId}`);
            return res.status(403).send('Access denied: Invalid session');
        }

        // Check if the requested file is in currentState
        const fileMetadata = await File.findOne({ url: `/files/${relativePath}` });
        
        if (!fileMetadata) {
            return res.status(404).send('File not found');
        }

        // currentState is populated, so items are full File documents, extract _id
        const currentStateIds = session.currentState.map(item => 
            (item._id || item).toString()
        );

        // Check if file is in session's currentState
        const isAllowed = currentStateIds.some(id => id === fileMetadata._id.toString());

        if (isAllowed) {
            return next();
        } else {
            console.log(`🚫 [File Access] Access denied - file not in session currentState: ${fileMetadata.originalName} (session: ${sessionId})`);
            return res.status(403).send('Access denied: File not available in your session');
        }

    } catch (err) {
        console.error('❌ [File Access] Error:', err);
        return res.status(500).send('Server error');
    }
}

module.exports = { fileAccessControl };
