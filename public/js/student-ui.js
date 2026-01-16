// public/js/student-ui.js
export class StudentUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`❌ StudentUI: container #${containerId} not found.`);
        } else {
            console.log(`🎨 StudentUI initialized for #${containerId}`);
        }
    }

    // Called when a full session state is received
    renderSession(session) {
        if (!this.container) return;
        console.log("🧾 Rendering session state:", session);

        this.container.innerHTML = ""; // clear previous content
        if (session.assets && session.assets.length > 0) {
            session.assets.forEach(asset => this.renderAsset(asset));
        } else {
            this.container.innerHTML = "<p>No assets received yet.</p>";
        }
    }

    // Render a single asset safely
    renderAsset(asset) {
        if (!this.container || !asset) return;
        console.log(`🎁 Rendering asset: ${asset.originalName} (${asset.mimetype})`);

        // Prevent duplicates (check by URL or filename)
        const existing = [...this.container.querySelectorAll("a,img,iframe,video,audio")]
            .some(el => el.src === asset.url || el.href === asset.url);
        if (existing) {
            console.log(`⚠️ Skipping duplicate asset: ${asset.originalName}`);
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "asset-wrapper";

        const title = document.createElement("p");
        title.textContent = `Received: ${asset.originalName}`;
        wrapper.appendChild(title);

        if (asset.mimetype.startsWith("image/")) {
            const img = document.createElement("img");
            img.className = "asset-image";
            img.src = asset.url;
            wrapper.appendChild(img);

        } else if (asset.mimetype === "application/pdf") {
            const iframe = document.createElement("iframe");
            iframe.className = "asset-iframe";
            iframe.src = asset.url;
            wrapper.appendChild(iframe);

        } else if (asset.mimetype.startsWith("video/")) {
            const video = document.createElement("video");
            video.className = "asset-video";
            video.src = asset.url;
            video.controls = true;
            wrapper.appendChild(video);

        } else if (asset.mimetype.startsWith("audio/")) {
            const audio = document.createElement("audio");
            audio.src = asset.url;
            audio.controls = true;
            wrapper.appendChild(audio);

        } else {
            const link = document.createElement("a");
            link.href = asset.url;
            link.textContent = `Download ${asset.originalName}`;
            link.target = "_blank";
            wrapper.appendChild(link);
        }

        this.container.appendChild(wrapper);
    }
}
