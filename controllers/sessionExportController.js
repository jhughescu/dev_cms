const Session = require("../models/sessionModel");

function csvEscape(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function formatDate(val) {
    return val ? new Date(val).toISOString() : "";
}

async function exportSessionCsv(req, res) {
    try {
        const sid = req.params.id;
        const session = await Session.findOne({ sessionId: sid })
            .populate('stateHistory.state')
            .lean();
        if (!session) return res.status(404).send("Session not found");

        const isAdmin = req.session && String(req.session.role).toLowerCase() === "admin";
        if (!isAdmin && session.facilitator !== req.session.email) {
            return res.status(403).send("Forbidden");
        }

        const filename = `session-${sid}.csv`;
        res.setHeader("Content-Type", "text/csv;charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);

        const rows = [];

        // Section 1: Session metadata + students
        const studentHeader = [
            "rowType",
            "sessionId",
            "facilitator",
            "organisation",
            "status",
            "createdAt",
            "updatedAt",
            "studentUsername",
            "joinedAt",
            "lastActive",
            "connected"
        ];
        rows.push(studentHeader.join(","));

        const students = session.students && session.students.length ? session.students : [null];
        students.forEach((student) => {
            const row = [
                csvEscape("student"),
                csvEscape(session.sessionId),
                csvEscape(session.facilitator),
                csvEscape(session.organisation || ""),
                csvEscape(session.status || ""),
                csvEscape(formatDate(session.createdAt)),
                csvEscape(formatDate(session.updatedAt)),
                csvEscape(student ? student.username : ""),
                csvEscape(student ? formatDate(student.joinedAt) : ""),
                csvEscape(student ? formatDate(student.lastActive) : ""),
                csvEscape(student ? (student.connected ? "true" : "false") : "")
            ];
            rows.push(row.join(","));
        });

        // Section 2: State history (different schema)
        if (session.stateHistory && session.stateHistory.length > 0) {
            rows.push(""); // blank separator row
            const historyHeader = [
                "rowType",
                "sessionId",
                "timestamp",
                "fileId",
                "fileName",
                "mimetype",
                "url"
            ];
            rows.push(historyHeader.join(","));

            session.stateHistory.forEach((snapshot) => {
                const snapshotTime = formatDate(snapshot.timestamp);
                const files = snapshot.state || [];
                
                if (files.length === 0) {
                    // Empty snapshot
                    rows.push([
                        csvEscape("stateHistory"),
                        csvEscape(session.sessionId),
                        csvEscape(snapshotTime),
                        csvEscape(""),
                        csvEscape(""),
                        csvEscape(""),
                        csvEscape("")
                    ].join(","));
                } else {
                    files.forEach((file) => {
                        rows.push([
                            csvEscape("stateHistory"),
                            csvEscape(session.sessionId),
                            csvEscape(snapshotTime),
                            csvEscape(file._id ? String(file._id) : ""),
                            csvEscape(file.originalName || ""),
                            csvEscape(file.mimetype || ""),
                            csvEscape(file.url || "")
                        ].join(","));
                    });
                }
            });
        }

        res.send(rows.join("\n"));
    } catch (err) {
        console.error("❌ Error exporting session CSV", err);
        res.status(500).send("Server error while exporting session");
    }
}

module.exports = { exportSessionCsv };
