// ---------------------------------------------------------
// Facilitator File Browser (Table Renderer + Filters)
// ---------------------------------------------------------

console.log("📁 facilitator-filebrowser.js loaded");

const tableBody = document.getElementById("file-table-body");
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const filterType = document.getElementById("filter-type");
const filterUploader = document.getElementById("filter-uploader");
const sendSelectedBtn = document.getElementById("send-selected-btn");

let allFiles = [];
let filteredFiles = [];

// ---------------------------------------------------------
// 1. Fetch JSON data
// ---------------------------------------------------------

async function loadFiles() {
    try {
        const url = `/facilitator/cms/main/files/json`;
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
            <tr><td colspan="7" style="text-align:center;color:red;">
                Failed to load file list.
            </td></tr>`;
    }
}


loadFiles();


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
            <tr><td colspan="7" style="text-align:center;">No matching files.</td></tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredFiles
        .map(f => {
            const dateStr = new Date(f.uploadedAt).toLocaleString();
            const fid = f.id || f._id || f.filename || "";
            return `
            <tr data-id="${fid}">
                <td><input type="checkbox" class="file-select" data-id="${f._id}"></td>
                <td title="${f.name}">${f.nameTruncated}</td>
                <td>${f.mimetype}</td>
                <td>${(f.size / 1024).toFixed(1)} KB</td>
                <td>${f.category}</td>
                <td>${f.uploadedBy}</td>
                <td>${dateStr}</td>
            </tr>`;
        })
        .join("");
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
    const selected = [...document.querySelectorAll(".file-select:checked")]
        .map(input => {
            const id = input.dataset.id;
            return allFiles.find(f => f._id === id);
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
