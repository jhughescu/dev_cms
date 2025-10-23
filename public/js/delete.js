// public/js/delete.js
export function initDeleteConfirmation() {
    document.querySelectorAll("form[action*='/delete/']").forEach(form => {
        form.addEventListener("submit", e => {
            e.preventDefault();

            // Create modal elements
            const modal = document.createElement("div");
            modal.className = "modal-overlay";
            modal.innerHTML = `
        <div class="modal">
          <p>Are you sure you want to delete this file?</p>
          <button class="confirm-btn">Yes</button>
          <button class="cancel-btn">No</button>
        </div>
      `;
            document.body.appendChild(modal);

            // Confirm button
            modal.querySelector(".confirm-btn").addEventListener("click", () => {
                form.submit();
                modal.remove();
            });

            // Cancel button
            modal.querySelector(".cancel-btn").addEventListener("click", () => modal.remove());
        });
    });
}
