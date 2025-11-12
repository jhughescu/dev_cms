// public/js/student-ui.js
export class StudentUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    // Called by StudentSession callback
    renderSession(session) {
        this.container.innerHTML = ""; // clear previous content
        if (session.assets && session.assets.length > 0) {
            session.assets.forEach(asset => this.renderAsset(asset));
        }
    }

    // Render a single asset
    renderAsset(asset) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = "20px";

        const title = document.createElement('p');
        title.textContent = `Received: ${asset.originalName}`;
        wrapper.appendChild(title);

        if (asset.mimetype.startsWith("image/")) {
            const img = document.createElement('img');
            img.src = asset.url;
            img.style.maxWidth = "100%";
            img.style.border = "1px solid #ccc";
            wrapper.appendChild(img);
        } else if (asset.mimetype === "application/pdf") {
            const iframe = document.createElement("iframe");
            iframe.src = asset.url;
            iframe.style.width = "100%";
            iframe.style.height = "500px";
            wrapper.appendChild(iframe);
        } else if (asset.mimetype.startsWith("video/")) {
            const video = document.createElement("video");
            video.src = asset.url;
            video.controls = true;
            video.style.width = "100%";
            wrapper.appendChild(video);
        } else if (asset.mimetype.startsWith("audio/")) {
            const audio = document.createElement("audio");
            audio.src = asset.url;
            audio.controls = true;
            wrapper.appendChild(audio);
        } else {
            const link = document.createElement('a');
            link.href = asset.url;
            link.textContent = `Download ${asset.originalName}`;
            link.target = "_blank";
            wrapper.appendChild(link);
        }

        this.container.appendChild(wrapper);
    }
}
