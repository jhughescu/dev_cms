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
        document.addEventListener("sessionReset", () => this.resetList());
        document.addEventListener("studentActive", (e) => this.markActive(e.detail));

        // Start periodic updates
        this.startDurationUpdates();
    }

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

        if (!students || students.length === 0) {
            list.innerHTML = "<li>No students connected.</li>";
            return;
        }

        students.forEach(student => {
            const li = document.createElement("li");
            li.classList.add(student.connected ? "online" : "offline");

            const joined = student.joinedAt ? new Date(student.joinedAt).toLocaleTimeString() : "—";
            const lastActive = student.lastActive ? new Date(student.lastActive).toLocaleTimeString() : "—";

            li.innerHTML = `
                <strong>${student.username}</strong> — ${student.connected ? "🟢 Online" : "🔴 Offline"}<br>
                Joined: ${joined}<br>
                <span class="duration">0m</span> ago<br>
                <small class="last-active">Last active: ${lastActive}</small>
            `;
            list.appendChild(li);
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

        element.style.opacity = 1.0;
        clearTimeout(data.idleTimer);
        data.idleTimer = setTimeout(() => {
            element.style.opacity = 0.5;
        }, 90000);
    }

    attachFileHandlers(socketLayer) {
        if (!socketLayer) {
            console.warn("⚠️ attachFileHandlers called without socketLayer");
            return;
        }

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

        const resetBtn = document.getElementById("reset-session-btn");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (confirm("Reset this session? All students will be disconnected.")) {
                    socketLayer.resetSession();
                }
            });
        }
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

                tr.style.display = show ? "" : "none";
            });

            // Sort visible rows only
            const sorted = rows
                .filter(tr => tr.style.display !== "none")
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
            const selectedRows = Array.from(tbody.querySelectorAll(".select-file:checked"));
            if (selectedRows.length === 0) return alert("No files selected.");

            const assets = selectedRows.map(cb => {
                const row = cb.closest("tr");
                return {
                    url: row.dataset.url,
                    mimetype: row.dataset.mimetype,
                    originalName: row.dataset.originalName,
                    size: row.dataset.size,
                    uploadedBy: row.dataset.uploadedBy
                };
            });

            if (this.socket && this.socket.sendAsset) {
                assets.forEach(a => this.socket.sendAsset(a));
                this.showStatus(`${assets.length} file(s) sent to students.`);
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
