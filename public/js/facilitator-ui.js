export class FacilitatorUI {
    constructor(socketInstance) {
        this.socket = socketInstance;
        this.studentList = document.getElementById("student-list");
        this.statusDiv = document.getElementById("status");
        this.students = new Map(); // username → { joinedAt, element }
        this.durationInterval = null;

        document.addEventListener("studentJoined", (e) => this.addStudent(e.detail));
        document.addEventListener("studentLeft", (e) => this.removeStudent(e.detail.username));
        document.addEventListener("sessionReset", () => this.resetList());
        document.addEventListener("studentActive", (e) => this.markActive(e.detail));


        this.startDurationUpdates();
    }

    addStudent({
        username,
        joinedAt
    }) {
        if (!this.studentList || this.students.has(username)) return;

        const li = document.createElement("li");
        const joinTime = new Date(joinedAt);
        //        li.innerHTML = `<strong>${username}</strong> — joined at ${joinTime.toLocaleTimeString()} (<span class="duration">0m</span> ago)`;
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
        console.log("renderStudents", this.studentList);
        if (!this.studentList) return;
        this.studentList.innerHTML = "";

        if (!students || students.length === 0) {
            this.studentList.textContent = "No students connected.";
            return;
        }

        const list = document.createElement("ul");
        students.forEach(student => {
            const li = document.createElement("li");
            li.textContent = `${student.username} — ${student.connected ? "🟢 Online" : "🔴 Offline"}`;
            list.appendChild(li);
        });

        this.studentList.appendChild(list);
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

        // Optional: visually highlight recently active students
        element.style.opacity = 1.0;
        clearTimeout(data.idleTimer);
        data.idleTimer = setTimeout(() => {
            element.style.opacity = 0.5; // fade if idle for >1.5 minutes
        }, 90000);
    }

    attachFileHandlers(socketLayer) {
        // Handle “Send to Students” buttons
        document.querySelectorAll(".file-item button").forEach(button => {
            button.addEventListener("click", () => {
                const asset = {
                    url: button.dataset.url,
                    mimetype: button.dataset.mimetype,
                    originalName: button.dataset.originalName,
                    size: button.dataset.size,
                    uploadedBy: button.dataset.uploadedBy
                };
                console.log("Facilitator sending asset:", asset);
                socketLayer.sendAsset(asset);
            });
        });

        // Handle reset session button if present
        const resetBtn = document.getElementById("reset-session-btn");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (confirm("Reset this session? All students will be disconnected.")) {
                    socketLayer.resetSession();
                }
            });
        }
    }

}
