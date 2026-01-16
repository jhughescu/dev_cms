// ---------------------------------------------------------
// Facilitator File Browser (Table Renderer + Filters)
// ---------------------------------------------------------

console.log("📁 [facilitator-filebrowser.js] loaded");

const tableBody = document.getElementById("file-table-body");
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const filterType = document.getElementById("filter-type");
const filterUploader = document.getElementById("filter-uploader");
const sendSelectedBtn = document.getElementById("send-selected-btn");

console.log("📁 [facilitator-filebrowser.js] DOM elements:", {
    tableBody: !!tableBody,
    searchInput: !!searchInput,
    sendSelectedBtn: !!sendSelectedBtn
});

let allFiles = [];
let filteredFiles = [];

// ---------------------------------------------------------
// 1. Fetch JSON data
// ---------------------------------------------------------

async function loadFiles() {
    try {
        const sessionSelect = document.getElementById('session-select');
        const sessionId = sessionSelect ? sessionSelect.value : '';
        const url = sessionId ? `/api/facilitator/files?sessionId=${encodeURIComponent(sessionId)}` : `/api/facilitator/files`;
        const res = await fetch(url);

        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);

        const data = await res.json();

        allFiles = Array.isArray(data.files) ? data.files : [];
        // Add truncated name property
        const MAX_LENGTH = 20; // adjust as needed
        allFiles.forEach(f => {
            if (f.name.length > MAX_LENGTH) {
                f.nameTruncated = f.name.slice(0, MAX_LENGTH - 3) + '... ' + f.name.slice(f.name.lastIndexOf('.'));
            } else {
                f.nameTruncated = f.name;
            }
        });

        filteredFiles = [...allFiles]; // clone array for filtering

        populateFilters();
        renderTable();

    } catch (err) {
        console.error("❌ Failed to fetch JSON:", err);
        tableBody.innerHTML = `
            <tr><td colspan="7" class="text-center" style="color:red;">
                Failed to load file list.
            </td></tr>`;
    }
}


loadFiles();

// Expose reload function globally so other modules can trigger refresh (e.g., on sessionState updates)
window.reloadFileTable = loadFiles;


// ---------------------------------------------------------
// 2. Populate filter dropdowns
// ---------------------------------------------------------
function populateFilters() {
    const categories = new Set();
    const types = new Set();
    const uploaders = new Set();

    allFiles.forEach(f => {
        if (f.category) categories.add(f.category.trim());
        if (f.mimetype) types.add(f.mimetype.trim());
        if (f.uploadedBy) uploaders.add(f.uploadedBy.trim());
    });

    // Clear existing options (except default)
    filterCategory.innerHTML = '<option value="">All Categories</option>';
    filterType.innerHTML = '<option value="">All Types</option>';
    filterUploader.innerHTML = '<option value="">All Uploaders</option>';

    [...categories].sort().forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.toLowerCase(); // normalize value for filtering
        opt.textContent = c;
        filterCategory.appendChild(opt);
    });

    [...types].sort().forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.toLowerCase();
        opt.textContent = t;
        filterType.appendChild(opt);
    });

    [...uploaders].sort().forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.toLowerCase();
        opt.textContent = u;
        filterUploader.appendChild(opt);
    });
}


// ---------------------------------------------------------
// 3. Render Table Rows
// ---------------------------------------------------------

function renderTable() {
    console.log(`renderTable`)
    if (!filteredFiles.length) {
        tableBody.innerHTML = `
            <tr><td colspan="11" class="text-center">No matching files.</td></tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredFiles
        .map(f => {
            const dateStr = new Date(f.uploadedAt).toLocaleString();
            const fid = f._id || f.id || f.filename || ""; // Ensure `data-id` is set correctly
            // Use `select-file` class to match server-side templates; keep data-id and data-url for robust mapping
            const activeBadge = f.active ? '<span class="file-active-badge" title="Active"></span>' : '';
            
            // Generate thumbnail for images
            let thumbnailHTML = '<span class="file-icon--placeholder">—</span>';
            if (f.mimetype && f.mimetype.startsWith('image/')) {
                thumbnailHTML = `<img src="${f.url}" class="file-thumbnail" onerror="this.style.display='none';this.nextSibling.classList.remove('file-thumbnail--fallback');this.nextSibling.style.display='inline';" /><span class="file-thumbnail--fallback">📄</span>`;
            } else if (f.mimetype && f.mimetype.startsWith('video/')) {
                thumbnailHTML = '<span class="file-icon">🎬</span>';
            } else if (f.mimetype && f.mimetype.startsWith('audio/')) {
                thumbnailHTML = '<span class="file-icon">🎵</span>';
            } else if (f.mimetype && (f.mimetype.includes('pdf') || f.mimetype.includes('document'))) {
                thumbnailHTML = '<span class="file-icon">📄</span>';
            }
            
            return `
            <tr data-id="${fid}" data-url="${f.url}" data-mimetype="${f.mimetype}" data-originalname="${f.name}" data-size="${f.size}" data-uploadedby="${f.uploadedBy}">
                <td><input type="checkbox" class="select-file" data-id="${fid}" data-url="${f.url}"></td>
                <td class="text-center">${thumbnailHTML}</td>
                <td title="${f.name}">${f.nameTruncated}</td>
                <td class="text-center">${activeBadge}</td>
                <td>${f.mimetype}</td>
                <td>${(f.size / 1024).toFixed(1)} KB</td>
                <td>${f.project || ''}</td>
                <td>${f.category}</td>
                <td>${f.uploadedBy}</td>
                <td>${f.organisation || ''}</td>
                <td>${dateStr}</td>
            </tr>`;
        })
        .join("");

    // If the currently selected session is archived, keep interactive controls styled as disabled
    try {
        const sessionSelect = document.getElementById('session-select');
        const archivedAttr = sessionSelect && sessionSelect.options[sessionSelect.selectedIndex]
            ? sessionSelect.options[sessionSelect.selectedIndex].getAttribute('data-archived')
            : null;
        const isArchived = archivedAttr === 'true' || archivedAttr === '1' || archivedAttr === true || archivedAttr === 1;
        if (isArchived) {
            const boxes = tableBody.querySelectorAll('.select-file');
            boxes.forEach(cb => { cb.disabled = true; });
            // Style buttons as disabled but don't actually disable them (so click events fire)
            if (sendSelectedBtn) sendSelectedBtn.classList.add('button--disabled');
            const blankBtn = document.getElementById('blank-session-btn');
            // removed reset-session-btn logic
            if (blankBtn) blankBtn.classList.add('button--disabled');
            if (resetBtn) resetBtn.classList.add('button--disabled');
        }
    } catch (err) {
        // Non-fatal: don't prevent rendering if DOM assumptions fail
        console.warn('Could not apply archived-state disabling:', err);
    }
}


// ---------------------------------------------------------
// 4. Apply Filters + Search
// ---------------------------------------------------------
function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();
    const categoryVal = filterCategory.value.toLowerCase().trim();
    const typeVal = filterType.value.toLowerCase().trim();
    const uploaderVal = filterUploader.value.toLowerCase().trim();

    filteredFiles = allFiles.filter(f => {
        const matchesSearch =
            f.name.toLowerCase().includes(search) ||
            f.mimetype.toLowerCase().includes(search);

        const matchesCategory = !categoryVal || (f.category && f.category.toLowerCase() === categoryVal);
        const matchesType = !typeVal || (f.mimetype && f.mimetype.toLowerCase() === typeVal);
        const matchesUploader = !uploaderVal || (f.uploadedBy && f.uploadedBy.toLowerCase() === uploaderVal);

        return matchesSearch && matchesCategory && matchesType && matchesUploader;
    });

    renderTable();
}

// Attach filter events
searchInput.addEventListener("input", applyFilters);
filterCategory.addEventListener("change", applyFilters);
filterType.addEventListener("change", applyFilters);
filterUploader.addEventListener("change", applyFilters);


// ---------------------------------------------------------
// 5. Collect selected files + dispatch event
// ---------------------------------------------------------

sendSelectedBtn.addEventListener("click", () => {
    console.log('[facilitator-filebrowser.js] Send Selected Files button clicked');
    // Support both `file-select` (older client) and `select-file` (server template)
    const selectedInputs = [...document.querySelectorAll(".file-select:checked, .select-file:checked")];
    console.log('[facilitator-filebrowser.js] Selected checkboxes:', selectedInputs.length);

    const selected = selectedInputs
        .map(input => {
            const id = input.dataset.id;
            const url = input.dataset.url || input.closest('tr')?.dataset.url;

            console.log("🔍 Checkbox attributes:", { id, url });

            // Prefer matching by _id, otherwise try url
            let file = null;
            if (id) {
                file = allFiles.find(f => String(f._id) === String(id) || String(f.id) === String(id));
                console.log("🔗 Matched by id:", file);
            }
            if (!file && url) {
                file = allFiles.find(f => f.url === url || f.filename === url || f._id === url);
                console.log("🔗 Matched by url:", file);
            }
            return file;
        })
        .filter(Boolean);

    if (!selected.length) {
        alert("Please select at least one file.");
        return;
    }

    console.log("📤 Sending selected files:", selected);

    // Dispatch to facilitator-main.js
    document.dispatchEvent(new CustomEvent("sendFilesToStudents", {
        detail: { files: selected }
    }));
});


// ---------------------------------------------------------
// Done
// ---------------------------------------------------------
