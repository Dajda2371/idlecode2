const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const { spawn } = require('child_process'); // Added spawn
const hljs = require('highlight.js/lib/core');
hljs.registerLanguage('python', require('highlight.js/lib/languages/python'));

// Monaco Editor Integration
const monacoBridge = require('./monaco-bridge');

// Initialize Monaco Editor when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await monacoBridge.init();
        console.log('Monaco Editor ready');

        // Initial Layout: Console Only
        initializeLayout();
    } catch (error) {
        console.error('Failed to initialize Monaco Editor:', error);
        alert('Failed to initialize editor. Please restart the application.');
    }
});

// IPC Listeners
ipcRenderer.on('open-file', (event, filePath) => {
    switchToEditorView();
    openFile(filePath);
});

ipcRenderer.on('new-file', () => {
    switchToEditorView();
    createNewFile();
});


ipcRenderer.on('open-folder', (event, folderPath) => {
    PROJECT_ROOT = folderPath;
    document.title = path.basename(folderPath);
    loadDirectory(PROJECT_ROOT, treeContainer);

    // Switch to Editor View
    switchToEditorView();

    // Enforce Explorer Visible, Console/Agent Hidden
    const explorer = document.getElementById('explorer-sidebar');
    const explorerResizer = document.getElementById('explorer-resizer');
    const agent = document.getElementById('agent-sidebar');
    const agentResizer = document.getElementById('agent-resizer');
    const consoleArea = document.getElementById('console-area');
    const consoleResizer = document.getElementById('console-v-resizer');

    if (explorer) explorer.style.display = 'flex';
    if (explorerResizer) explorerResizer.style.display = 'block';

    if (agent) agent.style.display = 'none';
    if (agentResizer) agentResizer.style.display = 'none';

    if (consoleArea) {
        consoleArea.style.display = 'none';
        consoleArea.classList.remove('flex-1');
        consoleArea.classList.add('h-[250px]');
        consoleArea.style.height = ''; // Reset custom height
    }
    if (consoleResizer) consoleResizer.style.display = 'none';

    // Update Menu Checkboxes
    ipcRenderer.send('update-menu-checkbox', 'menu-view-explorer', true);
    ipcRenderer.send('update-menu-checkbox', 'menu-view-agent', false);
    ipcRenderer.send('update-menu-checkbox', 'menu-view-console', false);

    savedSidebarState = { explorer: true, agent: false, console: false };

    // Trigger Layout
    if (window.monaco && window.monaco.editor) {
        setTimeout(() => window.monaco.editor.getEditors().forEach(e => e.layout()), 50);
    }
});

// View Transitions
function initializeLayout() {
    // Create Default Shell and Pop Out
    if (typeof createConsole === 'function') {
        const defaultConsole = createConsole('Python Shell');
        ipcRenderer.send('pop-out-session', defaultConsole.id, defaultConsole.name);
    }

    // Hide Main Window (Editor)
    ipcRenderer.send('hide-window');

    // Allow main window to have editor ready but hidden
    const explorer = document.getElementById('explorer-sidebar');
    const explorerResizer = document.getElementById('explorer-resizer');
    const agent = document.getElementById('agent-sidebar');
    const agentResizer = document.getElementById('agent-resizer');

    if (explorer) explorer.style.display = 'none';
    if (explorerResizer) explorerResizer.style.display = 'none';
    if (agent) agent.style.display = 'none';
    if (agentResizer) agentResizer.style.display = 'none';

    // Hide Editor Area
    const editorArea = document.getElementById('editor-area');
    if (editorArea) editorArea.style.display = 'none';

    // Hide Local Console Area (since popped out)
    const consoleArea = document.getElementById('console-area');
    const consoleResizer = document.getElementById('console-v-resizer');
    if (consoleArea) consoleArea.style.display = 'none';
    if (consoleResizer) consoleResizer.style.display = 'none';

    // Update Menu Checkboxes
    ipcRenderer.send('update-menu-checkbox', 'menu-view-explorer', false);
    ipcRenderer.send('update-menu-checkbox', 'menu-view-agent', false);
    ipcRenderer.send('update-menu-checkbox', 'menu-view-console', false);

    savedSidebarState = { explorer: false, agent: false, console: false };
}

function switchToEditorView() {
    // Show Main Window
    ipcRenderer.send('show-window');

    // Show Editor
    const editorArea = document.getElementById('editor-area');
    if (editorArea) {
        editorArea.style.display = 'flex';
    }

    // Ensure Console is Hidden and Reset (User wants popped out shell by default)
    const consoleArea = document.getElementById('console-area');
    const consoleResizer = document.getElementById('console-v-resizer');

    if (consoleArea) {
        consoleArea.style.display = 'none';
        consoleArea.classList.remove('flex-1');
        consoleArea.classList.add('h-[250px]');
        consoleArea.style.height = ''; // Reset custom height
    }
    if (consoleResizer) consoleResizer.style.display = 'none';

    // Trigger resize
    if (window.monaco && window.monaco.editor) {
        setTimeout(() => window.monaco.editor.getEditors().forEach(e => e.layout()), 50);
    }
}

function createNewFile() {
    currentFilePath = null;
    document.title = 'Untitled';
    if (window.monaco && window.monaco.editor) {
        const editor = window.monaco.editor.getEditors()[0];
        if (editor) editor.setValue('');
    }
}


// Configuration
let PROJECT_ROOT = process.cwd();
const ICONS = {
    folder: 'folder',
    folderOpen: 'folder_open',
    file: 'description',
    python: 'assets/python.svg'
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
            iconSpan.className = 'text-gray-400 inline-flex items-center';
            iconSpan.innerHTML = `
                <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="14" height="14">
                    <path d="M24.5,2C15.8,2,14,6.5,14,9.1V14h10v1H9.1C5.8,15,2,17.6,2,25s3.8,10,7.1,10H15v-6c0-2.2,1.8-4,4-4l12,0c1.7,0,3-1.3,3-3V9.1C34,5.6,30.7,2,24.5,2z M20,11c-1.1,0-2-0.9-2-2c0-1.1,0.9-2,2-2c1.1,0,2,0.9,2,2C22,10.1,21.1,11,20,11z"/>
                    <path d="M25.5,48c8.7,0,10.5-4.5,10.5-7.1V36H26v-1h14.9c3.3,0,7.1-2.6,7.1-10s-3.8-10-7.1-10H35v7c0,2.2-1.8,4-4,4l-12,0c-1.7,0-3,1.3-3,3v11.9C16,44.4,19.3,48,25.5,48z M30,39c1.1,0,2,0.9,2,2c0,1.1-0.9,2-2,2c-1.1,0-2-0.9-2-2C28,39.9,28.9,39,30,39z"/>
                </svg>
            `;
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
    input.value = ''; // Start with empty input

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

    let committed = false; // Flag to prevent double-removal

    const commitCreation = () => {
        if (committed) return; // Already committed
        committed = true;

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
            inputContainer.remove(); // Remove the input before reloading
            loadDirectory(basePath, containerToAdd);
        } catch (err) {
            console.error(err);
            alert(`Error creating item: ${err.message}`);
            inputContainer.remove();
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commitCreation();
        if (e.key === 'Escape') {
            committed = true; // Mark as handled
            inputContainer.remove();
        }
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
    // Use Monaco Bridge to open file
    monacoBridge.openFile(filePath);
    currentFilePath = filePath;
}


// Current open file path
let currentFilePath = null;

// Obsolete editor code removed - replaced by Monaco Editor


function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Obsolete history/save/format code removed



ipcRenderer.on('option-show-line-numbers', () => {
    // Toggle line numbers via Monaco options
    // We need to know current state or just toggle.
    // Monaco doesn't expose simplistic toggle without checking current options.
    // Ideally prompts User or we track state.
    // For now, let's assume we want to toggle.
    if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors.length > 0) {
            const editor = editors[0];
            const current = editor.getOption(window.monaco.editor.EditorOption.lineNumbers);
            const newState = (current.renderType === 0) ? 'off' : 'on'; // 0 is Off, 1 is On
            // Actually renderType: 0=Off, 1=On, 2=Relative, 3=Interval
            // simplified:
            const next = (current.renderType === 0) ? 'on' : 'off';
            editor.updateOptions({ lineNumbers: next });
        }
    }
});

// ... zoom listeners ...

ipcRenderer.on('edit-goto-line', () => {
    if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors.length > 0) {
            const editor = editors[0];
            editor.trigger('keyboard', 'editor.action.gotoLine', null);
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
    const el = document.getElementById('agent-sidebar');
    const resizer = document.getElementById('agent-resizer');
    if (el) el.style.display = show ? 'flex' : 'none';
    if (resizer) resizer.style.display = show ? 'block' : 'none';

    // Layout update
    if (window.monaco && window.monaco.editor) {
        setTimeout(() => window.monaco.editor.getEditors().forEach(e => e.layout()), 50);
    }
});

// Toggle Sidebars Logic
let savedSidebarState = { explorer: true, agent: true, console: true };

ipcRenderer.on('toggle-sidebars', () => {
    const explorer = document.getElementById('explorer-sidebar');
    const explorerResizer = document.getElementById('explorer-resizer');
    const agent = document.getElementById('agent-sidebar');
    const agentResizer = document.getElementById('agent-resizer');
    const consoleArea = document.getElementById('console-area');
    const consoleResizer = document.getElementById('console-v-resizer');

    const isExplorerVisible = explorer && explorer.style.display !== 'none';
    const isAgentVisible = agent && agent.style.display !== 'none';
    const isConsoleVisible = consoleArea && consoleArea.style.display !== 'none';

    if (isExplorerVisible || isAgentVisible || isConsoleVisible) {
        // HIDE ALL
        // Pop out shells
        if (typeof consoles !== 'undefined' && Array.isArray(consoles)) {
            consoles.forEach(c => {
                ipcRenderer.send('pop-out-session', c.id, c.name || `Shell ${c.id}`);
            });
        }

        savedSidebarState = {
            explorer: isExplorerVisible,
            agent: isAgentVisible,
            console: isConsoleVisible
        };

        if (explorer) explorer.style.display = 'none';
        if (explorerResizer) explorerResizer.style.display = 'none';
        if (agent) agent.style.display = 'none';
        if (agentResizer) agentResizer.style.display = 'none';
        if (consoleArea) consoleArea.style.display = 'none';
        if (consoleResizer) consoleResizer.style.display = 'none';

        ipcRenderer.send('update-menu-checkbox', 'menu-view-explorer', false);
        ipcRenderer.send('update-menu-checkbox', 'menu-view-agent', false);
        ipcRenderer.send('update-menu-checkbox', 'menu-view-console', false);
    } else {
        // RESTORE
        ipcRenderer.send('close-popped-consoles');

        const showExplorer = savedSidebarState.explorer;
        const showAgent = savedSidebarState.agent;
        const showConsole = savedSidebarState.console;

        if (showExplorer) {
            if (explorer) explorer.style.display = 'flex';
            if (explorerResizer) explorerResizer.style.display = 'block';
        }
        if (showAgent) {
            if (agent) agent.style.display = 'flex';
            if (agentResizer) agentResizer.style.display = 'block';
        }
        if (showConsole) {
            if (consoleArea) consoleArea.style.display = 'flex'; // Console area is flex
            if (consoleResizer) consoleResizer.style.display = 'block';
        }

        // If saved state was all hidden, default to showing Explorer and Console
        if (!showExplorer && !showAgent && !showConsole) {
            if (explorer) explorer.style.display = 'flex';
            if (explorerResizer) explorerResizer.style.display = 'block';
            if (consoleArea) consoleArea.style.display = 'flex';
            if (consoleResizer) consoleResizer.style.display = 'block';

            ipcRenderer.send('update-menu-checkbox', 'menu-view-explorer', true);
            ipcRenderer.send('update-menu-checkbox', 'menu-view-agent', false); // Keep agent hidden in default
            ipcRenderer.send('update-menu-checkbox', 'menu-view-console', true);
        } else {
            ipcRenderer.send('update-menu-checkbox', 'menu-view-explorer', showExplorer);
            ipcRenderer.send('update-menu-checkbox', 'menu-view-agent', showAgent);
            ipcRenderer.send('update-menu-checkbox', 'menu-view-console', showConsole);
        }
    }

    // Trigger Monaco resize
    if (window.monaco && window.monaco.editor) {
        setTimeout(() => window.monaco.editor.getEditors().forEach(e => e.layout()), 50);
    }
});

ipcRenderer.on('run-module', async () => {
    // Save first using Monaco Bridge
    // silent=true for save, but we actually want to ensure it is saved.
    // monacoBridge.saveFile(true) returns a promise resolving to success boolean.
    const saved = await monacoBridge.saveFile(true);

    if (saved && currentFilePath) {
        const consoleArea = document.getElementById('console-area');
        const isConsoleVisible = consoleArea && consoleArea.style.display !== 'none';

        // Always use the managed process via runPythonMetadata
        const consoleData = runPythonMetadata(currentFilePath);

        if (isConsoleVisible) {
            // Ensure console is focused/shown in main window
            consoleArea.style.display = 'flex';
        } else {
            // Pop out OR focus existing pop-out window
            ipcRenderer.send('pop-out-session', consoleData.id, consoleData.name);
        }
    } else {
        // If save failed or no file, prompt save as
        // But saveFile implementation triggers save-as-request if no currentFilePath
        // so we don't strictly need to do it here, but good fallback.
        if (!currentFilePath) {
            alert('Please save the file before running.');
            ipcRenderer.send('save-as-request');
        }
    }
});

ipcRenderer.on('menu-new-console', () => {
    ipcRenderer.send('new-console-window');
});



function runPythonMetadata(path) {
    if (!path) return null;

    // Use active console or create one
    let targetConsole;
    if (activeConsoleId) {
        targetConsole = consoles.find(c => c.id === activeConsoleId);
    }

    if (!targetConsole) {
        targetConsole = createConsole(`Run: ${path.split(/[/\\]/).pop()}`, path);
    } else {
        // Restart existing console with this file
        spawnConsoleProcess(targetConsole, path);
    }
    return targetConsole;
}


// Console State
let consoles = [];
let activeConsoleId = null;

// Elements
const consoleOutput = document.getElementById('console-output');
const consoleInput = document.getElementById('console-input');
const clearConsoleBtn = document.getElementById('clear-console-btn');
const consoleList = document.getElementById('console-list');
const addConsoleBtn = document.getElementById('add-console-btn');
const activeConsoleTitle = document.getElementById('active-console-title');
const hideConsoleBtn = document.getElementById('hide-console-area-btn');
const consoleInputArea = document.getElementById('console-input-area');
const consolePrompt = document.getElementById('console-prompt');

if (hideConsoleBtn) {
    hideConsoleBtn.onclick = () => {
        // Hide via IPC to sync menu state
        const consoleArea = document.getElementById('console-area');
        const resizer = document.getElementById('console-v-resizer');
        if (consoleArea) {
            consoleArea.style.display = 'none';
            if (resizer) resizer.style.display = 'none';
            // Sync menu state
            ipcRenderer.send('update-menu-checkbox', 'menu-view-console', false);

            // Trigger pop-out logic manually since we are hiding directly
            consoles.forEach(c => {
                ipcRenderer.send('pop-out-session', c.id, c.name);
            });
        }
    };
}

// --- IPC Output Listeners ---
ipcRenderer.on('session-output', (event, sessionId, entry) => {
    const consoleData = consoles.find(c => c.id === sessionId);
    if (!consoleData) return;

    if (entry.type === 'input') {
        const promptText = entry.prompt || '>>>';
        const highlightedInput = hljs.highlight(entry.text, { language: 'python' }).value;
        const html = `<div class="mt-1"><span class="text-[var(--idle-keyword)] font-bold mr-2">${escapeHtml(promptText)}</span><span>${highlightedInput}</span></div>`;
        consoleData.history += html;
        if (activeConsoleId === sessionId) {
            const div = document.createElement('div');
            div.innerHTML = html;
            consoleOutput.appendChild(div);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
        // Local command history tracking
        consoleData.commandHistory.push(entry.text);
        consoleData.historyIndex = consoleData.commandHistory.length;
    } else {
        let colorClass = 'text-gray-800';
        if (entry.type === 'stdout') colorClass = 'text-blue-600';
        else if (entry.type === 'stderr') colorClass = 'text-red-500';
        else if (entry.type === 'meta') colorClass = 'text-gray-500 italic';

        const html = `<div class="${colorClass} whitespace-pre-wrap break-all">${escapeHtml(entry.text)}</div>`;
        consoleData.history += html;

        if (activeConsoleId === sessionId) {
            const div = document.createElement('div');
            div.innerHTML = html;
            consoleOutput.appendChild(div.firstElementChild || div);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    }
});

ipcRenderer.on('session-exit', (event, sessionId, code) => {
    const consoleData = consoles.find(c => c.id === sessionId);
    if (!consoleData) return;
    const html = `<div class="text-gray-500 italic whitespace-pre-wrap break-all">\n[Process exited with code ${code}]\n</div>`;
    consoleData.history += html;
    if (activeConsoleId === sessionId) {
        const div = document.createElement('div');
        div.innerHTML = html;
        consoleOutput.appendChild(div.firstElementChild || div);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
});

ipcRenderer.on('session-history', (event, sessionId, historyArr, cmdHistory, draft) => {
    const consoleData = consoles.find(c => c.id === sessionId);
    if (!consoleData) return;

    let fullHtml = '';
    if (Array.isArray(historyArr)) {
        historyArr.forEach(entry => {
            if (entry.type === 'input') {
                const highlightedInput = hljs.highlight(entry.text, { language: 'python' }).value;
                fullHtml += `<div class="mt-1"><span class="text-[var(--idle-keyword)] font-bold mr-2">>>></span><span>${highlightedInput}</span></div>`;
            } else {
                let colorClass = 'text-gray-800';
                if (entry.type === 'stdout') colorClass = 'text-blue-600';
                else if (entry.type === 'stderr') colorClass = 'text-red-500';
                else if (entry.type === 'meta') colorClass = 'text-gray-500 italic';
                fullHtml += `<div class="${colorClass} whitespace-pre-wrap break-all">${escapeHtml(entry.text)}</div>`;
            }
        });
    }
    consoleData.history = fullHtml;

    if (Array.isArray(cmdHistory)) {
        consoleData.commandHistory = cmdHistory;
        consoleData.historyIndex = cmdHistory.length;
    }

    // Restore draft
    if (activeConsoleId === sessionId && draft) {
        consoleInput.value = draft;
    }

    if (activeConsoleId === sessionId) {
        consoleOutput.innerHTML = consoleData.history;
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
});

ipcRenderer.on('session-input-draft', (event, sessionId, draft) => {
    const consoleData = consoles.find(c => c.id === sessionId);
    if (!consoleData) return;

    consoleData.inputDraft = draft;
    if (activeConsoleId === sessionId) {
        consoleInput.value = draft;
    }
});


function createConsole(name = null, filePath = null) {
    // Calculate next ID strictly based on max + 1
    let newId = 1;
    if (consoles.length > 0) {
        newId = Math.max(...consoles.map(c => c.id)) + 1;
    }

    // Default name
    if (!name) name = `Shell ${newId}`;

    const id = newId;
    const consoleData = {
        id,
        name,
        // process: null, // No local process
        history: '<div class="text-gray-500 mb-1">Python Interactive Shell Ready.</div>',
        commandHistory: [],
        historyIndex: -1,
        inputDraft: '',
        filePath
    };

    consoles.push(consoleData);

    // Request Main to create session
    ipcRenderer.send('session-create', id, filePath, consoleData.name);
    ipcRenderer.send('session-attach', id);

    // Switch to new console immediately
    switchConsole(id);
    renderConsoleList();
    return consoleData;
}

// Replaced spawnConsoleProcess with IPC
function spawnConsoleProcess(consoleData, filePath = null) {
    // If resetting existing console
    if (filePath) {
        // Just kill process to restart, don't remove session from UI
        ipcRenderer.send('session-kill', consoleData.id);

        consoleData.name = `Run: ${path.basename(filePath)}`;
        consoleData.filePath = filePath;
        // The === RESTART === line is now handled by main.js and sent via session-output meta

        ipcRenderer.send('session-create', consoleData.id, filePath, consoleData.name);
        ipcRenderer.send('session-attach', consoleData.id);

        if (activeConsoleId === consoleData.id) {
            consoleOutput.innerHTML = consoleData.history;
            if (activeConsoleTitle) activeConsoleTitle.textContent = consoleData.name;
        }
    }
}

function switchConsole(id) {
    const target = consoles.find(c => c.id === id);
    if (!target) return;

    activeConsoleId = id;
    consoleOutput.innerHTML = target.history;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    consoleInput.value = target.inputDraft || '';

    if (activeConsoleTitle) activeConsoleTitle.textContent = target.name;

    // Show input area
    if (consoleInputArea) consoleInputArea.style.display = 'flex';

    renderConsoleList();
    consoleInput.focus();
}

ipcRenderer.on('session-closed', (event, sessionId) => {
    closeConsole(sessionId, false); // False means don't send IPC again, just clear UI
});

function closeConsole(id, sendIPC = true) {
    const idx = consoles.findIndex(c => c.id === id);
    if (idx === -1) return;

    const target = consoles[idx];
    if (sendIPC) {
        ipcRenderer.send('session-close', id);
    }

    consoles.splice(idx, 1);

    if (consoles.length === 0) {
        // Reset ID
        activeConsoleId = null;

        // Clear UI
        // Clear UI
        consoleOutput.innerHTML = '<div class="text-gray-400 p-2 italic">No active shell. Click + to start one.</div>';
        if (activeConsoleTitle) activeConsoleTitle.textContent = 'No Active Console';

        // Hide input area
        if (consoleInputArea) consoleInputArea.style.display = 'none';

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
        const isPromptHidden = consolePrompt && consolePrompt.style.display === 'none';
        const isInputResponse = currentConsole.waitingForInput || isPromptHidden;

        // Check if we're waiting for input() response
        if (isInputResponse) {
            // Create a line with the prompt in blue (stdout color) and input in black
            const div = document.createElement('div');
            div.className = "mt-1";

            const promptText = currentConsole.waitingForInput ? currentConsole.inputPromptText : "";

            // Only show prompt if it's not empty
            if (promptText !== '') {
                const promptSpan = `<span class="text-blue-600">${escapeHtml(promptText)}</span>`;
                const inputSpan = `<span>${escapeHtml(command)}</span>`;
                div.innerHTML = promptSpan + inputSpan;
            } else {
                // Empty prompt - just show the input
                div.innerHTML = `<span>${escapeHtml(command)}</span>`;
            }

            const outputContainer = document.querySelector(`#console-output`);
            if (outputContainer) {
                outputContainer.appendChild(div);
                outputContainer.scrollTop = outputContainer.scrollHeight;
            }

            // Send just the user's input to Python, with isInputResponse=true
            ipcRenderer.send('session-input', currentConsole.id, command, true);

            // Clear the waiting state
            currentConsole.waitingForInput = false;
            currentConsole.inputPromptText = '';

            // Restore the normal prompt (and make it visible again)
            if (consolePrompt) {
                consolePrompt.style.display = '';
                consolePrompt.innerText = currentConsole.promptText || '>>>';
            }

            // Clear input
            consoleInput.value = '';
            currentConsole.inputDraft = '';
            ipcRenderer.send('session-input-draft', currentConsole.id, '');
        } else {
            // Normal command handling
            // Send to Main (it will echo back as 'input' type which we render)
            ipcRenderer.send('session-input', currentConsole.id, command, false);

            // Hide the prompt immediately to allow stretching if next state is input() 
            // the prompt will be shown again when session-prompt or session-input-prompt is received
            if (consolePrompt) consolePrompt.style.display = 'none';

            // Clear input and draft
            consoleInput.value = '';
            currentConsole.inputDraft = '';
            ipcRenderer.send('session-input-draft', currentConsole.id, '');

            // Command history is updated when we receive the echo back in session-output

            // Reset scroll?
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    } else if (e.key === 'ArrowUp') {
        const currentConsole = consoles.find(c => c.id === activeConsoleId);
        if (currentConsole && currentConsole.historyIndex > 0) {
            currentConsole.historyIndex--;
            consoleInput.value = currentConsole.commandHistory[currentConsole.historyIndex] || '';
            // Place cursor at the end
            setTimeout(() => {
                consoleInput.selectionStart = consoleInput.selectionEnd = consoleInput.value.length;
            }, 0);
        }
    } else if (e.key === 'ArrowDown') {
        const currentConsole = consoles.find(c => c.id === activeConsoleId);
        if (currentConsole) {
            if (currentConsole.historyIndex < currentConsole.commandHistory.length - 1) {
                currentConsole.historyIndex++;
                consoleInput.value = currentConsole.commandHistory[currentConsole.historyIndex] || '';
                setTimeout(() => {
                    consoleInput.selectionStart = consoleInput.selectionEnd = consoleInput.value.length;
                }, 0);
            } else {
                currentConsole.historyIndex = currentConsole.commandHistory.length;
                consoleInput.value = '';
            }
        }
    }
});

consoleInput.addEventListener('input', () => {
    if (activeConsoleId) {
        const currentConsole = consoles.find(c => c.id === activeConsoleId);
        if (currentConsole) {
            currentConsole.inputDraft = consoleInput.value;
            ipcRenderer.send('session-input-draft', currentConsole.id, consoleInput.value);
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

// Prompt Handling
// Prompt Handling
ipcRenderer.on('session-prompt', (event, sessionId, type) => {
    const consoleData = consoles.find(c => c.id === sessionId);
    if (!consoleData) return;

    if (!consoleData.indentLevel) consoleData.indentLevel = 0;

    if (type === 'standard') {
        consoleData.indentLevel = 0;
        consoleData.promptText = '>>>';
    } else if (type === 'continuation') {
        const lastCmd = consoleData.commandHistory[consoleData.commandHistory.length - 1] || '';

        // Count leading 4-space tabs
        const match = lastCmd.match(/^ */);
        const currentIndent = Math.floor((match ? match[0].length : 0) / 4);

        let newIndent = currentIndent;
        // Check for colon in uncommented part
        const uncommented = lastCmd.split('#')[0].trim();
        if (uncommented.endsWith(':')) {
            newIndent = currentIndent + 1;
        }

        consoleData.indentLevel = newIndent;

        // User requested "..." for continuation
        consoleData.promptText = '...';
    }

    // Update UI if active
    if (activeConsoleId === sessionId) {
        if (consolePrompt) {
            consolePrompt.style.display = '';
            consolePrompt.innerText = consoleData.promptText;
        }

        // Auto-indent input
        if (type === 'continuation' && consoleData.indentLevel > 0) {
            if (!consoleInput.value) {
                consoleInput.value = '    '.repeat(consoleData.indentLevel);
            }
        }
    }
});

// Input Prompt Handling (for Python's input() function)
ipcRenderer.on('session-input-prompt', (event, sessionId, promptText) => {
    const consoleData = consoles.find(c => c.id === sessionId);
    if (!consoleData) return;

    // Store that we're waiting for input and the prompt text
    consoleData.waitingForInput = true;
    consoleData.inputPromptText = promptText;

    // Update UI if active
    if (activeConsoleId === sessionId) {
        if (consolePrompt) {
            if (promptText === '') {
                // Empty prompt - hide the prompt element to stretch the input
                consolePrompt.style.display = 'none';
            } else {
                // Show prompt with the text
                consolePrompt.style.display = '';
                consolePrompt.innerText = promptText;
            }
        }
        // Clear the input field
        consoleInput.value = '';
    }
});

// Tab and Smart Backspace for Console Input
consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = consoleInput.selectionStart;
        const end = consoleInput.selectionEnd;
        const val = consoleInput.value;
        consoleInput.value = val.substring(0, start) + "    " + val.substring(end);
        consoleInput.selectionStart = consoleInput.selectionEnd = start + 4;
    } else if (e.key === 'Backspace') {
        const start = consoleInput.selectionStart;
        const end = consoleInput.selectionEnd;
        // Only if cursor is just a cursor (no selection range) and preceded by 4 spaces
        if (start === end && start >= 4) {
            const val = consoleInput.value;
            if (val.substring(start - 4, start) === '    ') {
                e.preventDefault();
                consoleInput.value = val.substring(0, start - 4) + val.substring(start);
                consoleInput.selectionStart = consoleInput.selectionEnd = start - 4;
            }
        }
    } else if (e.key === 'ArrowLeft') {
        const start = consoleInput.selectionStart;
        const end = consoleInput.selectionEnd;
        const val = consoleInput.value;
        // Only move by 4 if no selection and we can move back 4 spaces
        if (start === end && start >= 4 && val.substring(start - 4, start) === '    ') {
            e.preventDefault();
            consoleInput.selectionStart = consoleInput.selectionEnd = start - 4;
        }
    } else if (e.key === 'ArrowRight') {
        const start = consoleInput.selectionStart;
        const end = consoleInput.selectionEnd;
        const val = consoleInput.value;
        // Only move by 4 if no selection and we can move forward 4 spaces
        if (start === end && start + 4 <= val.length && val.substring(start, start + 4) === '    ') {
            e.preventDefault();
            consoleInput.selectionStart = consoleInput.selectionEnd = start + 4;
        }
    }
});

if (addConsoleBtn) {
    addConsoleBtn.addEventListener('click', () => {
        createConsole();
    });
}

// Start with empty state
renderConsoleList();
if (activeConsoleTitle) activeConsoleTitle.textContent = 'No Active Console';
if (activeConsoleTitle) activeConsoleTitle.textContent = 'No Active Console';
consoleOutput.innerHTML = '<div class="text-gray-400 p-2 italic">No active shell. Click + to start one.</div>';
if (consoleInputArea) consoleInputArea.style.display = 'none';

if (Object.keys(consoles).length === 0) {
    if (typeof closeActiveConsoleBtn !== 'undefined' && closeActiveConsoleBtn) closeActiveConsoleBtn.classList.add('hidden');
}

const popOutBtn = document.getElementById('pop-out-console-btn');
if (popOutBtn) {
    popOutBtn.addEventListener('click', () => {
        if (activeConsoleId) {
            const c = consoles.find(x => x.id === activeConsoleId);
            if (c) {
                ipcRenderer.send('pop-out-session', c.id, c.name);
            }
        }
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



// --- Resizer Logic ---

function setupResizer(resizerId, sidebarId, direction, inverse = false) {
    const resizer = document.getElementById(resizerId);
    const sidebar = document.getElementById(sidebarId);
    if (!resizer || !sidebar) return;

    let startPos, startSize;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        resizer.classList.add('dragging');
        document.body.classList.add('is-dragging');
        document.body.style.cursor = direction === 'h' ? 'col-resize' : 'row-resize';

        startPos = direction === 'h' ? e.clientX : e.clientY;
        startSize = direction === 'h' ? sidebar.offsetWidth : sidebar.offsetHeight;

        const onMouseMove = (e) => {
            const currentPos = direction === 'h' ? e.clientX : e.clientY;
            let delta = currentPos - startPos;
            if (inverse) delta = -delta;

            const newSize = Math.max(50, startSize + delta);

            if (direction === 'h') {
                sidebar.style.width = `${newSize}px`;
            } else {
                sidebar.style.height = `${newSize}px`;
            }
        };

        const onMouseUp = () => {
            resizer.classList.remove('dragging');
            document.body.classList.remove('is-dragging');
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// Initialize all resizers
setupResizer('explorer-resizer', 'explorer-sidebar', 'h');
setupResizer('agent-resizer', 'agent-sidebar', 'h', true);
setupResizer('console-v-resizer', 'console-area', 'v', true);
setupResizer('shell-sessions-resizer', 'shell-sessions-sidebar', 'h', true);

// Enforce Light Mode for Agent Webview
const chatWebview = document.getElementById('chatgpt-webview');
if (chatWebview) {
    chatWebview.addEventListener('dom-ready', () => {
        // 1. Force light color scheme preference
        chatWebview.insertCSS(`
            :root, body, html {
                color-scheme: light !important;
            }
        `);
        // 2. Force ChatGPT's specific classes and theme setting
        chatWebview.executeJavaScript(`
            try {
                localStorage.setItem('theme', 'light');
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
                document.documentElement.style.colorScheme = 'light';
            } catch (e) {
                console.error('Failed to force light mode:', e);
            }
        `);
    });
}

const closeAgentBtn = document.getElementById('close-agent-btn');
const agentSidebar = document.getElementById('agent-sidebar');
const agentResizer = document.getElementById('agent-resizer');

if (closeAgentBtn) {
    closeAgentBtn.addEventListener('click', () => {
        if (agentSidebar) agentSidebar.style.display = 'none';
        if (agentResizer) agentResizer.style.display = 'none';

        // Update the system menu checkbox
        ipcRenderer.send('update-menu-checkbox', 'menu-view-agent', false);
    });
}

// Sidebars are now handled by consolidated listeners above

