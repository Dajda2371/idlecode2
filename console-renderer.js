const { ipcRenderer } = require('electron');

let currentSessionId = null;
const consoleOutput = document.getElementById('console-output');
const consoleInput = document.getElementById('console-input');
const clearConsoleBtn = document.getElementById('clear-console-btn');

// --- IPC Listeners ---

// 1. Attach to a session (sent by Main when popping out)
ipcRenderer.on('attach-to-session', (event, sessionId) => {
    currentSessionId = sessionId;
    ipcRenderer.send('session-attach', sessionId);
});

// 2. Receive session history (on attach)
ipcRenderer.on('session-history', (event, sessionId, history) => {
    if (sessionId !== currentSessionId) return;
    consoleOutput.innerHTML = ''; // Clear initial "Ready" message

    // History is raw text aggregation. 
    // We wrap it in a div to preserve whitespace.
    const div = document.createElement('div');
    div.className = 'whitespace-pre-wrap break-all text-gray-800';
    div.innerText = history;
    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
});

// 3. Receive live output
ipcRenderer.on('session-output', (event, sessionId, data) => {
    if (sessionId !== currentSessionId) return;
    appendConsoleOutput(data, 'text-gray-800');
});

// 4. Session exited
ipcRenderer.on('session-exit', (event, sessionId, code) => {
    if (sessionId !== currentSessionId) return;
    appendConsoleOutput(`\n[Process exited with code ${code}]\n`, 'text-gray-500');
});

// --- UI Logic ---

function appendConsoleOutput(text, colorClass) {
    const div = document.createElement('div');
    div.className = `${colorClass} whitespace-pre-wrap break-all`;
    div.innerText = text; // Usage of innerText handles escaping for us generally
    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

let commandHistory = [];
let historyIndex = -1;

consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!currentSessionId) return;

        const command = consoleInput.value;

        // Echo input locally for immediate feedback 
        // (Python interactive shell typically echoes input, but if we write to stdin, 
        // we usually need to display what we typed)
        const echoDiv = document.createElement('div');
        // Use innerHTML for the prompt styling
        echoDiv.innerHTML = `<span class="text-idle-keyword font-bold mr-2">>>></span><span>${escapeHtml(command)}</span>`;
        consoleOutput.appendChild(echoDiv);

        // Send to Main
        ipcRenderer.send('session-input', currentSessionId, command);

        commandHistory.push(command);
        historyIndex = commandHistory.length;
        consoleInput.value = '';
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    } else if (e.key === 'ArrowUp') {
        if (historyIndex > 0) {
            historyIndex--;
            consoleInput.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            consoleInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            consoleInput.value = '';
        }
    }
});

clearConsoleBtn.addEventListener('click', () => {
    // Just clear local view
    consoleOutput.innerHTML = '<div class="text-gray-500 mb-1">Python Interactive Shell Ready.</div>';
});

consoleInput.focus();
