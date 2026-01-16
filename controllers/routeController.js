// controllers/routeController.js
const express = require("express");
const router = express.Router();
const path = require("path");
const util = require('util');
const QRCode = require('qrcode');

const {
    upload,
    handleUpload,
    handleDelete,
    handleList,
    handleListJson,
    getAllFiles
} = require("./fileSystemController");

const Session = require("../models/sessionModel");
const { generateToken } = require("../utils/token");
const { generateSessionPassword } = require("../utils/passwordGenerator");
const User = require("../models/userModel");
const facilitatorController = require("./facilitatorController");

const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');
const { ensureAdmin, ensureFacilitator } = require('../utils/auth');
const { fileAccessControl } = require('../utils/fileAccessControl');
const { sendPasswordResetEmail } = require('./emailController');
const DEBUG_CREATE_GET = process.env.DEBUG_CREATE_GET === 'true';
const { socketSessions, getIO } = require("./socketController");
const { exportSessionCsv } = require('./sessionExportController');

// ----------------------
// Static File Serving with Access Control
// ----------------------
// Apply access control middleware, then serve files if authorized
router.use("/files", fileAccessControl, express.static(path.join(__dirname, "../uploads")));

// ----------------------
// Upload Form
// ----------------------
router.get("/upload", async (req, res) => {
    const devUploader = process.env.UPLOAD_BY_DEV || "";
    
    // Fetch all organisations for dropdown
    let organisations = [];
    try {
        organisations = await Organisation.find({}).sort({ name: 1 }).lean();
    } catch (err) {
        console.error('Error fetching organisations for upload form:', err);
    }
    
    res.render("uploadForm", {
        devUploader,
        organisations,
        layout: "main",
        title: "Upload a File",
        year: new Date().getFullYear(),
    });
});

// ----------------------
// Upload Handler
// ----------------------
router.post("/upload", upload.single("file"), handleUpload);

// ----------------------
// List Uploaded Files Page
// ----------------------
router.get("/files", handleList);

// ----------------------
// Delete File
// ----------------------
router.post("/files/delete/:id", handleDelete);

// ----------------------
// Public API (already existed)
// ----------------------
router.get("/api/facilitator/files", ensureFacilitator, handleListJson);

// ----------------------
// Facilitator JSON File Browser (NEW / FIXED)
// ----------------------
router.get(
    "/facilitator/:project/:instance/files/json",
    facilitatorController.getFileBrowserJson
);

// ----------------------
// Facilitator Dashboard Page (protected)
// ----------------------
router.get("/facilitator", ensureFacilitator, async (req, res) => {
    try {
        const files = await getAllFiles();

        // Determine sessions visible to this user
        let sessions = [];
        if (req.session && String(req.session.role).toLowerCase() === 'admin') {
            sessions = await Session.find().lean();
        } else if (req.session && req.session.email) {
            const org = req.session.organisation;
            if (org) {
                sessions = await Session.find({ organisation: org }).lean();
            } else {
                sessions = await Session.find({ facilitator: req.session.email }).lean();
            }
        }

        // Respect query sessionId only if it belongs to visible sessions (or admin)
        const requestedSessionId = req.query.sessionId;
        let sessionId = null;
        if (requestedSessionId) {
            if (String(req.session.role).toLowerCase() === 'admin') {
                sessionId = requestedSessionId;
            } else if (sessions.find(s => s.sessionId === requestedSessionId)) {
                sessionId = requestedSessionId;
            }
        }

        // Fallback: use first visible session if present
        if (!sessionId) {
            if (sessions.length > 0) sessionId = sessions[0].sessionId;
            else sessionId = req.query.sessionId || 'classroom1';
        }

        const facilitatorName = req.session && req.session.email ? req.session.email : (req.query.facilitator || 'JohnDoe');

        // Get current session details for display
        const currentSession = sessions.find(s => s.sessionId === sessionId) || null;

        // Get flash messages from session
        const flash = req.session.flash || {};
        delete req.session.flash; // Clear after reading

        // Get slides for the current session (for initial render)
        let initialSlides = [];
        if (currentSession && currentSession.slides) {
            initialSlides = currentSession.slides;
        }

        res.render("facilitator", {
            title: "Facilitator Dashboard",
            layout: "main",
            files,
            sessionId,
            facilitator: facilitatorName,
            sessions,
            currentSession,
            flash,
            initialSlides: JSON.stringify(initialSlides),
        });
    } catch (err) {
        console.error("❌ Error loading files:", err);
        res.render("facilitator", {
            title: "Facilitator Dashboard",
            layout: "main",
            files: [],
            error_msg: "Failed to load files.",
            sessionId: "classroom1",
            facilitator: "JohnDoe",
            sessions: [],
        });
    }
});

// ----------------------
// Student Welcome / Entry Screen
// ----------------------
router.get("/student", (req, res) => {
    const { sessionId, removed } = req.query;

    // If a sessionId is supplied, verify status before allowing entry
    const renderWelcome = () => res.render("student-welcome", {
        title: "Join Session",
        layout: "main",
        sessionId: sessionId || null,
        removed: removed === "1"
    });

    if (!sessionId) return renderWelcome();

    Session.findOne({ sessionId }).lean().then((session) => {
        if (!session) {
            return res.render('sessionnotfound', { layout: false });
        }
        if (session.status !== 'active') {
            return res.render('session-inactive', { layout: 'main', sessionId });
        }

        // Store sessionId in server-side session for file access control (keeps file access aligned)
        req.session.studentSessionId = sessionId;
        req.session.isStudent = true;

        return renderWelcome();
    }).catch((err) => {
        console.error('Error loading session for student route:', err);
        return res.status(500).send('Server error');
    });
});

router.get("/student/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const username = req.session.studentUsername;

    // Verify student is properly logged in
    if (!req.session.isStudent || !username) {
        return res.redirect(`/student?sessionId=${encodeURIComponent(sessionId)}`);
    }

    Session.findOne({ sessionId }).lean().then((session) => {
        if (!session) {
            return res.render('sessionnotfound', { layout: false });
        }
        if (session.status !== 'active') {
            return res.render('session-inactive', { layout: 'main', sessionId });
        }

        // Render the full student view with the username from session
        return res.render("student", {
            title: "Student View",
            layout: "main-student",
            sessionId: sessionId || null,
            username: username || null
        });
    }).catch((err) => {
        console.error('Error loading student session view:', err);
        return res.status(500).send('Server error');
    });
});

router.post("/student/welcome", (req, res) => {
    const { sessionId, username } = req.body || {};

    if (!sessionId) {
        return res.render('sessionnotfound', { layout: false });
    }

    Session.findOne({ sessionId }).lean().then((session) => {
        if (!session) return res.render('sessionnotfound', { layout: false });
        if (session.status !== 'active') {
            return res.render('session-inactive', { layout: 'main', sessionId });
        }

        // Check for duplicate username (only among connected students)
        const duplicate = session.students && session.students.find(s => s.username === username && s.connected);
        if (duplicate) {
            return res.render('student-welcome', {
                title: 'Join Session',
                layout: 'main',
                sessionId: sessionId || null,
                error_msg: `The name "${username}" is already in use. Please choose a different name.`,
                removed: false
            });
        }

        req.session.studentSessionId = sessionId;
        req.session.studentUsername = username;
        req.session.isStudent = true;

        // Redirect to the student session view instead of rendering it directly
        return res.redirect(`/student/${sessionId}`);
    }).catch((err) => {
        console.error('Error validating session on welcome:', err);
        return res.status(500).send('Server error');
    });
});

// ----------------------
// Dev Student Interface (session selector)
// ----------------------
router.get("/dev-student", async (req, res) => {
    try {
        // Fetch all non-archived sessions
        const sessions = await Session.find({ archived: { $ne: true } })
            .select('sessionId facilitator students createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .lean();
        
        res.render("dev-student", {
            title: "Dev Student Interface",
            layout: "main",
            sessions
        });
    } catch (err) {
        console.error('Error loading dev-student:', err);
        res.status(500).send('Error loading sessions');
    }
});

// ----------------------
// Share: Get or create a unique join URL for a session
// ----------------------
router.get('/session/:sessionId/share', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).send('Session not found');

        if (!session.joinToken) {
            // Generate a unique token and save
            let token;
            // Ensure uniqueness by checking collisions
            for (let i = 0; i < 5; i++) {
                token = generateToken(32);
                const exists = await Session.findOne({ joinToken: token }).lean();
                if (!exists) break;
            }
            session.joinToken = token;
            await session.save();
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const shareUrl = `${baseUrl}/${session.organisation}/${session.joinToken}`;

        // Return simple JSON for now; can be a styled page later
        res.json({ sessionId, shareUrl });
    } catch (err) {
        console.error('Error creating share URL:', err);
        res.status(500).send('Error creating share URL');
    }
});

// ----------------------
// QR Code: Display QR in popup window
// ----------------------
router.get('/session/:sessionId/qr', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).send('Session not found');

        // Ensure token exists
        if (!session.joinToken) {
            let token;
            for (let i = 0; i < 5; i++) {
                token = generateToken(32);
                const exists = await Session.findOne({ joinToken: token }).lean();
                if (!exists) break;
            }
            session.joinToken = token;
            await session.save();
        }

        // In development, use PUBLIC_URL (ngrok) if available; otherwise use request host
        const isDev = process.env.NODE_ENV === 'development';
        const baseUrl = isDev && process.env.PUBLIC_URL 
            ? process.env.PUBLIC_URL 
            : `${req.protocol}://${req.get('host')}`;
        const shareUrl = `${baseUrl}/${session.organisation}/${session.joinToken}`;

        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 2
        });

        // Render standalone popup (no layout)
        res.render('qr-popup', {
            layout: false,
            sessionId,
            shareUrl,
            qrDataUrl
        });
    } catch (err) {
        console.error('Error generating QR code:', err);
        res.status(500).send('Error generating QR code');
    }
});

// ----------------------
// Sessions API (create / archive / unarchive)
// IMPORTANT: Must be before dynamic /:org/* routes to avoid conflicts
// ----------------------

// Create a new session for the logged-in facilitator (archives prior active sessions)
router.post('/sessions/create', ensureFacilitator, async (req, res) => {
    try {
        console.log('DEBUG: /sessions/create POST route hit', {
            method: req.method,
            body: req.body,
            user: req.session && req.session.email
        });
        const facilitatorEmail = req.session && req.session.email;
        if (!facilitatorEmail) return res.status(400).send('Facilitator email missing from session');

        // Get facilitator's organization (use 'default' if not set)
        const user = await User.findOne({ email: facilitatorEmail }).lean();
        const organisation = (user && user.organisation) ? user.organisation : 'default';

        // Get sessionId from request body (now required)
        let sessionId = req.body && req.body.sessionId ? String(req.body.sessionId).trim() : null;
        if (!sessionId) {
            return res.status(400).send('Session ID is required');
        }
        sessionId = sessionId.replace(/\s+/g, '-'); // sanitize spaces to hyphens

        // Check if session with this ID already exists
        const existingSession = await Session.findOne({ sessionId }).lean();
        if (existingSession) {
            req.session.flash = req.session.flash || {};
            req.session.flash.error = req.session.flash.error || [];
            req.session.flash.error.push(`Session ID "${sessionId}" already exists. Please choose a different name.`);
            return res.redirect('/facilitator');
        }

        // Generate session password
        const sessionPassword = generateSessionPassword();

        // Create the new session in 'pending' status (not active yet)
        const newSession = await Session.create({ 
            sessionId, 
            facilitator: facilitatorEmail, 
            organisation,
            sessionPassword,
            status: 'pending',  // New sessions start as pending
            students: [], 
            assets: [], 
            currentState: [], 
            stateHistory: [],
            slides: [
                { slideId: 1, displayNumber: null, details: '' },  // Beginning slide
                { slideId: 2, displayNumber: null, details: '' }   // End slide
            ]
        });

        console.log(`✅ Created new session ${sessionId} for facilitator ${facilitatorEmail} (org: ${organisation}) with password ${sessionPassword} [status: pending] with initial B/E slides`);
        return res.redirect(`/facilitator?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (err) {
        console.error('❌ Error creating session', err);
        return res.status(500).send('Server error');
    }
});

// Activate a session (set status='active'). Only owner facilitator or admin may activate.
router.post('/sessions/:id/activate', ensureFacilitator, async (req, res) => {
    try {
        const sid = req.params.id;
        const session = await Session.findOne({ sessionId: sid });
        if (!session) return res.status(404).send('Not found');

        // Only facilitator owner or admin may activate
        const isAdmin = req.session && String(req.session.role).toLowerCase() === 'admin';
        if (!isAdmin && session.facilitator !== req.session.email) return res.status(403).send('Forbidden');

        // Check if facilitator already has an active session
        const facilitatorEmail = session.facilitator;
        const activeSession = await Session.findOne({ 
            facilitator: facilitatorEmail, 
            status: 'active',
            sessionId: { $ne: sid } // exclude the current session
        });

        if (activeSession) {
            // Flash error and redirect
            req.session.flash = req.session.flash || {};
            req.session.flash.error = req.session.flash.error || [];
            req.session.flash.error.push(`Cannot activate: you already have an active session "${activeSession.sessionId}". Please archive it first.`);
            return res.redirect(`/facilitator?sessionId=${encodeURIComponent(sid)}`);
        }

        // Set session to active
        session.status = 'active';
        session.updatedAt = new Date();
        await session.save();

        req.session.flash = req.session.flash || {};
        req.session.flash.success = req.session.flash.success || [];
        req.session.flash.success.push(`Session "${sid}" activated successfully.`);
        
        return res.redirect(`/facilitator?sessionId=${encodeURIComponent(sid)}`);
    } catch (err) {
        console.error('❌ Error activating session', err);
        return res.status(500).send('Server error');
    }
});

// Archive a session (set status='archived'). Only owner facilitator or admin may archive.
router.post('/sessions/:id/archive', ensureFacilitator, async (req, res) => {
    try {
        const sid = req.params.id;
        const session = await Session.findOne({ sessionId: sid });
        if (!session) return res.status(404).send('Not found');

        // Only facilitator owner or admin may archive
        const isAdmin = req.session && String(req.session.role).toLowerCase() === 'admin';
        if (!isAdmin && session.facilitator !== req.session.email) return res.status(403).send('Forbidden');

        session.status = 'archived';
        session.archived = true;  // Keep for backward compatibility
        session.archivedAt = new Date();
        session.updatedAt = new Date();
        await session.save();
        return res.redirect(`/facilitator?sessionId=${encodeURIComponent(sid)}`);
    } catch (err) {
        console.error('❌ Error archiving session', err);
        return res.status(500).send('Server error');
    }
});

// Unarchive a session (set status='pending'). Only owner facilitator or admin may unarchive.
router.post('/sessions/:id/unarchive', ensureFacilitator, async (req, res) => {
    try {
        const sid = req.params.id;
        const session = await Session.findOne({ sessionId: sid });
        if (!session) return res.status(404).send('Not found');

        const isAdmin = req.session && String(req.session.role).toLowerCase() === 'admin';
        if (!isAdmin && session.facilitator !== req.session.email) return res.status(403).send('Forbidden');

        // Set session to pending (not active, to prevent conflicts)
        session.status = 'pending';
        session.archived = false;  // Keep for backward compatibility
        session.archivedAt = null;
        session.updatedAt = new Date();
        await session.save();
        
        req.session.flash = req.session.flash || {};
        req.session.flash.success = req.session.flash.success || [];
        req.session.flash.success.push(`Session "${sid}" unarchived (set to pending). Use Activate to make it active.`);
        
        return res.redirect(`/facilitator?sessionId=${encodeURIComponent(sid)}`);
    } catch (err) {
        console.error('❌ Error unarchiving session', err);
        return res.status(500).send('Server error');
    }
});

// Delete a session entirely
router.post('/sessions/:id/delete', ensureFacilitator, async (req, res) => {
    try {
        const sid = req.params.id;
        const session = await Session.findOne({ sessionId: sid });
        if (!session) return res.status(404).send('Not found');

        const isAdmin = req.session && String(req.session.role).toLowerCase() === 'admin';
        if (!isAdmin && session.facilitator !== req.session.email) return res.status(403).send('Forbidden');

        // Block deletion of active sessions; surface a flash warning
        if (session.status === 'active') {
            req.session.flash = req.session.flash || {};
            req.session.flash.error = req.session.flash.error || [];
            req.session.flash.error.push(`Cannot delete session "${sid}" because it is active. Archive or deactivate it first.`);
            return res.redirect(`/facilitator?sessionId=${encodeURIComponent(sid)}`);
        }

        await Session.deleteOne({ sessionId: sid });

        req.session.flash = req.session.flash || {};
        req.session.flash.success = req.session.flash.success || [];
        req.session.flash.success.push(`Session "${sid}" deleted.`);

        return res.redirect('/facilitator');
    } catch (err) {
        console.error('❌ Error deleting session', err);
        return res.status(500).send('Server error');
    }
});

// Export a session as CSV
router.get('/sessions/:id/export.csv', ensureFacilitator, exportSessionCsv);

// ----------------------
// Forgot Password Routes (MUST come before /:org/:token to avoid route conflicts)
// ----------------------

// GET: Show forgot password form
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { title: 'Forgot Password', layout: 'main' });
});

// POST: Process forgot password request
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) {
            return res.render('forgot-password', { 
                error_msg: 'Please enter your email address', 
                layout: 'main' 
            });
        }

        const sanitizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: sanitizedEmail });

        // Always show success message (don't reveal if email exists)
        if (!user) {
            console.log(`📧 Password reset requested for non-existent email: ${sanitizedEmail}`);
            return res.render('forgot-password', { 
                success_msg: 'If that email exists, a password reset link has been sent.', 
                layout: 'main' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Save token and expiration (1 hour from now)
        user.resetPasswordToken = tokenHash;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send email
        try {
            await sendPasswordResetEmail(user.email, resetToken);
            console.log(`✅ Password reset email sent to ${user.email}`);
        } catch (emailErr) {
            console.error('❌ Failed to send password reset email:', emailErr);
            // Clear the token since email failed
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();
            
            return res.render('forgot-password', { 
                error_msg: 'Failed to send reset email. Please try again later.', 
                layout: 'main' 
            });
        }

        res.render('forgot-password', { 
            success_msg: 'If that email exists, a password reset link has been sent.', 
            layout: 'main' 
        });

    } catch (err) {
        console.error('❌ Forgot password error:', err);
        res.render('forgot-password', { 
            error_msg: 'Server error. Please try again later.', 
            layout: 'main' 
        });
    }
});

// GET: Show reset password form
router.get('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('reset-password', { 
                error_msg: 'Password reset link is invalid or has expired.', 
                expired: true,
                layout: 'main' 
            });
        }

        res.render('reset-password', { 
            token, 
            layout: 'main' 
        });

    } catch (err) {
        console.error('❌ Reset password GET error:', err);
        res.render('reset-password', { 
            error_msg: 'Server error. Please try again later.', 
            expired: true,
            layout: 'main' 
        });
    }
});

// POST: Process password reset
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body || {};

        // Validate inputs
        if (!password || !confirmPassword) {
            return res.render('reset-password', { 
                token,
                error_msg: 'Please fill in all fields.', 
                layout: 'main' 
            });
        }

        if (password !== confirmPassword) {
            return res.render('reset-password', { 
                token,
                error_msg: 'Passwords do not match.', 
                layout: 'main' 
            });
        }

        if (password.length < 6) {
            return res.render('reset-password', { 
                token,
                error_msg: 'Password must be at least 6 characters long.', 
                layout: 'main' 
            });
        }

        // Find user with valid token
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('reset-password', { 
                error_msg: 'Password reset link is invalid or has expired.', 
                expired: true,
                layout: 'main' 
            });
        }

        // Update password
        const passwordHash = await bcrypt.hash(password, 10);
        user.passwordHash = passwordHash;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        console.log(`✅ Password reset successful for ${user.email}`);

        res.render('password-reset-success', { 
            layout: 'main' 
        });

    } catch (err) {
        console.error('❌ Reset password POST error:', err);
        res.render('reset-password', { 
            token: req.params.token,
            error_msg: 'Server error. Please try again later.', 
            layout: 'main' 
        });
    }
});

// ----------------------
// Admin: Sessions + State History (MUST come before /:org/:token)
// ----------------------
router.get('/admin', ensureAdmin, async (req, res) => {
    try {
        // Populate currentState and historical state file refs
        const sessions = await Session.find()
            .populate('currentState')
            .populate('stateHistory.state')
            .lean();

        // Commented out heavy debug logging to reduce noise in server logs
        // console.log('Rendering sessionList fragment for /admin - sessions:');
        // console.log(util.inspect(sessions, { depth: 2 }));


        // Render the sessionList fragment server-side for initial HTML and for client re-use
        req.app.render('sessionList', { sessions, layout: false }, (err, sessionListHtml) => {
            if (err) {
                console.error('❌ Failed to render sessionList fragment:', err);
                return res.status(500).send('Server error');
            }

            res.render('admin', {
                title: 'Admin — Sessions',
                layout: 'main',
                sessions,
                sessionListHtml,
            });
        });
    } catch (err) {
        console.error('❌ Error loading admin sessions:', err);
        res.status(500).send('Server error');
    }
});

// Admin subroutes (MUST also come before /:org/:token)
router.get('/admin/session-list', ensureAdmin, async (req, res) => {
    try {
        const sessions = await Session.find()
            .populate('currentState')
            .populate('stateHistory.state')
            .lean();

        return req.app.render('sessionList', { sessions, layout: false }, (err, html) => {
            if (err) return res.status(500).send('Render error');
            res.send(html);
        });
    } catch (err) {
        console.error('❌ Error rendering session list fragment:', err);
        res.status(500).send('Server error');
    }
});

router.get('/admin/session/:id', ensureAdmin, async (req, res) => {
    try {
        const sid = req.params.id;
        const session = await Session.findOne({ sessionId: sid })
            .populate('currentState')
            .populate('stateHistory.state')
            .lean();
        if (!session) return res.status(404).json({ error: 'Not found' });
        return res.json({ session });
    } catch (err) {
        console.error('❌ Error loading session detail:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ----------------------
// Admin: Organisation Management
// ----------------------
const Organisation = require('../models/organisationModel');

// List organisations
router.get('/admin/organisations', ensureAdmin, async (req, res) => {
    try {
        const organisations = await Organisation.find().sort({ name: 1 }).lean();
        
        // Get all facilitators grouped by organisation
        const facilitators = await User.find({ role: 'Facilitator' })
            .select('email organisation createdAt')
            .sort({ organisation: 1, email: 1 })
            .lean();
        
        // Create a map of organisation code -> facilitators array
        const facilitatorsByOrg = {};
        facilitators.forEach(fac => {
            const org = fac.organisation || 'none';
            if (!facilitatorsByOrg[org]) {
                facilitatorsByOrg[org] = [];
            }
            facilitatorsByOrg[org].push(fac);
        });
        
        // Get base URL for registration links
        const isDev = process.env.NODE_ENV === 'development';
        const baseUrl = isDev && process.env.PUBLIC_URL 
            ? process.env.PUBLIC_URL 
            : `${req.protocol}://${req.get('host')}`;
        
        // Attach facilitator list and QR code to each organisation
        for (const org of organisations) {
            org.facilitators = facilitatorsByOrg[org.code] || [];
            
            // Generate QR code for facilitator registration
            const registerUrl = `${baseUrl}/register?org=${org.code}`;
            try {
                org.qrCode = await QRCode.toDataURL(registerUrl, {
                    errorCorrectionLevel: 'M',
                    margin: 1,
                    width: 200
                });
            } catch (err) {
                console.error(`Error generating QR code for org ${org.code}:`, err);
                org.qrCode = null;
            }
        }
        
        // Get flash messages
        const flash = req.session.flash || {};
        delete req.session.flash;
        
        res.render('admin-organisations', {
            title: 'Manage Organisations',
            layout: 'main',
            organisations,
            facilitators,
            flash
        });
    } catch (err) {
        console.error('❌ Error loading organisations:', err);
        res.status(500).send('Server error');
    }
});

// Create organisation (POST)
router.post('/admin/organisations/create', ensureAdmin, async (req, res) => {
    try {
        const { name, code, description, maxFacilitators } = req.body;
        
        if (!name || !code) {
            req.session.flash = { error_msg: 'Name and code are required' };
            return res.redirect('/admin/organisations');
        }
        
        const organisation = new Organisation({
            name: name.trim(),
            code: code.trim().toLowerCase(),
            description: description || '',
            maxFacilitators: parseInt(maxFacilitators) || 3,
            createdBy: req.session.email || 'admin',
            token: Organisation.generateToken()
        });
        
        await organisation.save();
        
        req.session.flash = { success_msg: `Organisation "${name}" created successfully` };
        res.redirect('/admin/organisations');
    } catch (err) {
        console.error('❌ Error creating organisation:', err);
        if (err.code === 11000) {
            req.session.flash = { error_msg: 'Organisation name or code already exists' };
        } else {
            req.session.flash = { error_msg: 'Failed to create organisation' };
        }
        res.redirect('/admin/organisations');
    }
});

// Regenerate token
router.post('/admin/organisations/:id/regenerate-token', ensureAdmin, async (req, res) => {
    try {
        const org = await Organisation.findById(req.params.id);
        if (!org) {
            req.session.flash = { error_msg: 'Organisation not found' };
            return res.redirect('/admin/organisations');
        }
        org.token = Organisation.generateToken();
        await org.save();
        req.session.flash = { success_msg: `New token generated for ${org.name}` };
        res.redirect('/admin/organisations');
    } catch (err) {
        console.error('❌ Error regenerating token:', err);
        req.session.flash = { error_msg: 'Failed to regenerate token' };
        res.redirect('/admin/organisations');
    }
});

// Toggle organisation active status
router.post('/admin/organisations/:id/toggle', ensureAdmin, async (req, res) => {
    try {
        const org = await Organisation.findById(req.params.id);
        if (!org) {
            req.session.flash = { error_msg: 'Organisation not found' };
            return res.redirect('/admin/organisations');
        }
        
        org.active = !org.active;
        await org.save();
        
        req.session.flash = { success_msg: `Organisation ${org.active ? 'activated' : 'deactivated'}` };
        res.redirect('/admin/organisations');
    } catch (err) {
        console.error('❌ Error toggling organisation:', err);
        req.session.flash = { error_msg: 'Failed to update organisation' };
        res.redirect('/admin/organisations');
    }
});

// Delete organisation
router.post('/admin/organisations/:id/delete', ensureAdmin, async (req, res) => {
    try {
        const Facilitator = require('../models/facilitatorModel');
        
        // Check if any facilitators are using this organisation
        const facilitatorCount = await Facilitator.countDocuments({ organisation: req.params.id });
        if (facilitatorCount > 0) {
            req.session.flash = { error_msg: `Cannot delete: ${facilitatorCount} facilitator(s) are assigned to this organisation` };
            return res.redirect('/admin/organisations');
        }
        
        await Organisation.findByIdAndDelete(req.params.id);
        
        req.session.flash = { success_msg: 'Organisation deleted successfully' };
        res.redirect('/admin/organisations');
    } catch (err) {
        console.error('❌ Error deleting organisation:', err);
        req.session.flash = { error_msg: 'Failed to delete organisation' };
        res.redirect('/admin/organisations');
    }
});

// ----------------------
// Join by token: Resolve token → session and render student
// ----------------------
router.get('/:org/:token', async (req, res) => {
    try {
        const { org, token } = req.params;
        
        // Always clear session data on entry - forces fresh name modal each time
        delete req.session.studentSessionId;
        delete req.session.isStudent;
        req.session.save((err) => {
            if (err) console.error('Session save error:', err);
        });
        
        // Check if token is a joinToken (long random string) or a sessionId
        // joinTokens are 32+ chars, sessionIds are typically shorter
        if (token.length >= 20) {
            // Token-based passwordless entry
            const session = await Session.findOne({ joinToken: token }).lean();
            if (!session) {
                return res.render('sessionnotfound', {
                    layout: false
                });
            }

            // Validate organization matches
            if (session.organisation !== org) {
                return res.render('sessionnotfound', {
                    layout: false
                });
            }

            if (session.status !== 'active') {
                return res.render('session-inactive', { layout: 'main', sessionId: session.sessionId });
            }

            // Store sessionId in server-side session for file access control
            req.session.studentSessionId = session.sessionId;
            req.session.isStudent = true;

            // Render welcome screen; username captured client-side
            return res.render('student-welcome', {
                title: 'Join Session',
                layout: 'main',
                sessionId: session.sessionId,
                removed: false
            });
        } else {
            // sessionId-based password-protected entry (GET shows password prompt)
            const sessionId = token; // token is actually the sessionId
            const session = await Session.findOne({ sessionId, organisation: org }).lean();
            if (!session) {
                return res.render('sessionnotfound', {
                    layout: false
                });
            }

            if (session.status !== 'active') {
                return res.render('session-inactive', { layout: 'main', sessionId });
            }

            // Show password prompt
            return res.render('password-prompt', {
                layout: false,
                sessionId,
                org
            });
        }
    } catch (err) {
        console.error('Error joining session:', err);
        res.status(500).send('Error joining session');
    }
});

// Password-protected entry: POST handler
router.post('/:org/:sessionId', async (req, res) => {
    try {
        const { org, sessionId } = req.params;
        const { password } = req.body;

        // Always clear session data on entry - forces fresh name modal each time
        delete req.session.studentSessionId;
        delete req.session.isStudent;
        req.session.save((err) => {
            if (err) console.error('Session save error:', err);
        });

        const session = await Session.findOne({ sessionId, organisation: org }).lean();
        if (!session) {
            return res.render('sessionnotfound', {
                layout: false
            });
        }

        if (session.status !== 'active') {
            return res.render('session-inactive', { layout: 'main', sessionId });
        }

        // Validate password
        if (password !== session.sessionPassword) {
            return res.render('password-prompt', {
                layout: false,
                sessionId,
                org,
                error: 'Incorrect password. Please try again.'
            });
        }

        // Store sessionId in server-side session for file access control
        req.session.studentSessionId = session.sessionId;
        req.session.isStudent = true;

        // Password correct - show welcome entry screen for name
        return res.render('student-welcome', {
            title: 'Join Session',
            layout: 'main',
            sessionId: session.sessionId,
            removed: false
        });
    } catch (err) {
        console.error('Error validating session password:', err);
        res.status(500).send('Error joining session');
    }
});


// ----------------------
// Auth: register / login / logout (minimal prototype)
// ----------------------

router.get('/register', async (req, res) => {
    try {
        const organisations = await Organisation.find({ active: true }).sort({ name: 1 }).lean();
        
        // Check if org code is provided in query string (from QR code)
        const preselectedOrg = req.query.org || null;
        
        res.render('register', { 
            title: 'Register', 
            layout: 'main',
            organisations,
            preselectedOrg
        });
    } catch (err) {
        console.error('❌ Error loading organisations for registration:', err);
        res.render('register', { 
            title: 'Register', 
            layout: 'main',
            organisations: [],
            error_msg: 'Failed to load organisations. Please try again later.' 
        });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { email, password, organisation } = req.body || {};
        
        // Load organisations for re-rendering form on error
        const organisations = await Organisation.find({ active: true }).sort({ name: 1 }).lean();
        
        if (!email || !validator.isEmail(email) || !password || password.length < 6) {
            return res.render('register', { 
                error_msg: 'Invalid email or password (min 6 chars)', 
                layout: 'main',
                organisations 
            });
        }
        
        if (!organisation) {
            return res.render('register', { 
                error_msg: 'Please select an organisation', 
                layout: 'main',
                organisations 
            });
        }

        // Validate organisation exists and is active
        const org = await Organisation.findOne({ code: organisation, active: true });
        if (!org) {
            return res.render('register', { 
                error_msg: 'Invalid organisation selected', 
                layout: 'main',
                organisations 
            });
        }

        // Validate provided token matches organisation token
        const providedToken = String(req.body.orgToken || '').trim().toUpperCase();
        const expectedToken = String(org.token || '').trim().toUpperCase();
        if (!expectedToken || providedToken !== expectedToken) {
            return res.render('register', {
                error_msg: 'Invalid or missing organisation token',
                layout: 'main',
                organisations
            });
        }

        // Check facilitator limit for this organisation
        const facilitatorCount = await User.countDocuments({ organisation: organisation, role: 'Facilitator' });
        if (facilitatorCount >= org.maxFacilitators) {
            return res.render('register', { 
                error_msg: `Organisation "${org.name}" has reached its maximum of ${org.maxFacilitators} facilitators`, 
                layout: 'main',
                organisations 
            });
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.render('register', { 
                error_msg: 'Email already registered', 
                layout: 'main',
                organisations 
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ 
            email: email.toLowerCase().trim(), 
            passwordHash, 
            role: 'Facilitator', 
            organisation: organisation 
        });

        // Set session
        req.session.userId = user._id;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.organisation = user.organisation;

        // Redirect admin users to the admin console, others to the facilitator dashboard
        console.log(`user role: ${user.role}`);
        if (user.role === 'admin') return res.redirect('/admin');
        return res.redirect('/facilitator');
    } catch (err) {
        console.error('❌ Register error', err);
        const organisations = await Organisation.find({ active: true }).sort({ name: 1 }).lean();
        return res.render('register', { 
            error_msg: 'Server error', 
            layout: 'main',
            organisations 
        });
    }
});

router.get('/login', (req, res) => {
    res.render('login', { title: 'Login', layout: 'main' });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.render('login', { error_msg: 'Missing credentials', layout: 'main' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            console.log(`login failed: no account for ${email}`);
            return res.render('login', { error_msg: 'No account found for that email', layout: 'main' });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            console.log(`login failed: incorrect password for ${email}`);
            return res.render('login', { error_msg: 'Incorrect password', layout: 'main' });
        }

        // Successful login
        req.session.userId = user._id;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.organisation = user.organisation;

        console.log(`login: user=${user.email} role=${user.role}`);
        if (String(user.role).toLowerCase() === 'admin') return res.redirect('/admin');
        return res.redirect('/facilitator');
    } catch (err) {
        console.error('❌ Login error', err);
        return res.render('login', { error_msg: 'Server error', layout: 'main' });
    }
});

router.post('/logout', (req, res) => {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'connect.sid';
    req.session.destroy((err) => {
        if (err) console.error('❌ Error destroying session on logout', err);
        // Clear the session cookie so the browser doesn't keep sending it
        try { res.clearCookie(cookieName); } catch (e) { /* ignore */ }
        return res.redirect('/');
    });
});

// ----------------------
// Leave Session (for students)
// ----------------------
router.post('/leave-session', async (req, res) => {
    const { sessionId, username } = req.body || {};

    // Clear student session data
    if (req.session) {
        delete req.session.studentSessionId;
        delete req.session.isStudent;
        req.session.save((err) => {
            if (err) console.error('Session save error on leave:', err);
        });
    }

    let removed = false;

    // Remove the student from the session record so facilitator UI updates reflect the leave
    if (sessionId && username) {
        try {
            const session = await Session.findOne({ sessionId });
            if (session) {
                const idx = session.students.findIndex(s => s.username === username);
                if (idx !== -1) {
                    const removedStudent = session.students[idx];
                    session.students.splice(idx, 1);
                    await session.save();
                    removed = true;

                    // Update in-memory tracking and notify facilitator if connected
                    const studentList = socketSessions[sessionId]?.students;
                    if (studentList) {
                        const pos = studentList.indexOf(removedStudent.socketId);
                        if (pos !== -1) studentList.splice(pos, 1);
                    }

                    const io = typeof getIO === 'function' ? getIO() : null;
                    const facSock = socketSessions[sessionId]?.facilitator;
                    if (io && facSock) {
                        io.to(facSock).emit("studentListUpdated", session.students);
                    }
                }
            }
        } catch (err) {
            console.error('Error removing student on leave-session:', err);
        }
    }

    // Return JSON so fetch can properly handle the response
    return res.json({ success: true, removed });
});


// ----------------------
// Create Admin (dev helper)
// ----------------------
router.get('/create-admin', (req, res) => {
    // Allow using env override or an already authenticated admin
    if (process.env.ADMIN_OVERRIDE !== 'true' && !(req.session && req.session.role === 'admin')) {
        return res.status(403).send('Forbidden');
    }
    res.render('create-admin', { title: 'Create Admin', layout: 'main' });
});

router.post('/create-admin', async (req, res) => {
    try {
        if (process.env.ADMIN_OVERRIDE !== 'true' && !(req.session && req.session.role === 'admin')) {
            return res.status(403).send('Forbidden');
        }

        const { email, password } = req.body || {};
        if (!email || !password) return res.render('create-admin', { error_msg: 'Missing fields', layout: 'main' });

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) return res.render('create-admin', { error_msg: 'Email already exists', layout: 'main' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ email: email.toLowerCase().trim(), passwordHash, role: 'admin' });

        req.session.userId = user._id;
        req.session.role = user.role;

        return res.redirect('/admin');
    } catch (err) {
        console.error('❌ create-admin error', err);
        return res.render('create-admin', { error_msg: 'Server error', layout: 'main' });
    }
});

// ----------------------
// Homepage
// ----------------------
router.get("/", (req, res) => {
    console.log('fooooo');
    res.render('home', {
        title: 'Home',
        layout: 'main',
        year: new Date().getFullYear(),
    });
});

// Optional debug endpoint: respond to GET /sessions/create to confirm accidental GETs
if (DEBUG_CREATE_GET) {
    router.get('/sessions/create', (req, res) => {
        console.log('DEBUG: GET /sessions/create hit');
        res.status(200).send('DEBUG: GET /sessions/create was hit. The form should POST here; check client-side or middleware.');
    });
}


module.exports = router;

