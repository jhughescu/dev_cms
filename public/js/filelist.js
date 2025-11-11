document.addEventListener("DOMContentLoaded", () => {
    function changeLimit(val) {
        const url = new URL(window.location.href);
        const params = url.searchParams;

        params.set('limit', val);
        params.set('page', 1); // reset to first page

        // Preserve all other filters/sorting automatically
        url.search = params.toString();
        window.location.href = url.toString();
    }
    // Individual metadata toggle buttons
    document.querySelectorAll('.meta-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const panel = document.getElementById(`meta-${targetId}`);
            if (!panel) return;

            const content = panel.querySelector('.meta-content');
            if (!content) return;

            const isVisible = content.classList.toggle('visible');
            btn.textContent = isVisible ? '−' : 'ℹ️';
        });
    });

    // Expand / Collapse all button
    const toggleAllBtn = document.getElementById('toggle-all-btn');

    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', () => {
            const panels = Array.from(document.querySelectorAll('.meta-row .meta-content'));
            const allVisible = panels.every(p => p.classList.contains('visible'));
            const totalDuration = panels.length * 50 + 300; // stagger delay + transition

            // Prevent spamming
            toggleAllBtn.disabled = true;
            toggleAllBtn.classList.add('animating');

            if (allVisible) {
                // Collapse all (reverse order for effect)
                panels.slice().reverse().forEach((content, i) => {
                    setTimeout(() => {
                        content.classList.remove('visible');
                        const btn = document.querySelector(`.meta-toggle-btn[data-target="${content.closest('.meta-row').id.replace('meta-', '')}"]`);
                        if (btn) btn.textContent = 'ℹ️';
                    }, i * 50);
                });
                toggleAllBtn.textContent = "Expand all metadata";
            } else {
                // Expand all
                panels.forEach((content, i) => {
                    setTimeout(() => {
                        content.classList.add('visible');
                        const btn = document.querySelector(`.meta-toggle-btn[data-target="${content.closest('.meta-row').id.replace('meta-', '')}"]`);
                        if (btn) btn.textContent = '−';
                    }, i * 50);
                });
                toggleAllBtn.textContent = "Collapse all metadata";
            }

            // Re-enable button after animation
            setTimeout(() => {
                toggleAllBtn.disabled = false;
                toggleAllBtn.classList.remove('animating');
            }, totalDuration);
        });
    }
});
