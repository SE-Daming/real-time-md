// State
let currentPath = null;
let autoScroll = true;
let sseConnection = null;

// DOM Elements
const sessionsList = document.getElementById('sessions-list');
const content = document.getElementById('content');
const sessionTitle = document.getElementById('session-title');
const connectionStatus = document.getElementById('connection-status');
const watchStatus = document.getElementById('watch-status');
const customPathInput = document.getElementById('custom-path');
const loadCustomBtn = document.getElementById('load-custom');
const refreshBtn = document.getElementById('refresh-sessions');
const themeToggle = document.getElementById('theme-toggle');
const autoScrollBtn = document.getElementById('auto-scroll');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSessions();
  connectSSE();
  loadTheme();

  // Event listeners
  refreshBtn.addEventListener('click', loadSessions);
  loadCustomBtn.addEventListener('click', loadCustomPath);
  themeToggle.addEventListener('click', toggleTheme);
  autoScrollBtn.addEventListener('click', toggleAutoScroll);

  customPathInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadCustomPath();
  });
});

// SSE Connection
function connectSSE() {
  if (sseConnection) {
    sseConnection.close();
  }

  sseConnection = new EventSource('/sse');

  sseConnection.onopen = () => {
    connectionStatus.innerHTML = '<span class="dot connected"></span><span>Connected</span>';
  };

  sseConnection.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'connected') {
      console.log('SSE connected');
    } else if (data.type === 'update') {
      appendContent(data.content);
    }
  };

  sseConnection.onerror = () => {
    connectionStatus.innerHTML = '<span class="dot disconnected"></span><span>Disconnected</span>';

    // Reconnect after 3 seconds
    setTimeout(connectSSE, 3000);
  };
}

// Load sessions list
async function loadSessions() {
  sessionsList.innerHTML = '<div class="loading">Loading sessions...</div>';

  try {
    const res = await fetch('/sessions');
    const sessions = await res.json();

    if (sessions.length === 0) {
      sessionsList.innerHTML = '<div class="loading">No sessions found</div>';
      return;
    }

    sessionsList.innerHTML = sessions.map(s => `
      <div class="session-item" data-path="${s.filePath}">
        <div class="project" title="${s.projectPath}">${s.projectPath}</div>
        <div class="meta">
          <span>💬 ${s.messageCount}</span>
          <span>📅 ${formatDate(s.lastModified)}</span>
        </div>
      </div>
    `).join('');

    // Add click handlers
    sessionsList.querySelectorAll('.session-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        watchFile(path);

        // Update active state
        sessionsList.querySelectorAll('.session-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });

  } catch (err) {
    sessionsList.innerHTML = `<div class="loading">Error: ${err.message}</div>`;
  }
}

// Watch a file
async function watchFile(filePath) {
  try {
    const res = await fetch('/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    currentPath = filePath;
    sessionTitle.textContent = filePath.split('/').pop().replace('.jsonl', '');

    // Update watch status
    watchStatus.innerHTML = `<span>Watching: ${data.messageCount} messages</span>`;

    // Render content
    setContent(data.markdown);

  } catch (err) {
    alert('Error loading file: ' + err.message);
  }
}

// Load custom path
function loadCustomPath() {
  const path = customPathInput.value.trim();
  if (path) {
    watchFile(path);
  }
}

// Set content
function setContent(markdown) {
  content.innerHTML = marked.parse(markdown);
  highlightCode();

  if (autoScroll) {
    scrollToBottom();
  }
}

// Append new content
function appendContent(newMarkdown) {
  const div = document.createElement('div');
  div.innerHTML = marked.parse(newMarkdown);
  content.appendChild(div.firstElementChild);
  highlightCode();

  if (autoScroll) {
    scrollToBottom();
  }
}

// Highlight code blocks
function highlightCode() {
  document.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
}

// Scroll to bottom
function scrollToBottom() {
  content.scrollTop = content.scrollHeight;
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

// Theme
function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.body.setAttribute('data-theme', 'light');
    themeToggle.textContent = '☀️';
  }
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  if (current === 'light') {
    document.body.removeAttribute('data-theme');
    localStorage.setItem('theme', 'dark');
    themeToggle.textContent = '🌙';
  } else {
    document.body.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    themeToggle.textContent = '☀️';
  }
}

// Auto scroll toggle
function toggleAutoScroll() {
  autoScroll = !autoScroll;
  autoScrollBtn.classList.toggle('active', autoScroll);
}
