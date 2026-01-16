// public/js/main-student.js
// Handles student name capture and exposes it via a custom event

function dispatchNameReady(username) {
  document.body.dataset.username = username;
  const container = document.querySelector('.student-container');
  if (container) container.dataset.username = username;
  document.dispatchEvent(new CustomEvent('studentNameReady', { detail: { username } }));
}

function injectStyles() {
  if (document.getElementById('student-name-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'student-name-modal-styles';
  style.textContent = `
    #student-name-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    #student-name-modal {
      background: #fff;
      border-radius: 8px;
      padding: 20px 24px;
      max-width: 360px;
      width: 90%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      font-family: 'Segoe UI', sans-serif;
    }
    #student-name-modal h2 {
      margin: 0 0 12px;
      font-size: 20px;
      color: #333;
    }
    #student-name-modal p { margin: 0 0 12px; color: #555; }
    #student-name-modal form { display: flex; flex-direction: column; gap: 10px; }
    #student-name-modal input {
      padding: 10px;
      font-size: 15px;
      border: 1px solid #ccc;
      border-radius: 6px;
    }
    #student-name-modal button {
      padding: 10px 12px;
      background: #007bff;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 15px;
    }
    #student-name-modal button:hover { background: #0068d6; }
  `;
  document.head.appendChild(style);
}

function renderNameModal() {
  injectStyles();

  const overlay = document.createElement('div');
  overlay.id = 'student-name-overlay';
  overlay.innerHTML = `
    <div id="student-name-modal">
      <h2>Enter your name</h2>
      <p>This helps the facilitator identify you.</p>
      <form>
        <input type="text" id="student-name-input" name="studentName" autocomplete="off" placeholder="e.g. Alex" required />
        <button type="submit">Join Session</button>
      </form>
    </div>
  `;

  overlay.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = overlay.querySelector('#student-name-input');
    const value = (input.value || '').trim();
    if (!value) {
      input.focus();
      return;
    }
    localStorage.setItem('studentUsername', value);
    dispatchNameReady(value);
    overlay.remove();
  });

  document.body.appendChild(overlay);
  const input = overlay.querySelector('#student-name-input');
  setTimeout(() => input.focus(), 50);
}

function initNameCapture() {
  const existing = document.body.dataset.username || localStorage.getItem('studentUsername');
  if (existing) {
    dispatchNameReady(existing);
    return;
  }
  renderNameModal();
}

document.addEventListener('DOMContentLoaded', initNameCapture);
