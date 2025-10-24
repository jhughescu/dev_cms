import { addFlashMessage } from "./flash.js";

export function initUploader() {
    const form = document.querySelector("form#upload-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                addFlashMessage(result.message, "success");
                form.reset();
            } else {
                addFlashMessage(result.message, "error");
            }
        } catch (err) {
            console.error("Upload failed:", err);
            addFlashMessage("Upload failed due to network/server error.", "error");
        }
    });
}
