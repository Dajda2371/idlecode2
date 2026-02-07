const { ipcRenderer } = require('electron');

let currentSessionId = null;
const consoleOutput = document.getElementById('console-output');
const consoleInput = document.getElementById('console-input');
const clearConsoleBtn = document.getElementById('clear-console-btn');

let commandHistory = [];
let historyIndex = -1;
let currentPromptText = '>>>';

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
        // Use currentPromptText which reflects the prompt active when this input was typed
        // Note: This relies on currentPromptText not changing before echo arrives.
        // Echo arrives immediately on Enter from Renderer->Main->Renderer (instant).

        let promptHtml = `<span class="text-idle-keyword font-bold mr-2 select-none">${currentPromptText}</span>`;
        if (currentPromptText !== '>>>') {
            // Maybe different style for indentation prompt? IDLE usually keeps color.
            // But "1 . . ." usually is just text.
            promptHtml = `<span class="text-idle-keyword font-bold mr-2 select-none">${currentPromptText}</span>`;
        }

        div.innerHTML = `${promptHtml}<span>${escapeHtml(entry.text)}</span>`;
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
let waitingForInput = false;
let inputPromptText = '';

consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!currentSessionId) return;
        const command = consoleInput.value;

        // Check if we're waiting for input() response
        if (waitingForInput) {
            // Create a line with the prompt in blue (stdout color) and input in black
            const div = document.createElement('div');
            div.className = "mt-1";
            const inputPromptSpan = `<span class="text-blue-600">${escapeHtml(inputPromptText)}</span>`;
            const inputSpan = `<span>${escapeHtml(command)}</span>`;
            div.innerHTML = inputPromptSpan + inputSpan;
            consoleOutput.appendChild(div);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;

            // Send just the user's input to Python
            ipcRenderer.send('session-input', currentSessionId, command);

            // Clear the waiting state
            waitingForInput = false;
            inputPromptText = '';

            // Restore the normal prompt
            const promptSpan = document.getElementById('console-prompt');
            if (promptSpan) {
                promptSpan.innerText = currentPromptText || '>>>';
            }

            // Clear input
            consoleInput.value = '';
            ipcRenderer.send('session-input-draft', currentSessionId, '');
        } else {
            // Normal command handling
            // Send to Main (it will echo back as 'input' type)
            ipcRenderer.send('session-input', currentSessionId, command);

            // Clear input
            consoleInput.value = '';
            ipcRenderer.send('session-input-draft', currentSessionId, ''); // Clear draft
        }

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
        // Send request to remove session entirely
        ipcRenderer.send('session-close', currentSessionId);
    }
});

clearConsoleBtn.addEventListener('click', () => {
    consoleOutput.innerHTML = '<div class="text-gray-500 mb-1">Python Interactive Shell Ready.</div>';
});

// Prompt Handling
let currentIndentLevel = 0;

ipcRenderer.on('session-prompt', (event, sessionId, type) => {
    if (sessionId !== currentSessionId) return;

    const promptSpan = document.getElementById('console-prompt');

    if (type === 'standard') {
        currentIndentLevel = 0;
        currentPromptText = '>>>';
        if (promptSpan) promptSpan.innerText = '>>>';
        consoleInput.value = '';
    } else if (type === 'continuation') {
        // Calculate based on history
        const lastCmd = commandHistory[commandHistory.length - 1] || '';

        // Count leading 4-space tabs
        const match = lastCmd.match(/^ */);
        const spaces = match ? match[0].length : 0;

        let indents = Math.floor(spaces / 4);

        const uncommented = lastCmd.split('#')[0].trim();
        if (uncommented.endsWith(':')) {
            indents += 1;
        }

        currentIndentLevel = indents;

        // User requested "..." for continuation
        const promptText = '...';

        currentPromptText = promptText;
        if (promptSpan) promptSpan.innerText = promptText;

        // Auto-fill input
        if (indents > 0) {
            consoleInput.value = '    '.repeat(indents);
        }
    }
});

// Input Prompt Handling (for Python's input() function)
ipcRenderer.on('session-input-prompt', (event, sessionId, promptText) => {
    if (sessionId !== currentSessionId) return;

    // Store that we're waiting for input
    waitingForInput = true;
    inputPromptText = promptText;

    // Update the prompt
    const promptSpan = document.getElementById('console-prompt');
    if (promptSpan) {
        promptSpan.innerText = promptText;
    }

    // Clear the input field
    consoleInput.value = '';
});


// Tab and Smart Backspace
consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = consoleInput.selectionStart;
        const end = consoleInput.selectionEnd;
        const val = consoleInput.value;
        consoleInput.value = val.substring(0, start) + "    " + val.substring(end);
        consoleInput.selectionStart = consoleInput.selectionEnd = start + 4;
    } else if (e.key === 'Backspace') {
        // Only if cursor is just a cursor (no selection range) and preceded by 4 spaces
        const start = consoleInput.selectionStart;
        const end = consoleInput.selectionEnd;

        if (start === end && start >= 4) {
            const val = consoleInput.value;
            // Check if the 4 chars before cursor are spaces
            if (val.substring(start - 4, start) === '    ') {
                e.preventDefault();
                consoleInput.value = val.substring(0, start - 4) + val.substring(start);
                consoleInput.selectionStart = consoleInput.selectionEnd = start - 4;
            }
        }
    } else if (e.key === 'ArrowLeft') {
        const start = consoleInput.selectionStart;
        const end = consoleInput.selectionEnd;
        // Only move by 4 if no selection and we can move back 4 spaces
        if (start === end && start >= 4) {
            e.preventDefault();
            consoleInput.selectionStart = consoleInput.selectionEnd = start - 4;
        }
    } else if (e.key === 'ArrowRight') {
        const start = consoleInput.selectionStart;
        const end = consoleInput.selectionEnd;
        const val = consoleInput.value;
        // Only move by 4 if no selection and we can move forward 4 spaces
        if (start === end && start + 4 <= val.length) {
            e.preventDefault();
            consoleInput.selectionStart = consoleInput.selectionEnd = start + 4;
        }
    }
});

consoleInput.focus();
