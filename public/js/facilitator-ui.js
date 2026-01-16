import { addFlashMessage } from "./flash.js";
export class FacilitatorUI {
    constructor(socketInstance) {
        this.socket = socketInstance || null;

        // Match template elements
        this.studentListContainer = document.getElementById("student-list-container");
        this.studentList = document.getElementById("student-list");
        this.statusDiv = document.getElementById("status");
        this.fileListContainer = document.getElementById("file-list-container");

        // Track students by username → { joinedAt, element, idleTimer }
        this.students = new Map();
        this.durationInterval = null;

        // Bind custom DOM events
        document.addEventListener("studentJoined", (e) => this.addStudent(e.detail));
        document.addEventListener("studentLeft", (e) => this.removeStudent(e.detail.username));
        document.addEventListener("studentListUpdated", (e) => this.renderStudents(e.detail));
        document.addEventListener("sessionReset", () => this.resetList());
        document.addEventListener("studentActive", (e) => this.markActive(e.detail));
        document.addEventListener("sendFilesToStudents", (e) => this.handleFilesSent(e.detail));

        // Listen for sessionLocked event and show a flash message
        document.addEventListener("sessionLocked", (e) => {
            const msg = e.detail && e.detail.message ? e.detail.message : "Session is archived and cannot be modified.";
            console.log('[FacilitatorUI] sessionLocked event received:', msg);
            addFlashMessage(msg, "error", 5000);
            // Don't use showStatus - flash message is enough
        });

        // Remove student button handler (event delegation)
        if (this.studentList) {
            this.studentList.addEventListener("click", (e) => {
                const btn = e.target.closest("button.remove-student-btn");
                if (!btn) return;
                const username = btn.dataset.username;
                if (this.socket && typeof this.socket.removeStudent === "function") {
                    this.socket.removeStudent(username);
                }
            });
        }

        // Start periodic updates
        this.startDurationUpdates();
    }

    // Remove duplicate sessionLocked event listener outside constructor (invalid syntax)

    addStudent({
        username,
        joinedAt
    }) {
        if (!this.studentList || this.students.has(username)) return;

        const li = document.createElement("li");
        const joinTime = new Date(joinedAt);
        li.innerHTML = `
            <strong>${username}</strong> — joined at ${joinTime.toLocaleTimeString()}
            (<span class="duration">0m</span> ago)
            <br><small class="last-active">Last active: ${joinTime.toLocaleTimeString()}</small>
        `;

        li.dataset.username = username;

        this.studentList.appendChild(li);
        this.students.set(username, {
            joinedAt: joinTime,
            element: li
        });
    }

    removeStudent(username) {
        const data = this.students.get(username);
        if (data) {
            const {
                element
            } = data;
            element.innerHTML = `<s>${username}</s> — left (${new Date().toLocaleTimeString()})`;
            this.students.delete(username);
        }
    }

    /** Render the list of students with their connection status */
    renderStudents(students) {
        if (!this.studentListContainer) return;

        const list = document.getElementById("student-list");
        list.innerHTML = "";
        this.students.clear();

        if (!students || students.length === 0) {
            list.innerHTML = "<li>No students connected.</li>";
            return;
        }

        students.forEach(student => {
            const li = document.createElement("li");
            li.classList.add("student-list-item", student.connected ? "online" : "offline");

            const joined = student.joinedAt ? new Date(student.joinedAt).toLocaleTimeString() : "—";
            const lastActive = student.lastActive ? new Date(student.lastActive).toLocaleTimeString() : "—";
            const browser = student.browser || "—";
            const os = student.os || "—";

            li.innerHTML = `
                <div style="flex: 0 0 150px;"><strong>${student.username}</strong></div>
                <div style="flex: 0 0 100px;">${student.connected ? "🟢 Online" : "🔴 Offline"}</div>
                <div style="flex: 0 0 250px;">Joined: ${joined} | <span class="duration">0m</span></div>
                <div style="flex: 0 0 120px;">${browser} / ${os}</div>
                <div style="flex: 1; min-width: 150px;"><small class="last-active">Last active: ${lastActive}</small></div>
                <button class="remove-student-btn" data-username="${student.username}" style="flex-shrink: 0;">Remove</button>
            `;
            list.appendChild(li);

            // Track for duration and activity updates
            this.students.set(student.username, {
                joinedAt: student.joinedAt ? new Date(student.joinedAt) : new Date(),
                element: li,
                idleTimer: null
            });
        });
    }

    /** Show a brief status message (e.g., session reset, asset sent) */
    showStatus(message) {
        if (this.statusDiv) {
            this.statusDiv.textContent = message;
            setTimeout(() => (this.statusDiv.textContent = ""), 4000);
        }
    }

    resetList() {
        if (this.studentList) this.studentList.innerHTML = "";
        this.students.clear();
    }

    startDurationUpdates() {
        this.durationInterval = setInterval(() => this.refreshDurations(), 10000);
    }

    refreshDurations() {
        const now = Date.now();
        for (const {
                joinedAt,
                element
            } of this.students.values()) {
            const mins = Math.floor((now - joinedAt.getTime()) / 60000);
            const durEl = element.querySelector(".duration");
            if (durEl) durEl.textContent = `${mins}m`;
        }
    }

    markActive({
        username,
        lastActive
    }) {
        const data = this.students.get(username);
        if (!data) return;

        const {
            element
        } = data;
        const activeEl = element.querySelector(".last-active");
        if (activeEl) {
            const time = new Date(lastActive).toLocaleTimeString();
            activeEl.textContent = `Last active: ${time}`;
        }

        element.classList.remove('student-list-item--idle');
        clearTimeout(data.idleTimer);
        data.idleTimer = setTimeout(() => {
            element.classList.add('student-list-item--idle');
        }, 90000);
    }

    handleFilesSent(detail) {
        const files = detail?.files || [];
        const count = files.length;
        if (this.socket) {
            if (count === 1 && typeof this.socket.sendAsset === 'function') {
                console.log('FacilitatorUI: sending single asset');
                try { this.socket.sendAsset(files[0]); } catch (e) { console.error('Failed single asset send', e); }
            } else if (count > 1 && typeof this.socket.sendAssetsBatch === 'function') {
                console.log(`FacilitatorUI: sending batch of ${count} assets`);
                try { this.socket.sendAssetsBatch(files); } catch (e) { console.error('Failed batch asset send', e); }
            } else {
                console.warn('FacilitatorUI: socket layer missing appropriate send method(s)');
            }
        } else {
            console.warn('FacilitatorUI: socket layer not set');
        }

        addFlashMessage(`${count} file${count !== 1 ? 's' : ''} sent to students.`);
    }
    attachFileHandlers(socketLayer) {
        if (!socketLayer) {
            console.warn("⚠️ attachFileHandlers called without socketLayer");
            return;
        }
        // Store the socket layer on the UI instance so other methods can use it
        this.socket = socketLayer;

        document.querySelectorAll(".file-item button").forEach((button) => {
            button.addEventListener("click", () => {
                const asset = {
                    url: button.dataset.url,
                    mimetype: button.dataset.mimetype,
                    originalName: button.dataset.originalName || "Unnamed",
                    size: button.dataset.size,
                    uploadedBy: button.dataset.uploadedBy
                };

                console.log("📤 Facilitator sending asset:", asset);
                socketLayer.sendAsset(asset);
            });
        });

        // reset-session-btn logic fully removed
    }

    /** Load file list via JSON + render using Handlebars template */
    async renderFiles(project, instance) {
        if (!this.fileListContainer) return;

        try {
            const res = await fetch(`/facilitator/${project}/${instance}/files/json`);
            const data = await res.json();

            if (!data.files || data.files.length === 0) {
                this.fileListContainer.innerHTML = "<p>No files uploaded yet.</p>";
                return;
            }

            const types = [...new Set(data.files.map(f => f.group || f.detectedType))].sort();
            const categories = [...new Set(data.files.map(f => f.category || "none"))].sort();
            const uploaders = [...new Set(data.files.map(f => f.uploadedBy || "unknown"))].sort();

            const html = Handlebars.templates['facilitator-files']({
                files: data.files,
                types,
                categories,
                uploaders
            });

            this.fileListContainer.innerHTML = html;

            this.attachFileHandlers(this.socket);
            this.attachFiltersAndSorting();
        } catch (err) {
            console.error("Failed to load files:", err);
            this.fileListContainer.innerHTML = "<p>Error loading files.</p>";
        }
    }

    /** FULL FILTER + SORT IMPLEMENTATION */
    attachFiltersAndSorting() {
        const container = this.fileListContainer;
        const tbody = container.querySelector("tbody");
        const controls = container.querySelector(".file-filters");

        const filterInputs = controls.querySelectorAll("input, select");

        const renderFiltered = () => {
            const searchVal = controls.querySelector("#file-search").value.toLowerCase();
            const typeVal = controls.querySelector("#filter-type").value;
            const categoryVal = controls.querySelector("#filter-category").value;
            const uploaderVal = controls.querySelector("#filter-uploader").value;
            const sortBy = controls.querySelector("#sort-by").value;
            const sortDir = controls.querySelector("#sort-dir").value;

            const rows = Array.from(tbody.querySelectorAll("tr"));

            // Filter
            rows.forEach(tr => {
                const name = tr.dataset.originalname.toLowerCase();
                const type = tr.querySelector("td:nth-child(4)").textContent;
                const category = tr.querySelector("td:nth-child(5)").textContent;
                const uploader = tr.querySelector("td:nth-child(8)").textContent;

                const show =
                    (!searchVal || name.includes(searchVal)) &&
                    (!typeVal || type === typeVal) &&
                    (!categoryVal || category === categoryVal) &&
                    (!uploaderVal || uploader === uploaderVal);

                tr.style.display = show ? "" : "none"; // Keep display toggle as inline
            });

            // Sort visible rows only
            const sorted = rows
                .filter(tr => tr.style.display !== "none") // Reading inline style from filter
                .sort((a, b) => {
                    let v1 = a.querySelector(`td:nth-child(${this.getSortColumn(sortBy)})`).textContent;
                    let v2 = b.querySelector(`td:nth-child(${this.getSortColumn(sortBy)})`).textContent;

                    if (sortBy === "uploadedAt") {
                        v1 = new Date(a.dataset.uploadedAt);
                        v2 = new Date(b.dataset.uploadedAt);
                    }

                    if (v1 < v2) return sortDir === "asc" ? -1 : 1;
                    if (v1 > v2) return sortDir === "asc" ? 1 : -1;
                    return 0;
                });

            sorted.forEach(tr => tbody.appendChild(tr));
        };

        // Bind all filter inputs
        filterInputs.forEach(inp => inp.addEventListener("input", renderFiltered));

        // Select-all checkbox
        const selectAll = controls.querySelector("#select-all");
        selectAll.addEventListener("change", () => {
            tbody.querySelectorAll(".select-file").forEach(cb => (cb.checked = selectAll.checked));
        });

        // Send selected files
        const sendBtn = controls.querySelector("#send-selected");
        sendBtn.addEventListener("click", () => {
            console.log(`clicked send selected`);
            const selectedRows = Array.from(tbody.querySelectorAll(".select-file:checked"));
            if (selectedRows.length === 0) return alert("No files selected.");

            const assets = selectedRows.map(cb => {
                const row = cb.closest("tr");
                if (!row || !row.dataset.url) {
                    console.warn("Skipping row with missing data attributes.");
                    return null;
                }
                return {
                    url: row.dataset.url,
                    mimetype: row.dataset.mimetype || "unknown",
                    originalName: row.dataset.originalName || "Unnamed",
                    size: row.dataset.size || "0",
                    uploadedBy: row.dataset.uploadedBy || "unknown"
                };
            }).filter(asset => asset !== null); // Remove invalid rows

            if (this.socket) {
                if (assets.length === 1 && this.socket.sendAsset) {
                    this.socket.sendAsset(assets[0]);
                } else if (assets.length > 1 && this.socket.sendAssetsBatch) {
                    this.socket.sendAssetsBatch(assets);
                } else {
                    console.warn('No suitable send method available on socket for selected assets.');
                }
                this.showStatus(`${assets.length} file(s) sent to students.`);
                addFlashMessage(`${assets.length} file(s) sent to students.`)
            }
        });
    }

    /** Map sort keys → table column index */
    getSortColumn(sortBy) {
        switch (sortBy) {
            case "name":
                return 3;
            case "size":
                return 6;
            case "uploadedAt":
                return 7;
            default:
                return 3;
        }
    }
}
