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

    // Helper to get selection character offsets
    function getSelectionOffsets(element) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return { start: 0, end: 0 };
        const range = selection.getRangeAt(0);

        const preStartRange = range.cloneRange();
        preStartRange.selectNodeContents(element);
        preStartRange.setEnd(range.startContainer, range.startOffset);
        const start = preStartRange.toString().length;

        const preEndRange = range.cloneRange();
        preEndRange.selectNodeContents(element);
        preEndRange.setEnd(range.endContainer, range.endOffset);
        const end = preEndRange.toString().length;

        return { start, end };
    }

    // Helper to set selection character offsets
    function setSelectionOffsets(element, start, end) {
        let charCount = 0;
        const range = document.createRange();
        range.setStart(element, 0);
        range.collapse(true);
        const nodeStack = [element];
        let node;
        let startSet = false;
        let endSet = false;

        // If target offsets are 0, we can start at the very beginning
        if (start === 0) {
            range.setStart(element, 0);
            startSet = true;
        }
        if (end === 0) {
            range.setEnd(element, 0);
            endSet = true;
        }

        while ((node = nodeStack.pop())) {
            if (node.nodeType === 3) {
                const nextCharCount = charCount + node.length;
                if (!startSet && start >= charCount && start <= nextCharCount) {
                    range.setStart(node, start - charCount);
                    startSet = true;
                }
                if (!endSet && end >= charCount && end <= nextCharCount) {
                    range.setEnd(node, end - charCount);
                    endSet = true;
                }
                if (startSet && endSet) break;
                charCount = nextCharCount;
            } else if (node.nodeType === 1) {
                // If it's an empty element (like <br>), we might still need to set position
                if (node.childNodes.length === 0 && charCount === start && !startSet) {
                    // This handles empty divs/brs
                }

                let i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        // Final fallback to end of container if not set
        if (!startSet) range.setStart(element, element.childNodes.length);
        if (!endSet) range.setEnd(element, element.childNodes.length);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Backwards compatibility for existing code
    function getCaretCharacterOffsetWithin(element) {
        return getSelectionOffsets(element).end;
    }
    function setCaretCharacterOffsetWithin(element, offset) {
        setSelectionOffsets(element, offset, offset);
    }

    // Real-time highlighting and line number sync
    codeContent.oninput = () => {
        const { start, end } = getSelectionOffsets(codeContent);
        const scrollTop = codeContent.scrollTop;
        const text = codeContent.innerText;
        const currentLines = text.split('\n');

        // Re-highlight everything
        renderLines(currentLines);

        codeContent.scrollTop = scrollTop;
        setSelectionOffsets(codeContent, start, end);

        // Ensure scroll sync is maintained
        lineNumbers.scrollTop = codeContent.scrollTop;

        // Autosave
        debouncedSave();
    };

    function renderLines(lines) {
        let newHtml = '';
        lineNumbers.innerHTML = '';

        lines.forEach((line, index) => {
            // Using empty string if line is empty, height is already enforced via style
            const highlightedLine = hljs.highlight(line || '', { language: 'python' }).value;
            newHtml += `<div style="height: 20px; line-height: 20px; white-space: pre; overflow: hidden;">${highlightedLine || '<br>'}</div>`;

            const numDiv = document.createElement('div');
            numDiv.textContent = index + 1;
            numDiv.style.height = '20px';
            numDiv.style.lineHeight = '20px';
            numDiv.className = 'h-[20px] leading-[20px]';
            lineNumbers.appendChild(numDiv);
        });

        codeContent.innerHTML = newHtml;
    }

    // Line and Column tracker
    const updateCaretPosition = () => {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);

        // Find the line div (direct child of codeContent)
        let container = range.startContainer;
        if (container === codeContent) {
            // Caret might be between divs
            container = codeContent.childNodes[range.startOffset] || codeContent.lastChild;
        }

        while (container && container.parentNode !== codeContent && container !== codeContent) {
            container = container.parentNode;
        }

        if (!container || container === codeContent) {
            // Fallback for edge cases
            const { start } = getSelectionOffsets(codeContent);
            const lines = codeContent.innerText.substring(0, start).split('\n');
            document.getElementById('footer-ln').textContent = `Ln: ${lines.length}`;
            document.getElementById('footer-col').textContent = `Col: ${lines[lines.length - 1].length}`;
            return;
        }

        const ln = Array.from(codeContent.children).indexOf(container) + 1;

        // Column logic: offset within this specific div
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(container);
        preCaretRange.setEnd(range.startContainer, range.startOffset);

        // Use textContent or toString() but be careful with <br>
        const col = preCaretRange.toString().length;

        const lnDiv = document.getElementById('footer-ln');
        const colDiv = document.getElementById('footer-col');
        if (lnDiv) lnDiv.textContent = `Ln: ${ln > 0 ? ln : 1}`;
        if (colDiv) colDiv.textContent = `Col: ${col}`;
    };

    document.addEventListener('selectionchange', () => {
        if (document.activeElement === codeContent || document.activeElement === consoleInput) {
            updateCaretPosition();
        }
    });

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

function saveFile(silent = false) {
    if (currentFilePath) {
        const content = document.getElementById('code-content').innerText;
        fs.writeFile(currentFilePath, content, (err) => {
            if (err) {
                if (!silent) alert(`Error saving file: ${err.message}`);
                console.error(err);
                return;
            }
            if (!silent) {
                // Optional: flash feedback
                const title = document.title;
                document.title = title.replace(' *', '') + ' (Saved)';
                setTimeout(() => document.title = title.replace(' *', ''), 2000);
            }
        });
    } else if (!silent) {
        // Trigger Save As (handled in main usually, but we can trigger it here too or send back)
        ipcRenderer.send('save-as-request');
    }
}

ipcRenderer.on('save-file', () => {
    saveFile(false);
});

let autosaveTimeout = null;
function debouncedSave() {
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(() => {
        saveFile(true);
    }, 1000); // 1 second debounce
}


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
    const { start, end } = getSelectionOffsets(codeContent);
    const text = codeContent.innerText;
    const lines = text.split('\n');

    let currentPos = 0;
    const newLines = lines.map(line => {
        const lineStart = currentPos;
        const lineEnd = currentPos + line.length;
        currentPos = lineEnd + 1; // +1 for \n

        // If line intersects selection
        if ((lineStart >= start && lineStart < end) || (lineEnd > start && lineEnd <= end) || (start >= lineStart && end <= lineEnd)) {
            return '##' + line;
        }
        return line;
    });

    renderLines(newLines);
    setSelectionOffsets(codeContent, start + 2, end + (newLines.length * 2)); // Approximate restoration
    debouncedSave();
});

ipcRenderer.on('format-uncomment', () => {
    const { start, end } = getSelectionOffsets(codeContent);
    const text = codeContent.innerText;
    const lines = text.split('\n');

    let currentPos = 0;
    const newLines = lines.map(line => {
        const lineStart = currentPos;
        const lineEnd = currentPos + line.length;
        currentPos = lineEnd + 1;

        if ((lineStart >= start && lineStart < end) || (lineEnd > start && lineEnd <= end) || (start >= lineStart && end <= lineEnd)) {
            if (line.startsWith('##')) return line.substring(2);
            if (line.startsWith('# ')) return line.substring(2);
            if (line.startsWith('#')) return line.substring(1);
        }
        return line;
    });

    renderLines(newLines);
    setSelectionOffsets(codeContent, Math.max(0, start - 2), Math.max(0, end - 2));
    debouncedSave();
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
    const el = document.getElementById('explorer-sidebar');
    const resizer = document.getElementById('explorer-resizer');
    if (el) el.style.display = show ? 'flex' : 'none';
    if (resizer) resizer.style.display = show ? 'block' : 'none';
});

ipcRenderer.on('toggle-console', (event, show) => {
    const el = document.getElementById('console-area');
    const resizer = document.getElementById('console-v-resizer');
    if (el) {
        if (show) {
            el.style.display = 'flex';
            if (resizer) resizer.style.display = 'block';
            // Pop Back In: Close any popped out windows associated with our sessions
            // Ideally main process handles closing the windows.
            // But we need to restore sessions?
            // User requested: "pop back in".
            // If we just close the windows, we lose the session if it was remote.
            // BUT, our "pop out" implementation below will just be spawning new windows.
            // We can't really "move" the session back.
            // However, if we interpret "pop out" as just hiding local and showing remote,
            // and "pop in" as hiding remote and showing local...
            // We can perhaps just close the remote windows.
            ipcRenderer.send('close-popped-consoles');
        } else {
            el.style.display = 'none';
            if (resizer) resizer.style.display = 'none';
            // Pop Out: Open windows for active shells
            consoles.forEach(c => {
                // Pop Out existing session
                ipcRenderer.send('pop-out-session', c.id, c.name);
            });
        }
    }
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
    const el = document.getElementById('agent-sidebar');
    const resizer = document.getElementById('agent-resizer');
    if (el) el.style.display = show ? 'flex' : 'none';
    if (resizer) resizer.style.display = show ? 'block' : 'none';
});

ipcRenderer.on('run-module', () => {
    // Save first
    if (currentFilePath) {
        const content = document.getElementById('code-content').innerText;
        fs.writeFileSync(currentFilePath, content);

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
        alert('Please save the file before running.');
        ipcRenderer.send('save-as-request');
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
        consoleInput.innerHTML = hljs.highlight(draft, { language: 'python' }).value;
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
        consoleInput.innerHTML = draft ? hljs.highlight(draft, { language: 'python' }).value : '';
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

    // Set text and highlight
    const draft = target.inputDraft || '';
    if (draft) {
        consoleInput.innerHTML = hljs.highlight(draft, { language: 'python' }).value;
    } else {
        consoleInput.innerHTML = '';
    }

    if (activeConsoleTitle) activeConsoleTitle.textContent = target.name;

    // Show input area
    if (consoleInputArea) consoleInputArea.style.display = 'flex';

    renderConsoleList();
    consoleInput.focus();

    // Place cursor at end
    const lastPos = (target.inputDraft || '').length;
    setSelectionOffsets(consoleInput, lastPos, lastPos);
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
    const { start, end } = getSelectionOffsets(consoleInput);
    const val = consoleInput.innerText;
    const currentConsole = consoles.find(c => c.id === activeConsoleId);

    if (e.key === 'Enter') {
        e.preventDefault();
        if (!activeConsoleId || !currentConsole) return;

        // Use textContent for the actual command string to avoid trailing newlines from innerText
        const command = consoleInput.textContent || '';
        const isPromptHidden = consolePrompt && consolePrompt.style.display === 'none';
        const isInputResponse = currentConsole.waitingForInput || isPromptHidden;

        if (isInputResponse) {
            const div = document.createElement('div');
            div.className = "mt-1";
            const promptText = currentConsole.waitingForInput ? currentConsole.inputPromptText : "";

            if (promptText !== '') {
                const promptSpan = `<span class="text-blue-600">${escapeHtml(promptText)}</span>`;
                const inputSpan = `<span>${escapeHtml(command)}</span>`;
                div.innerHTML = promptSpan + inputSpan;
            } else {
                div.innerHTML = `<span>${escapeHtml(command)}</span>`;
            }

            const outputContainer = document.querySelector(`#console-output`);
            if (outputContainer) {
                outputContainer.appendChild(div);
                outputContainer.scrollTop = outputContainer.scrollHeight;
            }

            ipcRenderer.send('session-input', currentConsole.id, command, true);

            currentConsole.waitingForInput = false;
            currentConsole.inputPromptText = '';

            if (consolePrompt) {
                consolePrompt.style.display = '';
                consolePrompt.innerText = currentConsole.promptText || '>>>';
            }

            consoleInput.innerHTML = '';
            currentConsole.inputDraft = '';
            ipcRenderer.send('session-input-draft', currentConsole.id, '');
        } else {
            ipcRenderer.send('session-input', currentConsole.id, command, false);
            if (consolePrompt) consolePrompt.style.display = 'none';

            consoleInput.innerHTML = '';
            currentConsole.inputDraft = '';
            ipcRenderer.send('session-input-draft', currentConsole.id, '');
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    } else if (e.key === 'ArrowUp') {
        if (currentConsole && currentConsole.historyIndex > 0) {
            currentConsole.historyIndex--;
            const newText = currentConsole.commandHistory[currentConsole.historyIndex] || '';
            consoleInput.innerHTML = newText ? hljs.highlight(newText, { language: 'python' }).value : '';
            setSelectionOffsets(consoleInput, newText.length, newText.length);
        }
    } else if (e.key === 'ArrowDown') {
        if (currentConsole) {
            if (currentConsole.historyIndex < currentConsole.commandHistory.length - 1) {
                currentConsole.historyIndex++;
                const newText = currentConsole.commandHistory[currentConsole.historyIndex] || '';
                consoleInput.innerHTML = newText ? hljs.highlight(newText, { language: 'python' }).value : '';
                setSelectionOffsets(consoleInput, newText.length, newText.length);
            } else {
                currentConsole.historyIndex = currentConsole.commandHistory.length;
                consoleInput.innerHTML = '';
            }
        }
    }
    else if (e.key === 'Tab') {
        e.preventDefault();
        const newVal = val.substring(0, start) + "    " + val.substring(end);
        consoleInput.innerText = newVal;
        consoleInput.innerHTML = hljs.highlight(newVal, { language: 'python' }).value || '<br>';
        setSelectionOffsets(consoleInput, start + 4, start + 4);
    } else if (e.key === 'Backspace') {
        if (start === end && start >= 4 && val.substring(start - 4, start) === '    ') {
            e.preventDefault();
            const newVal = val.substring(0, start - 4) + val.substring(start);
            consoleInput.innerText = newVal;
            consoleInput.innerHTML = hljs.highlight(newVal, { language: 'python' }).value || '<br>';
            setSelectionOffsets(consoleInput, start - 4, start - 4);
        }
    } else if (e.key === 'ArrowLeft') {
        if (start === end && start >= 4 && val.substring(start - 4, start) === '    ') {
            e.preventDefault();
            setSelectionOffsets(consoleInput, start - 4, start - 4);
        }
    } else if (e.key === 'ArrowRight') {
        if (start === end && start + 4 <= val.length && val.substring(start, start + 4) === '    ') {
            e.preventDefault();
            setSelectionOffsets(consoleInput, start + 4, start + 4);
        }
    }
});

consoleInput.addEventListener('input', () => {
    if (activeConsoleId) {
        const currentConsole = consoles.find(c => c.id === activeConsoleId);
        if (currentConsole) {
            const { start, end } = getSelectionOffsets(consoleInput);
            const text = consoleInput.textContent || '';
            currentConsole.inputDraft = text;
            ipcRenderer.send('session-input-draft', currentConsole.id, text);

            // Highlight
            if (text === '') {
                consoleInput.innerHTML = '';
            } else {
                consoleInput.innerHTML = hljs.highlight(text, { language: 'python' }).value;
            }
            setSelectionOffsets(consoleInput, start, end);
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
            if (!consoleInput.innerText) {
                const indent = '    '.repeat(consoleData.indentLevel);
                consoleInput.innerText = indent;
                consoleInput.innerHTML = hljs.highlight(indent, { language: 'python' }).value || '<br>';
                setSelectionOffsets(consoleInput, indent.length, indent.length);
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
        consoleInput.innerText = '';
    }
});

// Tab handling now consolidated in the main consoleInput keydown listener above

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
        document.body.style.cursor = direction === 'h' ? 'col-resize' : 'row-resize';

        startPos = direction === 'h' ? e.clientX : e.clientY;
        startSize = direction === 'h' ? sidebar.offsetWidth : sidebar.offsetHeight;

        const onMouseMove = (e) => {
            const currentPos = direction === 'h' ? e.clientX : e.clientY;
            let delta = currentPos - startPos;
            if (inverse) delta = -delta;

            const newSize = startSize + delta;

            // Min/Max constraints
            const minSize = 50;
            if (newSize < minSize) return;

            if (direction === 'h') {
                sidebar.style.width = `${newSize}px`;
            } else {
                sidebar.style.height = `${newSize}px`;
            }
        };

        const onMouseUp = () => {
            resizer.classList.remove('dragging');
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
