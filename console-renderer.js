const { ipcRenderer } = require('electron');

let currentSessionId = null;
const consoleOutput = document.getElementById('console-output');
const consoleInput = document.getElementById('console-input');
const clearConsoleBtn = document.getElementById('clear-console-btn');

let commandHistory = [];
let historyIndex = -1;

// --- IPC Listeners ---

ipcRenderer.on('attach-to-session', (event, sessionId) => {
    currentSessionId = sessionId;
    ipcRenderer.send('session-attach', sessionId);
});

ipcRenderer.on('run-file', (event, filePath) => {
    const sessionId = Date.now();
    currentSessionId = sessionId;
    // Create a new session for this file
    ipcRenderer.send('session-create', sessionId, filePath);
    ipcRenderer.send('session-attach', sessionId);
});

// Receive full state on attach
ipcRenderer.on('session-history', (event, sessionId, history, cmdHistory, draft) => {
    if (sessionId !== currentSessionId) return;

    // 1. Render Output History
    consoleOutput.innerHTML = '';
    if (Array.isArray(history)) {
        history.forEach(entry => appendEntry(entry));
    }

    // 2. Restore Command History
    if (Array.isArray(cmdHistory)) {
        commandHistory = cmdHistory;
        historyIndex = commandHistory.length;
    }

    // 3. Restore Draft
    if (draft) {
        consoleInput.value = draft;
    }

    consoleOutput.scrollTop = consoleOutput.scrollHeight;
});

// Receive live output (or echoed input)
ipcRenderer.on('session-output', (event, sessionId, entry) => {
    if (sessionId !== currentSessionId) return;

    if (entry.type === 'input') {
        commandHistory.push(entry.text);
        historyIndex = commandHistory.length;
    }

    appendEntry(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
});

ipcRenderer.on('session-exit', (event, sessionId, code) => {
    if (sessionId !== currentSessionId) return;
    appendEntry({ type: 'meta', text: `\n[Process exited with code ${code}]\n` });
});

ipcRenderer.on('session-input-draft', (event, sessionId, draft) => {
    if (sessionId !== currentSessionId) return;
    if (consoleInput !== document.activeElement) {
        consoleInput.value = draft;
    }
});

// --- UI Logic ---

function appendEntry(entry) {
    if (!entry || !entry.text) return;

    if (entry.type === 'input') {
        // Render as prompt echo
        const div = document.createElement('div');
        div.className = "mt-1";
        // Use innerHTML for prompt styling, escape text
        div.innerHTML = `<span class="text-idle-keyword font-bold mr-2">>>></span><span>${escapeHtml(entry.text)}</span>`;
        consoleOutput.appendChild(div);
        return;
    }

    // Determine Style
    let colorClass = 'text-gray-800';
    if (entry.type === 'stdout') colorClass = 'text-blue-600';
    else if (entry.type === 'stderr') colorClass = 'text-red-500';
    else if (entry.type === 'meta') colorClass = 'text-gray-500 italic';

    const div = document.createElement('div');
    div.className = `${colorClass} whitespace-pre-wrap break-all`;
    div.innerText = entry.text;
    consoleOutput.appendChild(div);
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Input Handling
consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!currentSessionId) return;
        const command = consoleInput.value;

        // Send to Main (it will echo back as 'input' type)
        ipcRenderer.send('session-input', currentSessionId, command);

        // Clear input
        consoleInput.value = '';
        ipcRenderer.send('session-input-draft', currentSessionId, ''); // Clear draft

    } else if (e.key === 'ArrowUp') {
        if (historyIndex > 0) {
            historyIndex--;
            consoleInput.value = commandHistory[historyIndex] || '';
            // Update draft? No, draft is for manual typing.
        }
    } else if (e.key === 'ArrowDown') {
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            consoleInput.value = commandHistory[historyIndex] || '';
        } else {
            historyIndex = commandHistory.length;
            consoleInput.value = '';
        }
    }
});

// Draft saving
consoleInput.addEventListener('input', () => {
    if (currentSessionId) {
        ipcRenderer.send('session-input-draft', currentSessionId, consoleInput.value);
    }
});

// Kill session on window close
window.addEventListener('beforeunload', () => {
    if (currentSessionId) {
        ipcRenderer.send('session-kill', currentSessionId);
    }
});

clearConsoleBtn.addEventListener('click', () => {
    consoleOutput.innerHTML = '<div class="text-gray-500 mb-1">Python Interactive Shell Ready.</div>';
});

consoleInput.focus();
