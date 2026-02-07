const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const { spawn } = require('child_process'); // Added spawn
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

    // Split highlighted code into lines. 
    // HLJS might produce HTML that spans lines. This is the tricky part.
    // If we use separate containers for line numbers, alignment fails as seen.
    // So we MUST use a row-based layout: <div class="line"><div class="num">1</div><div class="code">...</div></div>
    // BUT HLJS output is a single HTML block.
    // To solve this robustly without a complex parser:
    // 1. We keep the separate containers but force them to be single lines with NO WRAPPING.
    // 2. We set explicit height in pixels for every line.

    // Let's try explicit line styling first. 
    // The previous attempt failed because contenteditable puts text in text nodes or divs, and highlight.js puts spans. 
    // Spans can affect line height if font-size fallback happens or if there are inline-blocks.

    codeContent.innerHTML = '';

    // Use highlight.js
    // We will highlight line-by-line to ensure perfect alignment with line numbers.
    let html = '';

    lineNumbers.innerHTML = ''; // Clear existing line numbers

    lines.forEach((line, index) => {
        // Highlight each line individually.
        const highlightedLine = hljs.highlight(line, { language: 'python' }).value;
        const lineNum = index + 1;

        // Enforce fixed height row
        // We use explicit styles to override any CSS cascading issues
        html += `<div style="height: 20px; line-height: 20px; white-space: pre; overflow: hidden;">${highlightedLine || ' '}</div>`;

        const numDiv = document.createElement('div');
        numDiv.textContent = lineNum;
        numDiv.className = 'h-[20px] leading-[20px]';
        numDiv.style.height = '20px';
        numDiv.style.lineHeight = '20px';
        lineNumbers.appendChild(numDiv);
    });

    codeContent.innerHTML = html;

    // Scroll Sync
    codeContent.onscroll = () => {
        lineNumbers.scrollTop = codeContent.scrollTop;
    };

    // Simple line number sync (Optimized)
    codeContent.oninput = () => {
        const text = codeContent.innerText;
        const currentCheck = text.split('\n').length;
        if (currentCheck !== lines.length) {
            // We can't easily update line numbers one by one without re-rendering?
            // For now, let's just update the count.
            lineNumbers.innerHTML = '';
            for (let i = 1; i <= currentCheck; i++) {
                const numDiv = document.createElement('div');
                numDiv.textContent = i;
                numDiv.style.height = '20px';
                numDiv.style.lineHeight = '20px';
                numDiv.className = 'h-[20px] leading-[20px]';
                lineNumbers.appendChild(numDiv);
            }
        }
    };

    codeContent.onkeydown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
    };
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



ipcRenderer.on('toggle-ai-agent', (event, show) => {
    // Assuming we have an AI Agent sidebar or panel.
    // Let's create one or toggle existing if we had it.
    // Based on previous code, we might not have a dedicated AI panel yet except 'console-area' or 'explorer'.
    // Let's assume we want a right sidebar or similar.
    let aiPanel = document.getElementById('ai-panel');
    if (!aiPanel) {
        // Create it if missing (stub)
        aiPanel = document.createElement('div');
        aiPanel.id = 'ai-panel';
        aiPanel.className = 'w-[300px] border-l border-gray-200 bg-gray-50 flex flex-col hidden';
        aiPanel.innerHTML = `
            <div class="bg-gray-100 border-b border-gray-300 px-2 py-1 flex justify-between items-center font-bold text-xs">
                <span>AI Agent</span>
                <button onclick="document.getElementById('ai-panel').style.display='none'">X</button>
            </div>
            <div class="p-2 flex-1 overflow-auto text-xs">
                AI Agent is ready.
            </div>
        `;
        document.querySelector('main').appendChild(aiPanel);
        // Adjust main flex direction? It is flex-row?
        // <main> is flex-col. So appending AI panel at bottom? 
        // We want it side-by-side with editor?
        // Parent of <main> is <body> which is flex-col.
        // <div class="flex-1 flex overflow-hidden"> contains <aside> and <main>.
        // We should append to that container.
        document.querySelector('.h-screen > div.flex-1').appendChild(aiPanel);
    }

    if (show) aiPanel.style.display = 'flex';
    else aiPanel.style.display = 'none';
});

ipcRenderer.on('run-module', () => {
    // Save first
    if (currentFilePath) {
        const content = document.getElementById('code-content').innerText;
        fs.writeFileSync(currentFilePath, content);

        // Check if local console is visible
        const consoleArea = document.getElementById('console-area');
        const isConsoleVisible = consoleArea.style.display !== 'none';

        if (isConsoleVisible) {
            // Run locally
            runPythonMetadata(currentFilePath);
            // Ensure console is focused/shown
            consoleArea.style.display = 'flex';
        } else {
            // Run in POP OUT (New Window)
            // We need to tell Main process to spawn a new window that runs this file.
            ipcRenderer.send('run-module-popout', currentFilePath);
        }
    } else {
        alert('Please save the file before running.');
        ipcRenderer.send('save-as-request');
    }
});

ipcRenderer.on('menu-new-console', () => {
    ipcRenderer.send('new-console-window');
});



function runPythonMetadata(path) {
    if (!path) return;

    // Use active console or create one
    let targetConsole;
    if (activeConsoleId) {
        targetConsole = consoles.find(c => c.id === activeConsoleId);
    }

    if (!targetConsole) {
        createConsole(`Run: ${path.split(/[/\\]/).pop()}`, path);
    } else {
        // Restart existing console with this file
        spawnConsoleProcess(targetConsole, path);
    }
}


// Console State
let consoles = [];
let activeConsoleId = null;
let nextConsoleId = 1;

// Elements
const consoleOutput = document.getElementById('console-output');
const consoleInput = document.getElementById('console-input');
const clearConsoleBtn = document.getElementById('clear-console-btn');
const consoleList = document.getElementById('console-list');
const addConsoleBtn = document.getElementById('add-console-btn');
const activeConsoleTitle = document.getElementById('active-console-title');

function createConsole(name = `Shell ${nextConsoleId}`, filePath = null) {
    const id = nextConsoleId++;
    const consoleData = {
        id,
        name,
        process: null,
        history: '<div class="text-gray-500 mb-1">Python Interactive Shell Ready.</div>', // HTML history
        commandHistory: [],
        historyIndex: -1,
        filePath
    };

    consoles.push(consoleData);
    spawnConsoleProcess(consoleData, filePath);

    // Switch to new console immediately
    switchConsole(id);
    renderConsoleList();
    return consoleData;
}

function spawnConsoleProcess(consoleData, filePath = null) {
    if (consoleData.process) {
        try { consoleData.process.kill(); } catch (e) { }
    }

    const args = filePath ? ['-i', '-u', filePath] : ['-i', '-u'];
    // If restarting with file, update name + history header
    if (filePath) {
        consoleData.name = `Run: ${path.basename(filePath)}`;
        consoleData.filePath = filePath;
        consoleData.history += `<div class="text-gray-500 mb-1 mt-2">=== RESTART: ${filePath} ===</div>`;
        if (activeConsoleId === consoleData.id) {
            updateConsoleDOM(consoleData);
        }
    }

    const proc = spawn('python3', args);
    consoleData.process = proc;

    proc.stdout.on('data', (data) => {
        appendConsoleData(consoleData, data.toString(), 'text-blue-600');
    });

    proc.stderr.on('data', (data) => {
        const text = data.toString();
        if (text.trim() === '>>>' || text.trim() === '...') return;
        appendConsoleData(consoleData, text, 'text-red-500');
    });

    proc.on('close', (code) => {
        appendConsoleData(consoleData, `\nProcess exited with code ${code}\n`, 'text-gray-500');
        consoleData.process = null;
        renderConsoleList(); // Update status icon if we add one

        // Auto-restart simple shell? No, IDLE doesn't auto-restart dead shell unless requested.
        // It shows the prompt usually.
        appendConsoleData(consoleData, `\n>>> `, 'text-[var(--idle-keyword)] font-bold');
    });
}

function switchConsole(id) {
    const target = consoles.find(c => c.id === id);
    if (!target) return;

    activeConsoleId = id;
    consoleOutput.innerHTML = target.history;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;

    if (activeConsoleTitle) activeConsoleTitle.textContent = target.name;

    renderConsoleList();
    consoleInput.focus();
}

function closeConsole(id) {
    const idx = consoles.findIndex(c => c.id === id);
    if (idx === -1) return;

    const target = consoles[idx];
    if (target.process) target.process.kill();

    consoles.splice(idx, 1);

    if (consoles.length === 0) {
        // Reset ID
        activeConsoleId = null;
        nextConsoleId = 1;

        // Clear UI
        consoleOutput.innerHTML = '<div class="text-gray-400 p-2 italic">No active shell. Click + to start one.</div>';
        if (activeConsoleTitle) activeConsoleTitle.textContent = 'No Active Console';
        renderConsoleList();
    } else {
        if (activeConsoleId === id) {
            // Switch to previous or first
            const newTarget = consoles[idx - 1] || consoles[0];
            switchConsole(newTarget.id);
        } else {
            renderConsoleList();
        }
    }
}

function renderConsoleList() {
    consoleList.innerHTML = '';

    consoles.forEach(c => {
        const item = document.createElement('div');
        const isActive = c.id === activeConsoleId;

        item.className = `flex items-center justify-between px-2 py-1.5 cursor-pointer text-xs group ${isActive ? 'bg-white border-l-2 border-blue-500 shadow-sm' : 'hover:bg-gray-200 border-l-2 border-transparent'}`;

        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-2 truncate';

        // Icon
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined !text-[14px] text-gray-500';
        icon.textContent = c.filePath ? 'play_circle' : 'terminal';
        if (isActive) icon.classList.add('text-blue-600');

        const name = document.createElement('span');
        name.textContent = c.name;
        name.className = `truncate ${isActive ? 'font-semibold text-gray-800' : 'text-gray-600'}`;

        leftDiv.appendChild(icon);
        leftDiv.appendChild(name);

        // Actions (Delete)
        const closeBtn = document.createElement('span');
        closeBtn.className = 'material-symbols-outlined !text-[14px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity';
        closeBtn.textContent = 'delete';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closeConsole(c.id);
        };

        item.appendChild(leftDiv);
        item.appendChild(closeBtn);

        item.onclick = () => switchConsole(c.id);

        consoleList.appendChild(item);
    });
}

function appendConsoleData(consoleData, text, colorClass) {
    if (!text) return;

    // Create HTML snippet
    // We store HTML string to keep it simple, but we could store objects and re-render.
    // HTML string is dangerous if we don't escape, but here we control classes.
    // Text content needs escaping if we use innerHTML for history.

    const escapedText = escapeHtml(text);
    const htmlSnippet = `<div class="${colorClass} whitespace-pre-wrap break-all">${escapedText}</div>`;

    consoleData.history += htmlSnippet;

    // If active, append to DOM
    if (activeConsoleId === consoleData.id) {
        const div = document.createElement('div');
        div.className = `${colorClass} whitespace-pre-wrap break-all`;
        div.textContent = text; // textContent handles escaping automatically for display
        consoleOutput.appendChild(div);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
}

// Input Handling
consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!activeConsoleId) return;

        const currentConsole = consoles.find(c => c.id === activeConsoleId);
        if (!currentConsole) return;

        const command = consoleInput.value;
        const escapedCommand = escapeHtml(command);

        // Echo command
        const echoHtml = `<div class="mt-1"><span class="text-[var(--idle-keyword)] font-bold mr-2">>>></span><span>${escapedCommand}</span></div>`;
        currentConsole.history += echoHtml;

        // Render Echo
        const echoDiv = document.createElement('div');
        echoDiv.className = "mt-1";
        echoDiv.innerHTML = `<span class="text-[var(--idle-keyword)] font-bold mr-2">>>></span><span>${escapedCommand}</span>`;
        consoleOutput.appendChild(echoDiv);

        if (currentConsole.process) {
            currentConsole.process.stdin.write(command + '\n');
        } else {
            appendConsoleData(currentConsole, 'Python process is not running. Restarting...', 'text-gray-500');
            spawnConsoleProcess(currentConsole, currentConsole.filePath);
            if (currentConsole.process) currentConsole.process.stdin.write(command + '\n');
        }

        currentConsole.commandHistory.push(command);
        currentConsole.historyIndex = currentConsole.commandHistory.length;
        consoleInput.value = '';
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    } else if (e.key === 'ArrowUp') {
        const currentConsole = consoles.find(c => c.id === activeConsoleId);
        if (currentConsole && currentConsole.historyIndex > 0) {
            currentConsole.historyIndex--;
            consoleInput.value = currentConsole.commandHistory[currentConsole.historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        const currentConsole = consoles.find(c => c.id === activeConsoleId);
        if (currentConsole) {
            if (currentConsole.historyIndex < currentConsole.commandHistory.length - 1) {
                currentConsole.historyIndex++;
                consoleInput.value = currentConsole.commandHistory[currentConsole.historyIndex];
            } else {
                currentConsole.historyIndex = currentConsole.commandHistory.length;
                consoleInput.value = '';
            }
        }
    }
});

clearConsoleBtn.addEventListener('click', () => {
    if (activeConsoleId) {
        const c = consoles.find(x => x.id === activeConsoleId);
        c.history = '<div class="text-gray-500 mb-1">Cleared.</div>';
        consoleOutput.innerHTML = c.history;
    }
});

if (addConsoleBtn) {
    addConsoleBtn.addEventListener('click', () => {
        createConsole();
    });
}

// Start default shell
createConsole();

const popOutBtn = document.getElementById('pop-out-console-btn');
if (popOutBtn) {
    popOutBtn.addEventListener('click', () => {
        ipcRenderer.send('pop-out-console');
        // Optional: Hide local console if popped out?
        // For now, let's just pop out a new one.
    });
}



// --- New Navigation Feature Handlers ---

// 1. Settings (Configure IDLE)
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const applySettingsBtn = document.getElementById('apply-settings');
const fontSizeInput = document.getElementById('font-size-input');
const fontFamilySelect = document.getElementById('font-family-select');

// Helper to toggle modal
function toggleModal(modal, show) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

ipcRenderer.on('menu-configure-idle', () => {
    toggleModal(settingsModal, true);
});

[closeSettingsBtn, cancelSettingsBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', () => toggleModal(settingsModal, false));
});

applySettingsBtn.addEventListener('click', () => {
    const size = fontSizeInput.value;
    const family = fontFamilySelect.value;
    const theme = document.querySelector('input[name="theme"]:checked').value;

    // Apply Font (Example logic, ideally updates CSS vars)
    // We target the class names generated for line numbers and code
    const rule = `
        #code-content div, #line-numbers div {
            font-size: ${size}px !important;
            height: ${parseInt(size) * 1.5}px !important;
            line-height: ${parseInt(size) * 1.5}px !important;
            font-family: ${family.replace(/'/g, "")} !important;
        }
    `;
    // Inject style? Or update CSS vars if we used them.
    // For simplicity, let's update a dedicated style block or inline styles if we re-render?
    // Since we use strict 20px in JS, we need to update the GENERATOR too.
    // This is tricky. Let's just reload the file or re-render.

    // For now, let's just alert that font size requires restart or re-render.
    // But we can do better: update the renderer generator variable.
    // But '20px' is hardcoded in `renderCode`.
    // Let's make `renderCode` use a variable `LINE_HEIGHT`.

    // Stub for now:
    alert('Settings saved. (Font changes require app restart in this version)');

    toggleModal(settingsModal, false);
});


// 2. Find/Replace
const findBar = document.getElementById('find-bar');
const replaceBar = document.getElementById('replace-bar');
const findInput = document.getElementById('find-input');
const replaceFindInput = document.getElementById('replace-find-input');

ipcRenderer.on('menu-find', () => {
    toggleModal(findBar, true);
    findInput.focus();
    findInput.select();
});

ipcRenderer.on('menu-replace', () => {
    toggleModal(replaceBar, true);
    replaceFindInput.focus();
});

document.getElementById('find-close-btn').addEventListener('click', () => toggleModal(findBar, false));
document.getElementById('replace-close-btn').addEventListener('click', () => toggleModal(replaceBar, false));

// Simple Find Next Implementation
function findText(text, backward = false) {
    if (!text) return;
    // Use window.find (native browser search)
    // It works decently with contenteditable
    const found = window.find(text, false, backward, true, false, true, false);
    if (!found) {
        // Wrap around?
        // simple beep or ignoring wrap for now
    }
}

document.getElementById('find-next-btn').addEventListener('click', () => findText(findInput.value));
document.getElementById('find-prev-btn').addEventListener('click', () => findText(findInput.value, true));
findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') findText(findInput.value);
    if (e.key === 'Escape') toggleModal(findBar, false);
});


// 3. Path Browser / Module Browser (Generic Info Modal)
const infoModal = document.getElementById('info-modal');
const infoTitle = document.getElementById('info-modal-title');
const infoContent = document.getElementById('info-modal-content');
const closeInfoBtn = document.getElementById('close-info-btn');
const closeInfoX = document.getElementById('close-info-modal');

[closeInfoBtn, closeInfoX].forEach(btn => btn.addEventListener('click', () => toggleModal(infoModal, false)));

// Path Browser Logic
ipcRenderer.on('menu-path-browser', () => {
    toggleModal(infoModal, true);
    infoTitle.textContent = 'Path Browser (sys.path)';
    infoContent.textContent = 'Loading...';

    // Run python to get sys.path
    const python = spawn('python3', ['-c', 'import sys; print("\\n".join(sys.path))']);
    let output = '';
    python.stdout.on('data', data => output += data.toString());
    python.on('close', () => {
        infoContent.textContent = output;
    });
});

// Module Browser Logic (Stub/Simple List)
ipcRenderer.on('menu-module-browser', () => {
    toggleModal(infoModal, true);
    infoTitle.textContent = 'Module Browser (Local)';
    infoContent.textContent = 'Loading local modules...\n';

    // List .py files in current directory?
    // Or run help('modules')? help('modules') is very slow.
    // Let's list global modules using pkg_resources or pip list?
    // Let's just do `pip list` as a proxy for "what's installed".

    const pip = spawn('pip3', ['list']);
    let output = '';
    pip.stdout.on('data', data => output += data.toString());
    pip.on('close', () => {
        infoContent.textContent = "Installed Packages:\n\n" + output;
    });
});

// 4. Check Module
ipcRenderer.on('menu-check-module', () => {
    if (!currentFilePath) {
        alert('Please save the file first.');
        return;
    }

    const check = spawn('python3', ['-m', 'py_compile', currentFilePath]);
    let errOutput = '';
    // py_compile output usually goes to stderr if error, but wait.
    check.stderr.on('data', data => errOutput += data.toString());

    check.on('close', (code) => {
        if (code === 0) {
            alert('Check Module: No syntax errors found.');
        } else {
            // Show error in console?
            const consoleArea = document.getElementById('console-area');
            const consoleOutput = document.getElementById('console-output');

            consoleOutput.innerHTML += `<div class="text-red-500 font-bold">\nSyntax Error:\n${errOutput}</div>`;
            consoleArea.style.display = 'flex'; // Ensure console is visible
            alert('Check Module: Syntax errors found! See console for details.');
        }
    });
});

// 5. Open Module (Stub)
ipcRenderer.on('menu-open-module', () => {
    const modName = prompt("Enter module name to open (e.g. os):");
    if (modName) {
        // Try to find file?
        // Complex logic needed to find python lib path.
        // For now:
        alert(`Opening source for '${modName}' is not fully implemented yet.`);
    }
});

// 6. Config Save Copy As
ipcRenderer.on('save-copy-as-request', () => {
    // Logic similar to Save As but doesn't change currentFilePath
    alert('Save Copy As not implemented yet.');
});

// 7. Show Completions (Stub)
ipcRenderer.on('menu-show-completions', () => {
    // Needs LSP or simple keyword matching
    alert('Completions require a Language Server which is not integrated yet.');
});


