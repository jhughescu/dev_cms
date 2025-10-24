// public/js/delete.js
import {
    addFlashMessage
} from "./flash.js";

export function initDeleteConfirmation() {
    const deleteButtons = document.querySelectorAll(".delete-btn");

    deleteButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const fileId = button.dataset.id;
            const confirmed = confirm("Are you sure you want to delete this file?");
            if (!confirmed) return;

            try {
                const res = await fetch(`/files/delete/${fileId}`, {
                    method: "POST",
                });

                const data = await res.json();

                if (data.success) {
                    addFlashMessage(data.success, "success");
                    // Remove the row from the table
                    const row = button.closest("tr");
                    if (row) row.remove();
                } else if (data.error) {
                    addFlashMessage(data.error, "error");
                }
            } catch (err) {
                addFlashMessage("Failed to delete file.", "error");
                console.error(err);
            }
        });
    });
}
