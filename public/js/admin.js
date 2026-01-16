// public/js/admin.js
console.log('admin.js loaded');

const socket = io();

// Admin should join the admin room (use 'role' not 'type')
socket.on('connect', () => {
    console.log('[admin.js] Socket connected, joining admin room');
    socket.emit('joinSession', { role: 'admin', username: 'admin' });
});

let selectedSessionId = null;

function renderSessionListFragment() {
    fetch('/admin/session-list')
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch session list fragment');
            return res.text();
        })
        .then(html => {
            const container = document.getElementById('session-list-container');
            if (container) container.innerHTML = html;
            // Re-apply selection highlight if a session is selected
            if (selectedSessionId) {
                const selectedLi = container.querySelector(`.session-item[data-sessionid="${selectedSessionId}"]`);
                container.querySelectorAll('.session-item.selected').forEach(n => n.classList.remove('selected'));
                if (selectedLi) selectedLi.classList.add('selected');
            }
        })
        .catch(err => console.error('Error fetching session list fragment:', err));
}

function renderSessionConsole(session) {
    const container = document.getElementById('session-console');
    if (!container) return;
    if (!session) {
        container.innerHTML = '<em>No session selected.</em>';
        return;
    }

    let out = `Session: ${session.sessionId} — Facilitator: ${session.facilitator || '—'}\nCreated: ${session.createdAt}\nUpdated: ${session.updatedAt}\n\n`;
    out += `Current State (${(session.currentState || []).length}):\n`;
    (session.currentState || []).forEach(f => {
        out += ` - ${f.originalName || f.name || f.filename || f._id} (${f.mimetype || ''})\n`;
    });

    out += `\nState History (latest first):\n`;
    const history = (session.stateHistory || []).slice().reverse();
    history.forEach(h => {
        out += `-- ${new Date(h.timestamp).toLocaleString()} (${(h.state||[]).length} items)\n`;
        (h.state || []).forEach(s => {
            out += `    - ${s.originalName || s.name || s.filename || s._id}\n`;
        });
    });

    container.textContent = out;
}

// Click handler: delegate clicks on session-items to load detail
document.addEventListener('click', (ev) => {
    const li = ev.target.closest('.session-item[data-sessionid]');
    if (!li) return;
    const sid = li.dataset.sessionid;
    if (!sid) return;
    selectedSessionId = sid;
    // highlight
    document.querySelectorAll('.session-item.selected').forEach(n => n.classList.remove('selected'));
    li.classList.add('selected');

    fetch(`/admin/session/${encodeURIComponent(sid)}`)
        .then(r => r.ok ? r.json() : Promise.reject('Failed'))
        .then(data => renderSessionConsole(data.session))
        .catch(err => console.error('Failed to load session detail:', err));
});

// Update DOM when sessionState arrives
socket.on('sessionState', (session) => {
    // refresh session list (left panel)
    renderSessionListFragment();

    // if the updated session matches the selected one, refresh console with that payload
    if (session && session.sessionId && session.sessionId === selectedSessionId) {
        renderSessionConsole(session);
    }
});

// Initial list render
renderSessionListFragment();
