const { spawn } = require('child_process');
const { ipcRenderer } = require('electron');

let pythonProcess = null;
const consoleOutput = document.getElementById('console-output');
const consoleInput = document.getElementById('console-input');
const clearConsoleBtn = document.getElementById('clear-console-btn');

function initPythonShell(args = ['-i', '-u']) {
    if (pythonProcess) pythonProcess.kill();

    pythonProcess = spawn('python3', args);

    pythonProcess.stdout.on('data', (data) => {
        appendConsoleOutput(data.toString(), 'text-blue-600');
    });

    pythonProcess.stderr.on('data', (data) => {
        const text = data.toString();
        // Ignore generic prompts if needed, but for now we might show them or filter
        if (text.trim() === '>>>' || text.trim() === '...') return;
        appendConsoleOutput(text, 'text-red-500');
    });

    pythonProcess.on('close', (code) => {
        appendConsoleOutput(`\nProcess exited with code ${code}\n`, 'text-gray-500');
        pythonProcess = null;
    });
}

ipcRenderer.on('run-file', (event, filePath) => {
    consoleOutput.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'text-gray-500 mb-1';
    div.textContent = `=== RESTART: ${filePath} ===`;
    consoleOutput.appendChild(div);

    // Run with file path
    initPythonShell(['-i', '-u', filePath]);
});

function appendConsoleOutput(text, colorClass) {
    const div = document.createElement('div');
    div.className = `${colorClass} whitespace-pre-wrap break-all`;
    div.textContent = text;
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
        const command = consoleInput.value;

        const echoDiv = document.createElement('div');
        echoDiv.innerHTML = `<span class="text-idle-keyword font-bold mr-2">>>></span><span>${escapeHtml(command)}</span>`;
        consoleOutput.appendChild(echoDiv);

        if (pythonProcess) {
            pythonProcess.stdin.write(command + '\n');
        } else {
            appendConsoleOutput('Python process is not running. Restarting...', 'text-gray-500');
            initPythonShell();
            if (pythonProcess) pythonProcess.stdin.write(command + '\n');
        }

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
    consoleOutput.innerHTML = '<div class="text-gray-500 mb-1">Python Interactive Shell Ready.</div>';
});

// Focus input on load
consoleInput.focus();
// Only init generic shell if NOT running a file immediately?
// But run-file comes later via IPC.
// So safe to init generic shell first, then restart if run-file comes.
initPythonShell();

