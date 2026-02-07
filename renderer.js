const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const hljs = require('highlight.js/lib/core');
hljs.registerLanguage('python', require('highlight.js/lib/languages/python'));

// IPC Listeners
ipcRenderer.on('open-file', (event, filePath) => {
    openFile(filePath);
});


ipcRenderer.on('open-folder', (event, folderPath) => {
    PROJECT_ROOT = folderPath;
    document.title = path.basename(folderPath);
    loadDirectory(PROJECT_ROOT, treeContainer);
});


// Configuration
let PROJECT_ROOT = process.cwd();
const ICONS = {
    folder: 'folder',
    folderOpen: 'folder_open',
    file: 'description',
    python: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGsPM0pa6it1ik4ALfAseYsiUBtja_odQXYtSkBWckk_7seMGRxLVh19PyQnvSzqoSwjRb4doee1McFxJSSwtbjjiAwm-g3I-dfurW3cDOZLMOLrd8cJozhy1zC_2WWYJn91tjN_Ag74No_pmmqIK-OndotvzzYPESrPODIS6oPQ3KLccIIWDH7yT9YCmSVG9jt4YG5fqvUcqxZynsGt0wgO5U2cGdAKqfEKkcAXEIlV98_WvWEa6hCLzFH8h1dyU3bZ_sswlEu5A'
};

const treeContainer = document.getElementById('file-tree');
const codeContent = document.getElementById('code-content');
const lineNumbers = document.getElementById('line-numbers');
const contextMenu = document.getElementById('file-context-menu');

// Context Menu State
let ctxTarget = null;
let ctxPath = null;
let ctxIsDir = false;

// UI Elements for Menu
const ctxRename = document.getElementById('ctx-rename');
const ctxDelete = document.getElementById('ctx-delete');
const ctxSeparator = contextMenu.querySelector('.border-b');

// Initial Load
loadDirectory(PROJECT_ROOT, treeContainer);

// Global Click to close context menu
document.addEventListener('click', () => {
    if (!contextMenu.classList.contains('hidden')) {
        contextMenu.classList.add('hidden');
    }
});

// Empty Space Context Menu (Root Level)
treeContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // If propagation was stopped by an item, this won't run.
    console.log('Root context menu triggered');

    // Clear selection when clicking empty space
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('bg-blue-100', 'text-blue-600'));

    ctxTarget = { row: null, parent: treeContainer, childrenContainer: null, fullPath: PROJECT_ROOT };
    ctxPath = PROJECT_ROOT;
    ctxIsDir = true;

    // Show only New File/Folder
    ctxRename.style.display = 'none';
    ctxDelete.style.display = 'none';
    if (ctxSeparator) ctxSeparator.style.display = 'none';

    // Position Menu
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.classList.remove('hidden');
});

function loadDirectory(dirPath, container) {
    container.innerHTML = '';
    fs.readdir(dirPath, { withFileTypes: true }, (err, dirents) => {
        if (err) return console.error(err);

        // Sort: Folders first, then files
        dirents.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        dirents.forEach(dirent => {
            if (dirent.name.startsWith('.') && dirent.name !== '.gitignore') return;
            if (dirent.name === 'node_modules') return;

            const itemPath = path.join(dirPath, dirent.name);
            const itemElement = createTreeItem(dirent, itemPath, container);
            container.appendChild(itemElement);
        });
    });
}

function createTreeItem(dirent, fullPath, parentContainer) {
    const isDir = dirent.isDirectory();
    const itemContainer = document.createElement('div');
    const itemRow = document.createElement('div');

    itemRow.className = 'tree-item select-none';
    itemRow.style.paddingLeft = '10px';

    // Icon Logic
    const iconSpan = document.createElement('span');
    if (isDir) {
        iconSpan.className = 'material-symbols-outlined !text-[16px] text-gray-500';
        iconSpan.textContent = 'keyboard_arrow_right';
    } else {
        if (dirent.name.endsWith('.py')) {
            const img = document.createElement('img');
            img.src = ICONS.python;
            img.className = 'w-3.5 h-3.5';
            iconSpan.appendChild(img);
        } else {
            iconSpan.className = 'material-symbols-outlined !text-[16px] text-gray-400';
            iconSpan.textContent = 'description';
        }
    }

    const label = document.createElement('span');
    label.textContent = dirent.name;
    label.className = 'ml-1';

    itemRow.appendChild(iconSpan);
    itemRow.appendChild(label);
    itemContainer.appendChild(itemRow);

    // Children Container (for folders)
    let childrenContainer = null;
    if (isDir) {
        childrenContainer = document.createElement('div');
        childrenContainer.className = 'ml-3 border-l border-gray-200 hidden';
        itemContainer.appendChild(childrenContainer);
    }

    // Event Handling
    itemRow.addEventListener('click', (e) => {
        e.stopPropagation();

        // Remove active state
        document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('bg-blue-100', 'text-blue-600'));
        itemRow.classList.add('bg-blue-100', 'text-blue-600');

        if (isDir) {
            const isHidden = childrenContainer.classList.contains('hidden');
            if (isHidden) {
                childrenContainer.classList.remove('hidden');
                iconSpan.textContent = 'keyboard_arrow_down';
                if (childrenContainer.children.length === 0) {
                    loadDirectory(fullPath, childrenContainer);
                }
            } else {
                childrenContainer.classList.add('hidden');
                iconSpan.textContent = 'keyboard_arrow_right';
            }
        } else {
            openFile(fullPath);
        }
    });

    itemRow.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Highlight logic
        document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('bg-blue-100', 'text-blue-600'));
        itemRow.classList.add('bg-blue-100', 'text-blue-600');

        ctxTarget = { row: itemRow, parent: parentContainer, childrenContainer: childrenContainer, fullPath: fullPath };
        ctxPath = fullPath;
        ctxIsDir = isDir;

        // Ensure full menu is shown
        ctxRename.style.display = 'block';
        ctxDelete.style.display = 'block';
        if (ctxSeparator) ctxSeparator.style.display = 'block';

        // Position Menu
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.remove('hidden');
    });

    return itemContainer;
}

// Context Menu Actions
document.getElementById('ctx-new-file').addEventListener('click', () => createItemUI(false));
document.getElementById('ctx-new-folder').addEventListener('click', () => createItemUI(true));
document.getElementById('ctx-rename').addEventListener('click', () => renameItemUI());
document.getElementById('ctx-delete').addEventListener('click', () => deleteItem());

function createItemUI(isFolder) {
    if (!ctxTarget) return;

    // Determine target container
    let containerToAdd;
    let basePath;

    // If clicking root (empty space)
    if (ctxTarget.parent === treeContainer && !ctxTarget.row) {
        containerToAdd = treeContainer;
        basePath = PROJECT_ROOT;
    } else {
        // Normal item click
        containerToAdd = ctxTarget.parent;
        basePath = path.dirname(ctxPath);

        // If clicking a folder that is expanded, add inside
        if (ctxIsDir && ctxTarget.childrenContainer && !ctxTarget.childrenContainer.classList.contains('hidden')) {
            containerToAdd = ctxTarget.childrenContainer;
            basePath = ctxPath;
        }
    }

    const inputContainer = document.createElement('div');
    inputContainer.className = 'flex items-center gap-1.5 px-2 py-0.5 ml-3 bg-blue-50';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined !text-[16px] text-gray-400';
    icon.textContent = isFolder ? 'folder' : 'description';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-[13px] border border-blue-400 px-1 py-0.5 w-full outline-none';
    input.value = isFolder ? 'New Folder' : 'new_file.py';

    inputContainer.appendChild(icon);
    inputContainer.appendChild(input);

    // Insert Logic: 
    // If root/empty space click, just append or prepend? Prepend looks better.
    if (containerToAdd.firstChild) {
        containerToAdd.insertBefore(inputContainer, containerToAdd.firstChild);
    } else {
        containerToAdd.appendChild(inputContainer);
    }

    input.focus();
    input.select();

    const commitCreation = () => {
        const name = input.value.trim();
        if (!name) {
            inputContainer.remove();
            return;
        }

        const newPath = path.join(basePath, name);

        try {
            if (isFolder) {
                fs.mkdirSync(newPath);
            } else {
                fs.writeFileSync(newPath, '');
            }
            loadDirectory(basePath, containerToAdd);
        } catch (err) {
            console.error(err);
            alert(`Error creating item: ${err.message}`);
            inputContainer.remove();
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commitCreation();
        if (e.key === 'Escape') inputContainer.remove();
    });

    input.addEventListener('blur', () => {
        if (document.activeElement !== input) commitCreation();
    });
}

function renameItemUI() {
    if (!ctxTarget || !ctxTarget.row) return; // Cannot rename root

    const row = ctxTarget.row;
    const labelSpan = row.querySelector('span:last-child');
    const oldName = labelSpan.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-[13px] border border-blue-400 px-1 py-0.5 w-full outline-none ml-1';
    input.value = oldName;

    labelSpan.replaceWith(input);
    input.focus();
    input.select();

    input.addEventListener('click', e => e.stopPropagation());

    const commitRename = () => {
        const newName = input.value.trim();
        if (!newName || newName === oldName) {
            input.replaceWith(labelSpan);
            return;
        }

        const newPath = path.join(path.dirname(ctxPath), newName);

        try {
            fs.renameSync(ctxPath, newPath);
            loadDirectory(path.dirname(ctxPath), ctxTarget.parent);
        } catch (err) {
            console.error(err);
            alert(`Error renaming: ${err.message}`);
            input.replaceWith(labelSpan);
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commitRename();
        if (e.key === 'Escape') input.replaceWith(labelSpan);
    });

    input.addEventListener('blur', commitRename);
}

function deleteItem() {
    if (!ctxTarget || !ctxTarget.row) return;
    if (!confirm(`Are you sure you want to delete '${path.basename(ctxPath)}'?`)) return;

    try {
        fs.rmSync(ctxPath, { recursive: true, force: true });
        loadDirectory(path.dirname(ctxPath), ctxTarget.parent);
    } catch (err) {
        console.error(err);
        alert(`Error deleting: ${err.message}`);
    }
}


function openFile(filePath) {
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) return console.error(err);
        currentFilePath = filePath;
        document.title = `${path.basename(filePath)} - ${filePath}`;
        renderCode(data);
    });
}


// Current open file path
let currentFilePath = null;

function renderCode(content) {
    const lines = content.split('\n');
    const lineNumbers = document.getElementById('line-numbers');
    const codeContent = document.getElementById('code-content');

    if (!lineNumbers || !codeContent) return;

    // Enable editing
    codeContent.contentEditable = true;
    codeContent.spellcheck = false;
    codeContent.style.outline = 'none';

    lineNumbers.innerHTML = '';
    codeContent.innerHTML = '';

    // We use innerHTML to support syntax highlighting.

    // Use highlight.js
    const highlightedCode = hljs.highlight(content, { language: 'python' }).value;

    // Split back into lines to preserve our line-based div structure
    // This can be tricky if hljs spans cross newlines. 
    // Usually hljs returns a big HTML string.
    // If we want to line numbers to align, we should probably render the whole thing 
    // but we need to ensure separate lines for our loop.
    // Simpler approach: Just put the whole highlighted HTML in, and count lines for line numbers.
    // BUT we want to keep the "div per line" structure if possible for "Go to Line" and structure.
    // However, hljs might open a span on line 1 and close it on line 3 (multi-line string).
    // Breaking that into divs is hard.

    // Alternative: Just set innerHTML with the blob, and ensure line-height matches line-numbers.
    // We already use a monospaced font so height should match if we handle newlines right.
    // Let's wrapping it in a pre or just use simple newlines?
    // Our existing CSS uses `whitespace-pre`.

    codeContent.innerHTML = highlightedCode;

    // Add line numbers based on newlines
    const lineCount = content.split('\n').length;
    updateLineNumbers(lineCount);

    // Simple line number sync (Optimized)
    codeContent.oninput = () => {
        const text = codeContent.innerText;
        const currentCheck = text.split('\n').length;
        if (currentCheck !== lineCount) {
            updateLineNumbers(currentCheck);
        }
    };

    codeContent.onkeydown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
    };
}

function updateLineNumbers(count) {
    const lineNumbers = document.getElementById('line-numbers');
    lineNumbers.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const numDiv = document.createElement('div');
        numDiv.textContent = i;
        numDiv.className = 'h-[20px] leading-[20px]'; // Match CSS line-height exactly
        lineNumbers.appendChild(numDiv);
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

ipcRenderer.on('save-file', () => {
    if (currentFilePath) {
        const content = document.getElementById('code-content').innerText;
        fs.writeFile(currentFilePath, content, (err) => {
            if (err) {
                alert(`Error saving file: ${err.message}`);
                console.error(err);
                return;
            }
            // Optional: flash feedback
            const title = document.title;
            document.title = title.replace(' *', '') + ' (Saved)';
            setTimeout(() => document.title = title.replace(' *', ''), 2000);
        });
    } else {
        // Trigger Save As (handled in main usually, but we can trigger it here too or send back)
        ipcRenderer.send('save-as-request'); // We need to add this to main
    }
});


// --- Menu Action Listeners ---

// Format Menu
ipcRenderer.on('format-indent', () => {
    // Basic indent at cursor or selection substitute
    document.execCommand('insertText', false, '    ');
});

ipcRenderer.on('format-dedent', () => {
    // Very basic dedent: remove 4 spaces if present at start of line or cursor
    // Since we don't have full editor state control easily, we'll just try to implement a simple 'shift-tab' behavior
    // For now, let's keep it simple or user might get frustrated with poor implementation.
    // If we want true dedent, we need to handle selection. 
    // Let's implement a naive "remove 4 chars back" for now or wait for better editor.
    // document.execCommand('delete'); // Too risky
    alert('Dedent not fully implemented in this basic editor view.');
});

ipcRenderer.on('format-comment', () => {
    document.execCommand('insertText', false, '# ');
});

ipcRenderer.on('format-uncomment', () => {
    // Hard to do without selection context
    alert('Uncomment not fully implemented.');
});

ipcRenderer.on('format-tabify', () => {
    const content = document.getElementById('code-content').innerText;
    const newContent = content.replace(/    /g, '\t');
    document.getElementById('code-content').innerText = newContent;
});

ipcRenderer.on('format-untabify', () => {
    const content = document.getElementById('code-content').innerText;
    const newContent = content.replace(/\t/g, '    ');
    document.getElementById('code-content').innerText = newContent;
});

ipcRenderer.on('format-strip-trailing', () => {
    const content = document.getElementById('code-content').innerText;
    const newContent = content.split('\n').map(line => line.trimEnd()).join('\n');
    document.getElementById('code-content').innerText = newContent;
});


ipcRenderer.on('option-show-line-numbers', () => {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers.style.display === 'none') {
        lineNumbers.style.display = 'block';
    } else {
        lineNumbers.style.display = 'none';
    }
});

ipcRenderer.on('option-zoom-in', () => {
    const currentZoom = require('electron').webFrame.getZoomFactor();
    require('electron').webFrame.setZoomFactor(currentZoom + 0.1);
});

ipcRenderer.on('toggle-explorer', (event, show) => {
    const el = document.querySelector('aside.w-\\[260px\\]');
    if (el) el.style.display = show ? 'flex' : 'none';
});

ipcRenderer.on('toggle-console', (event, show) => {
    const el = document.getElementById('console-area');
    if (el) el.style.display = show ? 'flex' : 'none';
});

ipcRenderer.on('edit-goto-line', () => {
    const line = prompt('Go to line number:');
    if (line) {
        const lineNum = parseInt(line);
        if (!isNaN(lineNum)) {
            // contenteditable doesn't have easy line jumping.
            // We can approximate by scrolling line-number div
            const lineNumbers = document.getElementById('line-numbers');
            const target = lineNumbers.children[lineNum - 1];
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
});



ipcRenderer.on('option-zoom-out', () => { // Not in menu but good helper? 
    // Menu says "Zoom Height" Alt+2... usually toggles full screen height in IDLE?
    // Let's implement actual Zoom In/Out if user asks, but strictly stick to IDLE menu:
    // "Zoom Height" -> Toggles window max height? 
    // Electron: win.maximize() / restore?
    ipcRenderer.send('window-zoom-height');
});



ipcRenderer.on('run-module', () => {
    // Save first
    if (currentFilePath) {
        const content = document.getElementById('code-content').innerText;
        fs.writeFileSync(currentFilePath, content);

        // Run
        runPythonMetadata(currentFilePath);
    } else {
        alert('Please save the file before running.');
        ipcRenderer.send('save-as-request');
    }
});

function runPythonMetadata(path) {
    if (!path) return;

    // Clear console
    consoleOutput.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'text-gray-500 mb-1';
    div.textContent = `=== RESTART: ${path} ===`;
    consoleOutput.appendChild(div);

    // Restart logic: Kill existing, start new with file
    if (pythonProcess) {
        pythonProcess.kill();
    }

    // Spawn new process running the file
    // Note: IDLE runs the file and then enters interactive mode. 
    // python -i file.py
    pythonProcess = spawn('python3', ['-i', '-u', path]);

    pythonProcess.stdout.on('data', (data) => {
        appendConsoleOutput(data.toString(), 'text-blue-600');
    });

    pythonProcess.stderr.on('data', (data) => {
        const text = data.toString();
        if (text.trim() === '>>>' || text.trim() === '...') return;
        appendConsoleOutput(text, 'text-red-500');
    });

    pythonProcess.on('close', (code) => {
        appendConsoleOutput(`\n>>> `, 'text-[var(--idle-keyword)] font-bold');
        // We probably don't want to nullify pythonProcess here if we want to keep using it for shell?
        // Actually -i keeps it open.
    });
}





// --- Console Logic ---
const { spawn } = require('child_process');

let pythonProcess = null;
const consoleOutput = document.getElementById('console-output');
const consoleInput = document.getElementById('console-input');
const clearConsoleBtn = document.getElementById('clear-console-btn');

function initPythonShell() {
    // Spawn python3 in interactive mode (-i) and unbuffered (-u)
    // We use -i to force interactive mode even though it's a pipe.
    pythonProcess = spawn('python3', ['-i', '-u']);

    pythonProcess.stdout.on('data', (data) => {
        appendConsoleOutput(data.toString(), 'text-blue-600'); // IDLE stdout is blue
    });

    pythonProcess.stderr.on('data', (data) => {
        // Python interactive mode echoes the prompt to stderr usually
        const text = data.toString();
        if (text.trim() === '>>>' || text.trim() === '...') {
            // These prompts are handled by our UI, we might want to ignore them 
            // or we might want to show them if we want exact behavior.
            // For now, let's ignore the generic prompts because we have our own input field prompt
            return;
        }
        appendConsoleOutput(text, 'text-red-500'); // IDLE stderr is red
    });

    pythonProcess.on('close', (code) => {
        appendConsoleOutput(`\nProcess exited with code ${code}\n`, 'text-gray-500');
        pythonProcess = null;
    });
}

function appendConsoleOutput(text, colorClass) {
    const span = document.createElement('span');
    span.className = `${colorClass} whitespace-pre-wrap font-mono`;
    span.textContent = text;

    // Check if the last element is a span, merge if same color to avoid too many nodes? 
    // Simplified: just append div or span.
    // Use div for blocks?
    const div = document.createElement('div');
    div.className = `${colorClass} whitespace-pre-wrap break-all`;
    div.textContent = text;

    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Input Handling
let commandHistory = [];
let historyIndex = -1;

consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const command = consoleInput.value;

        // Echo command
        const echoDiv = document.createElement('div');
        echoDiv.innerHTML = `<span class="text-[var(--idle-keyword)] font-bold mr-2">>>></span><span>${escapeHtml(command)}</span>`;
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

const popOutBtn = document.getElementById('pop-out-console-btn');

if (popOutBtn) {
    popOutBtn.addEventListener('click', () => {
        ipcRenderer.send('pop-out-console');

        // Hide local console area
        const consoleArea = document.getElementById('console-area');
        if (consoleArea) {
            consoleArea.style.display = 'none';
        }

        // Kill local python process to avoid overhead if desired, or keep it. 
        // Let's kill it to simulate "moving" it.
        if (pythonProcess) {
            pythonProcess.kill();
            pythonProcess = null;
        }
    });
}

// Start shell on load
initPythonShell();

